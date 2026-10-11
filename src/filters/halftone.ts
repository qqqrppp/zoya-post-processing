import { Filter } from './filter';
import halftoneWGSL from './shaders/halftone.wgsl?raw';

export enum Variant {
    cmyk = 0,
    average = 1,
}

export type HalftoneSettings = {
    name: string,
    dotSize: number,     // 2 .. 32 px
    angle: number,       // 0 .. 90 градусов
    smoothness: number,  // 0.0 .. 1.0
    monochrome: boolean,
    invert: boolean,
    variant: Variant,
    merge?: number,      // 0.0 .. 1.0 - мягкое слияние краёв соседних точек
    radiusK?: number,    // 0.3 .. 0.95 - максимальный радиус точки в долях dotSize
}

const CELLS_LAYERS = 3;
const CELLS_WORKGROUP = 8;
const DRAW_WORKGROUP = 16;

const ANGLE_R = 0.2618; // +15° (должно совпадать с шейдером)
const ANGLE_G = 1.3090; // +75°

/**
 * Двухпроходный halftone:
 *  1) computeCells - средний цвет каждой ячейки растра -> текстура-массив (слой на каждый угол сетки);
 *  2) main         - рисование кругов, учитывающих 4 ближайшие ячейки (круги не обрезаются краем ячейки).
 */
export class Halftone extends Filter<HalftoneSettings> {
    private paramsBuffer!: GPUBuffer;

    private cellsPipeline!: GPUComputePipeline;
    private drawPipeline!: GPUComputePipeline;
    private cellsParamsBindGroup!: GPUBindGroup;
    private drawParamsBindGroup!: GPUBindGroup;

    private cellsTexture?: GPUTexture;
    private cellsBindGroup?: GPUBindGroup;
    private drawBindGroup?: GPUBindGroup;

    /** Размер сетки ячеек (в ячейках) для заданного угла - зеркало gridInfo() из шейдера. */
    private gridSize(angle: number, dotSize: number): [number, number] {
        const w = this.imageBitmap.width;
        const h = this.imageBitmap.height;
        const c = Math.cos(angle);
        const s = Math.sin(angle);

        const xs = [0, w * c, -h * s, w * c - h * s];
        const ys = [0, w * s, h * c, w * s + h * c];

        const loX = Math.floor(Math.min(...xs) / dotSize) - 1;
        const hiX = Math.floor(Math.max(...xs) / dotSize) + 1;
        const loY = Math.floor(Math.min(...ys) / dotSize) - 1;
        const hiY = Math.floor(Math.max(...ys) / dotSize) + 1;

        // +1 - запас на расхождения округления f32 (шейдер) и f64 (JS)
        return [hiX - loX + 2, hiY - loY + 2];
    }

    private layerAngles(settings: HalftoneSettings): number[] {
        const base = (settings.angle * Math.PI) / 180;
        const useSingleGrid = settings.variant === Variant.average || settings.monochrome;
        return useSingleGrid ? [base] : [base, base + ANGLE_R, base + ANGLE_G];
    }

    private createBindGroups() {
        const cellsArrayView = this.cellsTexture!.createView({ dimension: '2d-array' });

        this.cellsBindGroup = this.device.createBindGroup({
            layout: this.cellsPipeline.getBindGroupLayout(1),
            entries: [
                { binding: 0, resource: this.outputTexture.createView() },
                { binding: 2, resource: cellsArrayView },
            ],
        });

        this.drawBindGroup = this.device.createBindGroup({
            layout: this.drawPipeline.getBindGroupLayout(1),
            entries: [
                { binding: 1, resource: this.outputTexture.createView() },
                { binding: 3, resource: cellsArrayView },
            ],
        });
    }

    /** Гарантирует, что текстура ячеек вмещает сетку width x height (растёт, но не уменьшается). */
    private ensureCellsTexture(width: number, height: number) {
        const max = this.device.limits.maxTextureDimension2D;
        width = Math.min(width, max);
        height = Math.min(height, max);

        if (
            this.cellsTexture &&
            this.cellsTexture.width >= width &&
            this.cellsTexture.height >= height
        ) {
            return;
        }

        const newWidth = Math.max(width, this.cellsTexture?.width ?? 1);
        const newHeight = Math.max(height, this.cellsTexture?.height ?? 1);

        this.cellsTexture?.destroy();
        this.cellsTexture = this.device.createTexture({
            label: 'Halftone cells',
            size: [newWidth, newHeight, CELLS_LAYERS],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
        });
        this.createBindGroups();
    }

    private updateBuffers(settings: HalftoneSettings) {
        const angleRad = (settings.angle * Math.PI) / 180;

        const params = new Float32Array([
            settings.dotSize,
            angleRad,
            settings.smoothness,
            settings.monochrome ? 1.0 : 0.0,
            settings.invert ? 1.0 : 0.0,
            settings.variant ?? 0,
            settings.radiusK ?? 0.75,
            settings.merge ?? 0,
        ]);

        this.device.queue.writeBuffer(this.paramsBuffer, 0, params);
    }

    init() {
        const module = this.device.createShaderModule({ code: halftoneWGSL });

        this.cellsPipeline = this.device.createComputePipeline({
            label: 'Halftone cells pipeline',
            layout: 'auto',
            compute: { module, entryPoint: 'computeCells' },
        });

        this.drawPipeline = this.device.createComputePipeline({
            label: 'Halftone draw pipeline',
            layout: 'auto',
            compute: { module, entryPoint: 'main' },
        });

        this.paramsBuffer = this.device.createBuffer({
            size: 32, // 8 floats * 4 bytes
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        });

        this.cellsParamsBindGroup = this.device.createBindGroup({
            layout: this.cellsPipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: this.paramsBuffer } }],
        });
        this.drawParamsBindGroup = this.device.createBindGroup({
            layout: this.drawPipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: this.paramsBuffer } }],
        });

        const width = this.imageBitmap.width;
        const height = this.imageBitmap.height;

        return (commandEncoder: GPUCommandEncoder, settings: HalftoneSettings) => {
            if (settings.dotSize <= 0) {
                return;
            }

            this.updateBuffers(settings);

            const dotSize = Math.max(2, settings.dotSize);
            const angles = this.layerAngles(settings);

            // Общий размер текстуры ячеек - максимум по используемым слоям
            let cellsW = 0;
            let cellsH = 0;
            for (const a of angles) {
                const [gw, gh] = this.gridSize(a, dotSize);
                cellsW = Math.max(cellsW, gw);
                cellsH = Math.max(cellsH, gh);
            }
            this.ensureCellsTexture(cellsW, cellsH);

            // Проход 1: средний цвет каждой ячейки
            const cellsPass = commandEncoder.beginComputePass({ label: 'Halftone cells pass' });
            cellsPass.setPipeline(this.cellsPipeline);
            cellsPass.setBindGroup(0, this.cellsParamsBindGroup);
            cellsPass.setBindGroup(1, this.cellsBindGroup!);
            cellsPass.dispatchWorkgroups(
                Math.ceil(cellsW / CELLS_WORKGROUP),
                Math.ceil(cellsH / CELLS_WORKGROUP),
                angles.length,
            );
            cellsPass.end();

            // Проход 2: рисование кругов прямо в outputTexture
            const drawPass = commandEncoder.beginComputePass({ label: 'Halftone draw pass' });
            drawPass.setPipeline(this.drawPipeline);
            drawPass.setBindGroup(0, this.drawParamsBindGroup);
            drawPass.setBindGroup(1, this.drawBindGroup!);
            drawPass.dispatchWorkgroups(
                Math.ceil(width / DRAW_WORKGROUP),
                Math.ceil(height / DRAW_WORKGROUP),
                1,
            );
            drawPass.end();
        };
    }
}

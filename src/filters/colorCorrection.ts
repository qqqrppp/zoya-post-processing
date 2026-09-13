import { BaseComputeFilter } from './baseComputeFilter';
import colorCorrectionWGSL from './shaders/colorCorrection.wgsl?raw';

export type ColorCorrectionSettings = {
    name: string,
    color: [number, number, number], // from -100 - 100  
    reduction: [number, number, number], // from 0.0 to 1.0  
}

export class ColorCorrection extends BaseComputeFilter<ColorCorrectionSettings> {
    private colorBuffer!: GPUBuffer;
    private coeffsBuffer!: GPUBuffer;

    protected get wgslCode() {
        return colorCorrectionWGSL;
    }

    protected createResources() {
        this.colorBuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        });

        this.coeffsBuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        });

        this.constantsBindGroup = this.createConstantsBindGroup([
            {
                binding: 0,
                resource: {
                    buffer: this.colorBuffer,
                }
            },
            {
                binding: 1,
                resource: {
                    buffer: this.coeffsBuffer,
                }
            },
        ]);
    }

    protected updateBuffers(settings: ColorCorrectionSettings) {
        this.device.queue.writeBuffer(
            this.colorBuffer,
            0,
            new Float32Array(settings.color.map(x => x / 100))
        );

        this.device.queue.writeBuffer(
            this.coeffsBuffer,
            0,
            new Float32Array(settings.reduction)
        );
    }
}

export class Contrast extends ColorCorrection {}

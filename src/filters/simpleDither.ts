import { BaseComputeFilter } from './baseComputeFilter';
import simpleDitherWGSL from './shaders/simpleDither.wgsl?raw';

export enum Variant {
    bayer4x4 = 0,
    bayer8x8 = 1,
    bayer16x16 = 2,
    noise = 3,
    halftone = 4,
}

export type SimpleDitherSettings = {
    name: string,
    variant: Variant,
    isLinkedLevel: boolean,
    levels: [number, number, number],
    equalizing: number,
    scale: number, // 1..16
    monochrome: boolean,
}

export class SimpleDither extends BaseComputeFilter<SimpleDitherSettings> {
    private paramsBuffer!: GPUBuffer;

    protected get wgslCode() {
        return simpleDitherWGSL;
    }

    protected createResources() {
        this.paramsBuffer = this.device.createBuffer({
            size: 28, // 7 floats * 4 bytes = 28 bytes
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        });

        this.constantsBindGroup = this.createConstantsBindGroup([
            {
                binding: 0,
                resource: {
                    buffer: this.paramsBuffer,
                }
            },
        ]);
    }

    protected updateBuffers(settings: SimpleDitherSettings) {
        const levels = settings.isLinkedLevel ? [
            settings.levels[0],
            settings.levels[0],
            settings.levels[0],
        ] : settings.levels;

        this.device.queue.writeBuffer(
            this.paramsBuffer,
            0,
            new Float32Array([
                settings.variant,
                levels[0],
                levels[1],
                levels[2],
                settings.equalizing,
                settings.scale,
                settings.monochrome ? 1.0 : 0.0,
            ])
        );
    }

    protected shouldSkip(settings: SimpleDitherSettings): boolean {
        return false;
    }
}

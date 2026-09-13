import { BaseComputeFilter } from './baseComputeFilter';
import brushWGSL from './shaders/brush.wgsl?raw';

export enum Variant {
    classic = 0,
    generalized = 1,
    anisotropic = 2,
}

export type BrushSettings = {
    name: string,
    radius: number, // 0..10
    variant: Variant,
    hardness: number, // 2..16 (default 8)
    stretching: number, // 0..2 (default 1)
    opacity: number, // 0..1 (default 1)
}

export class Brush extends BaseComputeFilter<BrushSettings> {
    private paramsBuffer!: GPUBuffer;

    protected get wgslCode() {
        return brushWGSL;
    }

    protected createResources() {
        this.paramsBuffer = this.device.createBuffer({
            size: 20, // 5 floats * 4 bytes = 20 bytes
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
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

    protected updateBuffers(settings: BrushSettings) {
        this.device.queue.writeBuffer(
            this.paramsBuffer,
            0,
            new Float32Array([
                settings.radius,
                settings.variant,
                settings.hardness,
                settings.stretching,
                settings.opacity,
            ])
        );
    }

    protected shouldSkip(settings: BrushSettings): boolean {
        return settings.radius === 0 || settings.opacity === 0;
    }
}

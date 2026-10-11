import { BaseComputeFilter } from './baseComputeFilter';
import posterizationWGSL from './shaders/posterization.wgsl?raw';

export enum Variant {
    standard = 0,
    hsv = 1,
    oklab = 2,
    adaptive = 3,
}



export type PosterizationSettings = {
    name: string,
    variant: Variant,
    isLinkedLevel: boolean,
    levels: [number, number, number],
    detailThreshold: number, // для adaptive режима
}

export class Posterization extends BaseComputeFilter<PosterizationSettings> {
    private paramsBuffer!: GPUBuffer;

    protected get wgslCode() {
        return posterizationWGSL;
    }

    protected createResources() {
        this.paramsBuffer = this.device.createBuffer({
            size: 20, // 5 floats * 4 = 20 bytes (variant + 3 levels + detailThreshold)
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

    protected updateBuffers(settings: PosterizationSettings) {
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
                settings.detailThreshold,
            ])
        );
    }

    protected shouldSkip(settings: PosterizationSettings): boolean {
        return settings.levels[0] === 0;
    }
}

import { BaseComputeFilter } from './baseComputeFilter';
import pixelateWGSL from './shaders/pixelate.wgsl?raw';

export enum Variant {
    standard = 0,
    average = 1,
    grid = 2,
    dot = 3,
}

export type PixelateSettings = {
    name: string,
    pixelSize: number, // 1,2,3..16..32
    variant: Variant,
}

export class Pixelate extends BaseComputeFilter<PixelateSettings> {
    private paramsBuffer!: GPUBuffer;

    protected get wgslCode() {
        return pixelateWGSL;
    }

    protected createResources() {
        this.paramsBuffer = this.device.createBuffer({
            size: 8,
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

    protected updateBuffers(settings: PixelateSettings) {
        this.device.queue.writeBuffer(
            this.paramsBuffer,
            0,
            new Int32Array([settings.pixelSize, settings.variant])
        );
    }

    protected shouldSkip(settings: PixelateSettings): boolean {
        return settings.pixelSize === 0;
    }
}

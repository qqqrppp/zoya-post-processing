import { isEqualArray } from '~/helpers';
import { BaseComputeFilter } from './baseComputeFilter';
import inverseWGSL from './shaders/inverse.wgsl?raw';

export type InverseSettings = {
    name: string,
    isLinkedCoefficient: boolean,
    coefficient: [number, number, number], // от 0.0 до 1.0  
}

export class Inverse extends BaseComputeFilter<InverseSettings> {
    private buffer!: GPUBuffer;

    protected get wgslCode() {
        return inverseWGSL;
    }

    protected createResources() {
        this.buffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.constantsBindGroup = this.createConstantsBindGroup([
            {
                binding: 0,
                resource: {
                    buffer: this.buffer,
                }
            },
        ]);
    }

    protected updateBuffers(settings: InverseSettings) {
        const coefficient = settings.isLinkedCoefficient ? [
            settings.coefficient[0],
            settings.coefficient[0],
            settings.coefficient[0],
        ] : settings.coefficient;

        this.device.queue.writeBuffer(
            this.buffer,
            0,
            new Float32Array(coefficient.map(x => x / 100))
        );
    }

    protected shouldSkip(settings: InverseSettings): boolean {
        return isEqualArray(settings.coefficient, [100, 100, 100]);
    }
}

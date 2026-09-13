import { BaseComputeFilter } from './baseComputeFilter';
import saturationWGSL from './shaders/saturation.wgsl?raw';

export enum Variant {
    lightness,
    average,
    luminosity,
}

export enum SaturationColorFactor {
    R = 21,
    G = 72,
    B = 7,
}

export type SaturationSettings = {
    name: string,
    variant: Variant, // 1 - lightness, 2 - average, 3 - luminosity
    isLinkedCoefficient: boolean,
    coefficient: [number, number, number], // from 0.0 to 1.0  
    colorFactor: [number, number, number], // from 0.0 to 1.0  
}

export class Saturation extends BaseComputeFilter<SaturationSettings> {
    private variantBuffer!: GPUBuffer;
    private factorBuffer!: GPUBuffer;
    private coeffsBuffer!: GPUBuffer;

    protected get wgslCode() {
        return saturationWGSL;
    }

    protected createResources() {
        this.variantBuffer = this.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        });

        this.factorBuffer = this.device.createBuffer({
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
                    buffer: this.variantBuffer,
                }
            },
            {
                binding: 1,
                resource: {
                    buffer: this.factorBuffer,
                }
            },
            {
                binding: 2,
                resource: {
                    buffer: this.coeffsBuffer,
                }
            },
        ]);
    }

    protected updateBuffers(settings: SaturationSettings) {
        this.device.queue.writeBuffer(
            this.variantBuffer,
            0,
            new Uint32Array([settings.variant])
        );

        this.device.queue.writeBuffer(
            this.factorBuffer,
            0,
            new Float32Array(settings.colorFactor.map(x => x / 100))
        );

        const coefficient = settings.isLinkedCoefficient ? [
            settings.coefficient[0], 
            settings.coefficient[0], 
            settings.coefficient[0]
        ] : settings.coefficient;

        this.device.queue.writeBuffer(
            this.coeffsBuffer,
            0,
            new Float32Array(coefficient)
        );
    }
}

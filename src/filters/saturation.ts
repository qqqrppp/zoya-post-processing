import { Filter } from './filter'
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

export class Saturation extends Filter<SaturationSettings> {
    init() {
        const pipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                    code: saturationWGSL,
                }),
                // entryPoint: "main"
            },
        });

        let variantBuffer = this.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        });

        let factorBuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        });

        let coeffsBuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        });

        const computeConstants = this.device.createBindGroup({
            label: "Saturation buffer group",
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: variantBuffer,
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: factorBuffer,
                    }
                },
                {
                    binding: 2,
                    resource: {
                        buffer: coeffsBuffer,
                    }
                },
            ],
        });

        const intermediateTexture = this.device.createTexture({
            size: [this.imageBitmap.width, this.imageBitmap.height],
            format: 'rgba8unorm',
            usage:        
                GPUTextureUsage.COPY_SRC
                | GPUTextureUsage.STORAGE_BINDING
                | GPUTextureUsage.TEXTURE_BINDING
        });

        const computeBindGroup = this.device.createBindGroup({
            label: "Saturation compute group",
            layout: pipeline.getBindGroupLayout(1),
            entries: [
                {
                    binding: 0,
                    resource: this.outputTexture.createView(),
                },
                {
                    binding: 1,
                    resource: intermediateTexture.createView(),
                },
            ],
        });

        // preparing computing frame
        const update = (settings: SaturationSettings) => {
            this.device.queue.writeBuffer(
                variantBuffer,
                0,
                new Uint32Array([settings.variant])
            );

            this.device.queue.writeBuffer(
                factorBuffer,
                0,
                new Float32Array(settings.colorFactor.map(x => x / 100))
            );

            const coefficient = settings.isLinkedCoefficient ? [
                settings.coefficient[0], 
                settings.coefficient[0], 
                settings.coefficient[0]
            ] : settings.coefficient

            this.device.queue.writeBuffer(
                coeffsBuffer,
                0,
                new Float32Array(coefficient)
            );           
        }

        const [w, h] = this.computeWorkGroupCount([this.imageBitmap.width, this.imageBitmap.height], [16, 16])

        const compute = (commandEncoder: GPUCommandEncoder, settings: SaturationSettings) => {
            update(settings)

            const computePass = commandEncoder.beginComputePass({
                label: "Saturationscale pass"
            });
            computePass.setPipeline(pipeline);
            computePass.setBindGroup(0, computeConstants);

            computePass.setBindGroup(1, computeBindGroup);

            computePass.dispatchWorkgroups(
                Math.ceil(w),
                Math.ceil(h),
                1
            );

            computePass.end();

            commandEncoder.copyTextureToTexture(
                { texture: intermediateTexture },
                { texture: this.outputTexture },
                [this.imageBitmap.width, this.imageBitmap.height]
            );
        }

        return compute

    }
}
import { isEqualArray } from '~/helpers';
import { Filter } from './filter'
// import inverseWGSL from './shaders/inverse.wgsl?raw';
import inverseWGSL from './shaders/dither.wgsl?raw';

export type InverseSettings = {
    name: string,
    isLinkedCoefficient: boolean,
    coefficient: [number, number, number], // from 0.0 to 1.0  
}

export class Inverse extends Filter<InverseSettings> {
    init() {
        const pipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                    code: inverseWGSL,
                }),
                // entryPoint: "main"
            },
        });

        const buffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const computeConstants = this.device.createBindGroup({
            label: "inverse buffer group",
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer,
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
            label: "inverse compute group",
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

        const update = (settings: InverseSettings) => {
            const coefficient = settings.isLinkedCoefficient ? [
                settings.coefficient[0],
                settings.coefficient[0],
                settings.coefficient[0],
            ] : settings.coefficient

            this.device.queue.writeBuffer(
                buffer,
                0,
                new Float32Array(coefficient.map(x => x / 100))
            );
        }

        const [w, h] = this.computeWorkGroupCount([this.imageBitmap.width, this.imageBitmap.height], [16, 16])

        const compute = (commandEncoder: GPUCommandEncoder, settings: InverseSettings) => {
            // console.log(settings)
            // if (isEqualArray(settings.coefficient, [100,100,100])) return;


            update(settings);

            const computePass = commandEncoder.beginComputePass({
                label: 'inverse pass'
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
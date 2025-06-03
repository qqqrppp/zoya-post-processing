import { isEqualArray } from '~/helpers';
import { Filter } from './filter'
import posterizationWGSL from './shaders/posterization.wgsl?raw';

export enum Variant {
   disable = 0,
   grid4x4 = 1,
   grid8x8 = 2,
   grid16x16 = 3,
}

export type PosterizationSettings = {
    name: string,
    variant: Variant,
    isLinkedLevel: boolean,
    levels: [number, number, number],
}


export class Posterization extends Filter<PosterizationSettings> {
    init() {
        const pipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                    code: posterizationWGSL,
                }),
                // entryPoint: "main"
            },
        });

        let variantBuffer = this.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        });

        let levelBuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        });

        const computeConstants = this.device.createBindGroup({
            label: "posterization buffer group",
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
                        buffer: levelBuffer,
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
            label: "posterization compute group",
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

        const update = (settings: PosterizationSettings) => {
            this.device.queue.writeBuffer(
                variantBuffer,
                0,
                new Uint32Array([settings.variant])
            );

            const levels = settings.isLinkedLevel ? [
                settings.levels[0],
                settings.levels[0],
                settings.levels[0],
            ] : settings.levels

            this.device.queue.writeBuffer(
                levelBuffer,
                0,
                new Float32Array(levels)
            );
        }


        const [w, h] = this.computeWorkGroupCount([this.imageBitmap.width, this.imageBitmap.height], [16, 16])

        const compute = (commandEncoder: GPUCommandEncoder, settings: PosterizationSettings) => {
            if (!settings.levels[0]) return;

            update(settings);

            const computePass = commandEncoder.beginComputePass({
                label: "dither pass"
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
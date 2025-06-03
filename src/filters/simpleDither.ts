import { isEqualArray } from '~/helpers';
import { Filter } from './filter'
import simpleDitherWGSL from './shaders/simpleDither.wgsl?raw';

export enum Variant {
    disable = 0,
    grid4x4 = 1,
    grid8x8 = 2,
    grid16x16 = 3,
}

export type SimpleDitherSettings = {
    name: string,
    variant: Variant,
    isLinkedLevel: boolean,
    levels: [number, number, number],
    equalizing: number,
}


export class SimpleDither extends Filter<SimpleDitherSettings> {
    init() {
        const pipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                    code: simpleDitherWGSL,
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

        let equalizingBuffer = this.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        });

        const computeConstants = this.device.createBindGroup({
            label: "simple dither buffer group",
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
                {
                    binding: 2,
                    resource: {
                        buffer: equalizingBuffer,
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
            label: "simple dither compute group",
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

        const update = (settings: SimpleDitherSettings) => {
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

            this.device.queue.writeBuffer(
                equalizingBuffer,
                0,
                new Float32Array([settings.equalizing])
            );
        }


        const [w, h] = this.computeWorkGroupCount([this.imageBitmap.width, this.imageBitmap.height], [16, 16])

        const compute = (commandEncoder: GPUCommandEncoder, settings: SimpleDitherSettings) => {
            if (!settings.variant) return;

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
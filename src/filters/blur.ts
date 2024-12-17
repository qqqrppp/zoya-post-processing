import { Filter } from './filter'
import blurWGSL from './shaders/blur.wgsl?raw';

export type BlurSettings = {
    filterSize: number,
    iterations: number,
}

export class Blur extends Filter<BlurSettings> {
    init() {
        // prepare piplines and buffers
        const blurPipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                    code: blurWGSL,
                }),
                entryPoint: "main"
            },
        });

        const offsetTexture = this.device.createTexture({
            size: {
                width: this.imageBitmap.width,
                height: this.imageBitmap.height,
            },
            format: 'rgba8unorm',
            usage:
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING,
        });


        // A buffer with 0 in it. Binding this buffer is used to set `flip` to 0
        const buffer0 = (() => {
            const buffer = this.device.createBuffer({
                size: 4,
                mappedAtCreation: true,
                usage: GPUBufferUsage.UNIFORM,
            });
            new Uint32Array(buffer.getMappedRange())[0] = 0;
            buffer.unmap();
            return buffer;
        })();

        // A buffer with 1 in it. Binding this buffer is used to set `flip` to 1
        const buffer1 = (() => {
            const buffer = this.device.createBuffer({
                size: 4,
                mappedAtCreation: true,
                usage: GPUBufferUsage.UNIFORM,
            });
            new Uint32Array(buffer.getMappedRange())[0] = 1;
            buffer.unmap();
            return buffer;
        })();

        const blurParamsBuffer = this.device.createBuffer({
            size: 8,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        });

        const computeConstants = this.device.createBindGroup({
            layout: blurPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: this.sampler,
                },
                {
                    binding: 1,
                    resource: {
                        buffer: blurParamsBuffer,
                    },
                },
            ],
        });

        const computeBindGroup0 = this.device.createBindGroup({
            layout: blurPipeline.getBindGroupLayout(1),
            entries: [
                {
                    binding: 1,
                    resource: this.outputTexture.createView(),
                },
                {
                    binding: 2,
                    resource: offsetTexture.createView(),
                },
                {
                    binding: 3,
                    resource: {
                        buffer: buffer0,
                    },
                },
            ],
        });

        const computeBindGroup1 = this.device.createBindGroup({
            layout: blurPipeline.getBindGroupLayout(1),
            entries: [
                {
                    binding: 1,
                    resource: offsetTexture.createView(),
                },
                {
                    binding: 2,
                    resource: this.outputTexture.createView(),
                },
                {
                    binding: 3,
                    resource: {
                        buffer: buffer1,
                    },
                },
            ],
        });

        const computeBindGroup2 = this.device.createBindGroup({
            layout: blurPipeline.getBindGroupLayout(1),
            entries: [
                {
                    binding: 1,
                    resource: this.outputTexture.createView(),
                },
                {
                    binding: 2,
                    resource: offsetTexture.createView(),
                },
                {
                    binding: 3,
                    resource: {
                        buffer: buffer0,
                    },
                },
            ],
        });

        // preparing computing frame
        const batch = 4;
        const tileDimension = 128;
        let blockDimension: number;

        const update = (settings: BlurSettings) => {
            blockDimension = tileDimension - settings.filterSize;
            this.device.queue.writeBuffer(
                blurParamsBuffer,
                0,
                new Uint32Array([settings.filterSize, blockDimension])
            );
        }

        const compute = (commandEncoder: GPUCommandEncoder, settings: BlurSettings) => {
            if (settings.filterSize == 0) return;
            
            update(settings);

            const computePass = commandEncoder.beginComputePass();
            computePass.setPipeline(blurPipeline);
            computePass.setBindGroup(0, computeConstants);

            computePass.setBindGroup(1, computeBindGroup0);
            computePass.dispatchWorkgroups(
                Math.ceil(this.imageBitmap.width / blockDimension),
                Math.ceil(this.imageBitmap.height / batch)
            );

            computePass.setBindGroup(1, computeBindGroup1);
            computePass.dispatchWorkgroups(
                Math.ceil(this.imageBitmap.height / blockDimension),
                Math.ceil(this.imageBitmap.width / batch)
            );

            for (let i = 0; i <= settings.iterations; i++) {
                // iteration blur
                computePass.setBindGroup(1, computeBindGroup2);
                computePass.dispatchWorkgroups(
                    Math.ceil(this.imageBitmap.width / blockDimension),
                    Math.ceil(this.imageBitmap.height / batch)
                );

                computePass.setBindGroup(1, computeBindGroup1);
                computePass.dispatchWorkgroups(
                    Math.ceil(this.imageBitmap.height / blockDimension),
                    Math.ceil(this.imageBitmap.width / batch)
                );
            }

            computePass.end();
        }

        return compute
    }
}


import { Filter } from './filter'
import pixelateWGSL from './shaders/pixelate.wgsl?raw';


export type PixelateSettings = {
    pixelSize: number, // 1,2,3..16..32 to resolution
}

export class Pixelate extends Filter<PixelateSettings> {
    init() {
        const pipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                    code: pixelateWGSL,
                }),
                // entryPoint: "main"
            },
        });

        const pixelSizeBuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const computeConstants = this.device.createBindGroup({
            label: "pixelate buffer group",
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: pixelSizeBuffer,
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
            label: "gray compute group",
            layout: pipeline.getBindGroupLayout(1),
            entries: [
                {
                    binding: 0,
                    resource: this.outputTexute.createView(),
                },
                {
                    binding: 1,
                    resource: intermediateTexture.createView(),
                },
            ],
        });

        const update = (settings: PixelateSettings) => {
            this.device.queue.writeBuffer(
                pixelSizeBuffer,
                0,
                new Int32Array([settings.pixelSize])
            );
        }

        const [w, h] = this.computeWorkGroupCount([this.imageBitmap.width, this.imageBitmap.height], [16, 16])

        const compute = (commandEncoder: GPUCommandEncoder, settings: PixelateSettings) => {
            if (settings.pixelSize == 0) {
                return;
            }
            update(settings);

            const computePass = commandEncoder.beginComputePass({
                label: "pixelate pass"
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
                { texture: this.outputTexute },
                [this.imageBitmap.width, this.imageBitmap.height]
            );
        }

        return compute
    }
}
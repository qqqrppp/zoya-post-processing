import { Filter } from './filter'
import colorCorrectionWGSL from './shaders/colorCorrection.wgsl?raw';

export type ColorCorrectionSettings = {
    color: [number, number, number], // from -100 - 100  
    reduction: [number, number, number], // from 0.0 to 1.0  
}

export class ColorCorrection extends Filter<ColorCorrectionSettings> {
    init() {
        const grayPipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                    code: colorCorrectionWGSL,
                }),
                // entryPoint: "main"
            },
        });

        let colorBuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        });

        let coeffsBuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        });

        const computeConstants = this.device.createBindGroup({
            label: "color correction buffer group",
            layout: grayPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: colorBuffer,
                    }
                },
                {
                    binding: 1,
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
            label: "color correction compute group",
            layout: grayPipeline.getBindGroupLayout(1),
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

        // preparing computing frame
        const update = (settings: ColorCorrectionSettings) => {
            this.device.queue.writeBuffer(
                colorBuffer,
                0,
                new Float32Array(settings.color.map(x => x / 100))
            );

            this.device.queue.writeBuffer(
                coeffsBuffer,
                0,
                new Float32Array(settings.reduction)
            );           
        }

        const [w, h] = this.computeWorkGroupCount([this.imageBitmap.width, this.imageBitmap.height], [16, 16])

        const compute = (commandEncoder: GPUCommandEncoder, settings: ColorCorrectionSettings) => {
            update(settings)

            const computePass = commandEncoder.beginComputePass({
                label: "color correction pass"
            });
            computePass.setPipeline(grayPipeline);
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

export class Contrast extends ColorCorrection {};
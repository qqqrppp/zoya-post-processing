import fullscreenTexturedQuadWGSL from './shaders/fullscreenTexturedQuad.wgsl?raw';

import { Blur, type BlurSettings } from './blur'
import { Saturation, type SaturationSettings, SaturationColorFactor } from './saturation'
import { Pixelate, type PixelateSettings } from './pixelate'
import { Inverse, type InverseSettings } from './inverse'
import { Contrast, ColorCorrection, type ColorCorrectionSettings } from './colorCorrection'
import { Matrix } from './matrix';
export { type BlurSettings, Blur } 
export { type SaturationSettings, SaturationColorFactor, Saturation }
export { type PixelateSettings, Pixelate }
export { type InverseSettings, Inverse }
export { type ColorCorrectionSettings, ColorCorrection }
export { Contrast, Matrix }

const filters = [
    Blur,
    Saturation,
    Pixelate,
    Inverse,
    ColorCorrection,
    Contrast,
    Matrix,
] as const

type Filters = InstanceType<(typeof filters)[number]>
type FilterName = (typeof filters)[number]['name'] // todo: надеюсь когда нибудь можно будет получить имя класа
type FilterFrame = ReturnType<Filters["init"]>
type FilterSettings = Parameters<FilterFrame>[1]

export class Core {
    context: GPUCanvasContext;
    device: GPUDevice;
    format: GPUTextureFormat;
    imageBitmap: ImageBitmap;
    // this property is defined in initFrame
    commandEncoder!: GPUCommandEncoder;
    sampler: GPUSampler;
    inputTexture: GPUTexture;
    outputTexture: GPUTexture;

    frames: Map<FilterName, FilterFrame> = new Map();
    render: Function;

    constructor(
        context: GPUCanvasContext,
        device: GPUDevice,
        format: GPUTextureFormat,
        imageBitmap: ImageBitmap,
    ) {

        const width = 10;
        const height = 10;
        const _ = [255,   0,   0, 255];  // red
        const y = [255, 255,   0, 255];  // yellow
        const b = [  0,   0, 255, 255];  // blue
        const g = [  0, 255,   0, 255];  // green
        const textureData = new Uint8Array([
          b, _, _, _, _, _, _, _, _, _,
          _, y, y, y, _, _, _, _, _, _,
          _, y, g, _, _, _, g, g, b, _,
          _, y, y, g, _, _, g, g, b, _,
          _, y, g, _, _, _, _, _, _, _,
          _, y, _, _, _, _, g, g, b, _,
          _, _, _, _, _, _, g, g, b, _,
          _, _, _, _, _, _, g, g, b, _,
          _, _, _, _, _, _, g, g, b, _,
          _, _, _, _, _, _, _, _, _, _,
        ].flat());

        this.context = context;
        this.device = device;
        this.format = format;
        this.imageBitmap = imageBitmap
        // this.imageBitmap = { width,  height, };

        this.sampler = this.device.createSampler({
            // magFilter: 'nearest',// 'linear',
            magFilter: 'linear',// 'linear',

            minFilter: 'linear',// 'linear',
        });

        this.inputTexture = device.createTexture({
            size: [this.imageBitmap.width, this.imageBitmap.height],
            format: 'rgba8unorm',
            usage:
                GPUTextureUsage.TEXTURE_BINDING
                | GPUTextureUsage.COPY_DST
                | GPUTextureUsage.RENDER_ATTACHMENT
                | GPUTextureUsage.COPY_SRC

        });

        this.outputTexture = this.device.createTexture({
            size: [this.imageBitmap.width, this.imageBitmap.height],
            format: 'rgba8unorm',
            usage:
                GPUTextureUsage.COPY_DST
                | GPUTextureUsage.STORAGE_BINDING
                | GPUTextureUsage.TEXTURE_BINDING
        });

        // device.queue.writeTexture(
        //     { texture: this.inputTexture },
        //     textureData,
        //     { bytesPerRow: width * 4 },
        //     { width, height },
        // );
        this.device.queue.copyExternalImageToTexture(
            { source: this.imageBitmap },
            { texture: this.inputTexture },
            [this.imageBitmap.width, this.imageBitmap.height]
        );

        this.render = this.prepareRender()

        for (let F of filters) {
            let filter = new F(
                this.context,
                this.device,
                this.format,
                this.imageBitmap,
                this.sampler,
                this.inputTexture,
                this.outputTexture,
            );
            this.frames.set(F.name, filter.init())
        }
    }

    initFrame() {
        this.commandEncoder = this.device.createCommandEncoder();

        this.commandEncoder.copyTextureToTexture(
            { texture: this.inputTexture },
            { texture: this.outputTexture },
            [this.imageBitmap.width, this.imageBitmap.height]
        );
    }


    prepareRender() {
        const fullscreenQuadPipeline = this.device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: this.device.createShaderModule({
                    code: fullscreenTexturedQuadWGSL,
                }),
            },
            fragment: {
                module: this.device.createShaderModule({
                    code: fullscreenTexturedQuadWGSL,
                }),
                targets: [
                    {
                        format: this.format,
                    },
                ],
            },
            primitive: {
                topology: 'triangle-list',
            },
        });

        const showResultBindGroup = this.device.createBindGroup({
            layout: fullscreenQuadPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: this.sampler,
                },
                {
                    binding: 1,
                    resource: this.outputTexture.createView(),
                },
            ],
        });

        return () => {
            const passEncoder = this.commandEncoder.beginRenderPass({
                colorAttachments: [
                    {
                        view: this.context.getCurrentTexture().createView(),
                        clearValue: [128, 0, 0, 0],
                        loadOp: 'clear',
                        storeOp: 'store',
                    },
                ],
            });

            passEncoder.setPipeline(fullscreenQuadPipeline);
            passEncoder.setBindGroup(0, showResultBindGroup);
            passEncoder.draw(6);
            passEncoder.end();
            this.device.queue.submit([this.commandEncoder.finish()]);
        }
    }

    view(settings?: Record<FilterName, FilterSettings>) {
        this.initFrame()

        for (let key in settings) {
            if (this.frames.has(key) && settings[key] != undefined) {
                this.frames.get(key)?.(
                    this.commandEncoder,
                    // @ts-ignore todo: невозможно описать что для FilterName есть свой FilterSettings
                    settings[key]
                );
            } 
        }

        this.render();
    }
}


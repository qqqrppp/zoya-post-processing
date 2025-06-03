import fullscreenTexturedQuadWGSL from './shaders/fullscreenTexturedQuad.wgsl?raw';

import { Blur, type BlurSettings } from './blur'
import { Saturation, type SaturationSettings, SaturationColorFactor } from './saturation'
import { Pixelate, type PixelateSettings } from './pixelate'
import { Inverse, type InverseSettings } from './inverse'
import { Contrast, ColorCorrection, type ColorCorrectionSettings } from './colorCorrection'
import { Matrix } from './matrix';
import { SimpleDither } from './simpleDither';
import { Posterization, type PosterizationSettings } from './posterization';

export { type BlurSettings, Blur }
export { type SaturationSettings, SaturationColorFactor, Saturation }
export { type PixelateSettings, Pixelate }
export { type InverseSettings, Inverse }
export { type ColorCorrectionSettings, ColorCorrection }
export { Contrast, Matrix }
export { type PosterizationSettings }

const filters = [
    Blur,
    Saturation,
    Pixelate,
    Inverse,
    ColorCorrection,
    Contrast,
    Matrix,
    SimpleDither,
    Posterization
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
        viewport,
        clearValue,
    ) {
        this.viewport = viewport
        this.clearValue = clearValue
        this.context = context;
        this.device = device;
        this.format = format;
        this.imageBitmap = imageBitmap

        this.sampler = this.device.createSampler({
            // magFilter: 'nearest',// 'linear',
            magFilter: 'nearest',// 'linear',

            minFilter: 'nearest',// 'linear',
        });

        this.inputTexture = device.createTexture({
            size: [this.imageBitmap.width, this.imageBitmap.height],
            format: 'rgba8unorm',
            usage:
                GPUTextureUsage.TEXTURE_BINDING
                | GPUTextureUsage.RENDER_ATTACHMENT
                | GPUTextureUsage.COPY_DST
                | GPUTextureUsage.COPY_SRC

        });

        this.outputTexture = this.device.createTexture({
            size: [this.imageBitmap.width, this.imageBitmap.height],
            format: 'rgba8unorm',
            usage:
                GPUTextureUsage.COPY_DST
                | GPUTextureUsage.COPY_SRC
                | GPUTextureUsage.STORAGE_BINDING
                | GPUTextureUsage.TEXTURE_BINDING
        });


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
                        clearValue: this.clearValue,
                        loadOp: 'clear',
                        storeOp: 'store',
                    },
                ],
            });

            passEncoder.setViewport(
                this.viewport.x,
                this.viewport.y,
                this.viewport.width,
                this.viewport.height,
                0,
                1
            )
            passEncoder.setPipeline(fullscreenQuadPipeline);
            passEncoder.setBindGroup(0, showResultBindGroup);
            passEncoder.draw(6);
            passEncoder.end();
            this.device.queue.submit([this.commandEncoder.finish()]);
        }
    }

    async upload(): Promise<Uint8Array<ArrayBuffer>> {
        const bufferSize = this.imageBitmap.width * this.imageBitmap.height * 4; // RGBA, 4 байта на пиксель
        const outputBuffer = this.device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });

        // Копируем текстуру в буфер
        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyTextureToBuffer(
            { texture: this.outputTexture },
            {
                buffer: outputBuffer,
                bytesPerRow: this.imageBitmap.width * 4,
                rowsPerImage: this.imageBitmap.height
            },
            { width: this.imageBitmap.width, height: this.imageBitmap.height }
        );

        this.device.queue.submit([commandEncoder.finish()]);

        // Читаем данные из буфера
        await outputBuffer.mapAsync(GPUMapMode.READ);
        const arrayBuffer = new Uint8Array(outputBuffer.getMappedRange());
        const copy = new Uint8Array(arrayBuffer); // Создаем копию данных
        // outputBuffer.unmap(); // как очистить ресы 

        return copy;
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


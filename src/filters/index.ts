import fullscreenTexturedQuadWGSL from './shaders/fullscreenTexturedQuad.wgsl?raw';

import { Blur, type BlurSettings } from './blur'
import { GaussianBlur, type GaussianBlurSettings } from './gaussianBlur'

import { Saturation, type SaturationSettings, SaturationColorFactor } from './saturation'
import { Pixelate, type PixelateSettings, Variant as PixelateVariant } from './pixelate'
import { Inverse, type InverseSettings } from './inverse'
import { Contrast, ColorCorrection, type ColorCorrectionSettings } from './colorCorrection'
import { Matrix } from './matrix';
import { SimpleDither, type SimpleDitherSettings, Variant as DitherVariant } from './simpleDither';
import { Posterization, type PosterizationSettings, Variant as PosterizationVariant, PaletteType as PosterizationPalette } from './posterization';
import { Brush, type BrushSettings, Variant as BrushVariant } from './brush';

export { type BlurSettings, Blur }
export { type GaussianBlurSettings, GaussianBlur }
export { type SaturationSettings, SaturationColorFactor, Saturation }
export { type PixelateSettings, Pixelate, PixelateVariant }
export { type InverseSettings, Inverse }
export { type ColorCorrectionSettings, ColorCorrection }
export { Contrast, Matrix }
export { type PosterizationSettings, Posterization, PosterizationVariant, PosterizationPalette }
export { type SimpleDitherSettings, SimpleDither, DitherVariant }
export { type BrushSettings, Brush, BrushVariant }

const filters = [
    Blur,
    GaussianBlur,
    Saturation,
    Pixelate,
    Inverse,
    ColorCorrection,
    Contrast,
    Matrix,
    SimpleDither,
    Posterization,
    Brush
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

        console.log(this)
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

        const buffer = this.device.createBuffer({
            size: 32, // 7 float (scale + canvasWidth + canvasHeight + imageWidth + imageHeight + offset.x + offset.y) * 4 bytes = 28, округляем до 32 для выравнивания
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const bindGroup = this.device.createBindGroup({
            layout: fullscreenQuadPipeline.getBindGroupLayout(1),
            entries: [{
                binding: 0,
                resource: { buffer }
            }]
        });



        // const update = (scale, offset, aspectRatio) => {
        //      const data = new Float32Array([scale, 0, offset.x, offset.y, aspectRatio, 0, 0, 0]);
        //     this.device.queue.writeBuffer(buffer, 0, uniformData);
        // }

        return (scale = 1, offset = { x: 0, y: 0 }, aspectRatio: any = { u: 1, v: 1 }) => {

            // Передаем: scale, canvasWidth, canvasHeight, imageWidth, imageHeight, [padding], offsetX, offsetY
            // Но в шейдере структура: scale, canvasWidth, canvasHeight, imageWidth, imageHeight, offset(vec2)
            // vec2 требует выравнивания 8 байт (24 байта от начала структуры), поэтому добавляем padding (0) на позиции 5
            const data = new Float32Array([
                scale,
                aspectRatio.canvasWidth,
                aspectRatio.canvasHeight,
                aspectRatio.imageWidth,
                aspectRatio.imageHeight,
                0, // padding для выравнивания offset (vec2f)
                offset.x,
                offset.y
            ]);
            this.device.queue.writeBuffer(buffer, 0, data);

            console.log(scale, offset, aspectRatio)

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

            // passEncoder.setViewport(
            //     this.viewport.x,
            //     this.viewport.y,
            //     this.viewport.width,
            //     this.viewport.height,
            //     0,
            //     1
            // )
            passEncoder.setPipeline(fullscreenQuadPipeline);
            passEncoder.setBindGroup(0, showResultBindGroup);
            passEncoder.setBindGroup(1, bindGroup);

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

        await this.device.queue.onSubmittedWorkDone();

        // Читаем данные из буфера
        await outputBuffer.mapAsync(GPUMapMode.READ);
        const arrayBuffer = new Uint8Array(outputBuffer.getMappedRange());
        const copy = new Uint8Array(arrayBuffer); // Создаем копию данных
        // TODO: нужно очистить после использования
        await outputBuffer.unmap(); // как очистить ресы

        return copy;
    }

    view(settings?: Record<FilterName, FilterSettings>, view) {
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

        this.render(view?.scale, view?.offset, view?.aspectRatio);
    }

//     scale(settings) {
//         this.initFrame();

//         this.render(settings.scale,
// settings.offset,
// settings.aspectRatio)
//     }

    // scale(scale, offset, aspectRatio) {
    //     const shaderModule = this.device.createShaderModule({
    //         label: "Мой шейдер",
    //         code: `
    //                 // Вставьте WGSL код шейдера из предыдущего примера здесь
    //                 struct VertexInput {
    //                     @location(0) position: vec2f,
    //                     @location(1) color: vec3f,
    //                 };

    //                 struct VertexOutput {
    //                     @builtin(position) position: vec4f,
    //                     @location(0) color: vec3f,
    //                 };

    //                 struct Uniforms {
    //                     scale: f32,
    //                     offset: vec2f,
    //                     aspect_ratio: f32,
    //                     @align(16) padding: vec2f,
    //                 };

    //                 @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    //                 @vertex
    //                 fn vs_main(input: VertexInput) -> VertexOutput {
    //                     var output: VertexOutput;
    //                     let scaled_pos = input.position * uniforms.scale + uniforms.offset;
    //                     let aspect_pos = vec2f(scaled_pos.x * uniforms.aspect_ratio, scaled_pos.y);
    //                     output.position = vec4f(aspect_pos, 0.0, 1.0);
    //                     output.color = input.color;
    //                     return output;
    //                 }

    //                 @fragment
    //                 fn fs_main(input: VertexOutput) -> @location(0) vec4f {
    //                     return vec4f(input.color, 1.0);
    //                 }
    //             `
    //     });

    //     const pipeline = this.device.createRenderPipeline({
    //         layout: 'auto',
    //         vertex: {
    //             module: shaderModule,
    //         },
    //         fragment: {
    //             module: shaderModule,
    //             targets: [
    //                 {
    //                     format: this.format,
    //                 },
    //             ],
    //             // entryPoint: "main"
    //         },
    //         // fragment: {
    //         //     module: this.device.createShaderModule({
    //         //         code: fullscreenTexturedQuadWGSL,
    //         //     }),
    //         //     targets: [
    //         //         {
    //         //             format: this.format,
    //         //         },
    //         //     ],
    //         // },
    //         primitive: {
    //             topology: 'triangle-list',
    //         },

    //     });

    //     // const aspectRatio = canvas.width / canvas.height;
    //     const buffer = this.device.createBuffer({
    //         size: 32, // 4 float + 2 vec2 (с учетом выравнивания)
    //         usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    //     });

    //     const uniformData = new Float32Array(8);
    //     uniformData.set([scale, 0, offset.x, offset.y, aspectRatio, 0, 0, 0]);
    //     this.device.queue.writeBuffer(buffer, 0, uniformData);

    //     const encoder = this.device.createCommandEncoder();
    //     const passEncoder = encoder.beginRenderPass({
    //         colorAttachments: [{
    //             view: this.context.getCurrentTexture().createView(),
    //             clearValue: [0.1, 0.1, 0.1, 1],
    //             loadOp: "clear",
    //             storeOp: "store"
    //         }]
    //     });

    //     const bindGroup = this.device.createBindGroup({
    //         layout: pipeline.getBindGroupLayout(0),
    //         entries: [{
    //             binding: 0,
    //             resource: { buffer }
    //         }]
    //     });


    //     // Устанавливаем конвейер и ресурсы
    //     passEncoder.setPipeline(pipeline);
    //     passEncoder.setBindGroup(0, bindGroup);

    //     passEncoder.draw(6);
    //     passEncoder.end();
    //     this.device.queue.submit([this.commandEncoder.finish()]);

    //     // Отправляем команды в очередь
    //     // device.queue.submit([encoder.finish()]);
    // }
}

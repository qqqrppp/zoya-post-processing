import { Filter } from './filter';
import gaussianBlurWGSL from './shaders/gaussianBlur.wgsl?raw';

export type GaussianBlurSettings = {
    name: string,
    filterSize: number,
    iterations: number,
};

export class GaussianBlur extends Filter<GaussianBlurSettings> {
    init() {
        const pipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                    code: gaussianBlurWGSL,
                }),
                entryPoint: 'main',
            },
        });

        // Создаем промежуточную текстуру для горизонтального прохода
        const offsetTexture = this.device.createTexture({
            size: [this.imageBitmap.width, this.imageBitmap.height],
            format: 'rgba8unorm',
            usage:
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING,
        });

        // Буфер параметров для горизонтального прохода (direction: vec2f, radius: i32, _padding: f32) -> 16 байт
        const horizParamsBuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        // Буфер параметров для вертикального прохода (direction: vec2f, radius: i32, _padding: f32) -> 16 байт
        const vertParamsBuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        // Бинд-группы констант (группа 0)
        const horizConstantsBindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: this.sampler,
                },
                {
                    binding: 1,
                    resource: { buffer: horizParamsBuffer },
                },
            ],
        });

        const vertConstantsBindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: this.sampler,
                },
                {
                    binding: 1,
                    resource: { buffer: vertParamsBuffer },
                },
            ],
        });

        // Бинд-группы ресурсов (группа 1)
        // Направление 1: Читаем из outputTexture, пишем в offsetTexture
        const bindGroup0 = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(1),
            entries: [
                {
                    binding: 0,
                    resource: this.outputTexture.createView(),
                },
                {
                    binding: 1,
                    resource: offsetTexture.createView(),
                },
            ],
        });

        // Направление 2: Читаем из offsetTexture, пишем обратно в outputTexture
        const bindGroup1 = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(1),
            entries: [
                {
                    binding: 0,
                    resource: offsetTexture.createView(),
                },
                {
                    binding: 1,
                    resource: this.outputTexture.createView(),
                },
            ],
        });

        // Сетка вычислений (рабочие группы 16x16)
        const [w, h] = this.computeWorkGroupCount(
            [this.imageBitmap.width, this.imageBitmap.height],
            [16, 16]
        );

        const update = (settings: GaussianBlurSettings) => {
            // Горизонтальный: direction = [1.0, 0.0], radius = filterSize
            const horizData = new Float32Array([1.0, 0.0]);
            this.device.queue.writeBuffer(horizParamsBuffer, 0, horizData);
            this.device.queue.writeBuffer(
                horizParamsBuffer,
                8,
                new Int32Array([settings.filterSize])
            );

            // Вертикальный: direction = [0.0, 1.0], radius = filterSize
            const vertData = new Float32Array([0.0, 1.0]);
            this.device.queue.writeBuffer(vertParamsBuffer, 0, vertData);
            this.device.queue.writeBuffer(
                vertParamsBuffer,
                8,
                new Int32Array([settings.filterSize])
            );
        };

        const compute = (commandEncoder: GPUCommandEncoder, settings: GaussianBlurSettings) => {
            if (settings.filterSize <= 0) return;

            update(settings);

            const computePass = commandEncoder.beginComputePass({
                label: 'gaussian blur pass',
            });
            computePass.setPipeline(pipeline);

            // Базовый первый проход
            computePass.setBindGroup(0, horizConstantsBindGroup);
            computePass.setBindGroup(1, bindGroup0);
            computePass.dispatchWorkgroups(Math.ceil(w), Math.ceil(h), 1);

            computePass.setBindGroup(0, vertConstantsBindGroup);
            computePass.setBindGroup(1, bindGroup1);
            computePass.dispatchWorkgroups(Math.ceil(w), Math.ceil(h), 1);

            // Дополнительные итерации для усиления эффекта
            for (let i = 0; i < settings.iterations; i++) {
                computePass.setBindGroup(0, horizConstantsBindGroup);
                computePass.setBindGroup(1, bindGroup0);
                computePass.dispatchWorkgroups(Math.ceil(w), Math.ceil(h), 1);

                computePass.setBindGroup(0, vertConstantsBindGroup);
                computePass.setBindGroup(1, bindGroup1);
                computePass.dispatchWorkgroups(Math.ceil(w), Math.ceil(h), 1);
            }

            computePass.end();
        };

        return compute;
    }
}

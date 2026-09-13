import { Filter } from './filter';

export abstract class BaseComputeFilter<T> extends Filter<T> {
    protected pipeline!: GPUComputePipeline;
    protected intermediateTexture!: GPUTexture;
    protected ioBindGroup!: GPUBindGroup;
    protected constantsBindGroup?: GPUBindGroup;

    /**
     * Возвращает WGSL-код шейдера.
     */
    protected abstract get wgslCode(): string;

    /**
     * Создает специфичные для фильтра ресурсы (например, GPUBuffer) и бинд-группу констант.
     */
    protected abstract createResources(pipeline: GPUComputePipeline): void;

    /**
     * Обновляет буферы на основе настроек.
     */
    protected abstract updateBuffers(settings: T): void;

    /**
     * Условие пропуска применения фильтра (например, если эффект равен 0 или выключен).
     */
    protected shouldSkip(settings: T): boolean {
        return false;
    }

    /**
     * Размер локальной группы вычислений в шейдере (по умолчанию 16x16).
     */
    protected get workgroupSize(): [number, number] {
        return [16, 16];
    }

    /**
     * Вспомогательный метод для быстрого создания бинд-группы констант (uniform-буферов).
     */
    protected createConstantsBindGroup(entries: GPUBindGroupEntry[]): GPUBindGroup {
        return this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries,
        });
    }

    init() {
        // 1. Создаем конвейер
        this.pipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                    code: this.wgslCode,
                }),
            },
        });

        // 2. Создаем специфичные ресурсы в дочернем классе
        this.createResources(this.pipeline);

        // 3. Создаем стандартную промежуточную текстуру для вычислений
        this.intermediateTexture = this.device.createTexture({
            size: [this.imageBitmap.width, this.imageBitmap.height],
            format: 'rgba8unorm',
            usage:
                GPUTextureUsage.COPY_SRC |
                GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING,
        });

        // 4. Создаем бинд-группу для обмена данными между текстурами (binding 0: input/output, binding 1: intermediate)
        this.ioBindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(1),
            entries: [
                {
                    binding: 0,
                    resource: this.outputTexture.createView(),
                },
                {
                    binding: 1,
                    resource: this.intermediateTexture.createView(),
                },
            ],
        });

        const [w, h] = this.computeWorkGroupCount(
            [this.imageBitmap.width, this.imageBitmap.height],
            this.workgroupSize
        );

        // Возвращаем функцию вычислений (compute)
        return (commandEncoder: GPUCommandEncoder, settings: T) => {
            if (this.shouldSkip(settings)) {
                return;
            }

            // Обновляем буферы параметров
            this.updateBuffers(settings);

            const computePass = commandEncoder.beginComputePass({
                label: `${this.constructor.name} pass`,
            });

            computePass.setPipeline(this.pipeline);

            // Если есть группа с константами (uniform-буферами), биндим её на индекс 0
            if (this.constantsBindGroup) {
                computePass.setBindGroup(0, this.constantsBindGroup);
            }

            // Биндим текстуры на индекс 1
            computePass.setBindGroup(1, this.ioBindGroup);

            // Запуск вычислений
            computePass.dispatchWorkgroups(
                Math.ceil(w),
                Math.ceil(h),
                1
            );

            computePass.end();

            // Копируем результат обратно в текстуру вывода
            commandEncoder.copyTextureToTexture(
                { texture: this.intermediateTexture },
                { texture: this.outputTexture },
                [this.imageBitmap.width, this.imageBitmap.height]
            );
        };
    }
}

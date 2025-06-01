import { Filter } from './filter'
import matrixWGSL from './shaders/matrix.wgsl?raw';
import { mat3x3f } from '~/helpers';

export type MatrixSettings = {
    name: string,
    isLinkedSize: boolean,
    size: [number, number], // 1 - 8
    useColors: [number, number, number], // 0 or 1 or 2 
    matrix: [
        number, number, number,
        number, number, number,
        number, number, number,
    ]
}

export class Matrix extends Filter<MatrixSettings> {
    init() {
        const pipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                    code: matrixWGSL,
                }),
                entryPoint: "main"
            },
        });

        let sizeBuffer = this.device.createBuffer({
            label: 'matrix size buffer',
            size: 12,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        });

        let coeffsBuffer = this.device.createBuffer({
            label: 'matrix coeffs buffer',
            size: 16,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        });

        const matrixBuffer = this.device.createBuffer({
            label: 'matrix buffer',
            size: 48,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const computeConstants = this.device.createBindGroup({
            label: "matrix buffer group",
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: sizeBuffer,
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: coeffsBuffer,
                    }
                },
                {
                    binding: 2,
                    resource: {
                        buffer: matrixBuffer,
                    },
                }
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
            label: "matrix compute group",
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

        const update = (settings: MatrixSettings) => {
            const size = settings.isLinkedSize ? [settings.size[0], settings.size[0]] : settings.size
            this.device.queue.writeBuffer(
                sizeBuffer,
                0,
                new Int32Array(size)
            );

            this.device.queue.writeBuffer(
                coeffsBuffer,
                0,
                new Uint32Array(settings.useColors)
            );

            this.device.queue.writeBuffer(
                matrixBuffer,
                0,
                mat3x3f(settings.matrix)
            );
        }

        const [w, h] = this.computeWorkGroupCount([this.imageBitmap.width, this.imageBitmap.height], [16, 16])

        const compute = (commandEncoder: GPUCommandEncoder, settings: MatrixSettings) => {
            if (settings.size[0] == 0 && settings.size[1] == 0) {
                return;
            }

            update(settings);

            const computePass = commandEncoder.beginComputePass({
                label: "matrix pass"
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
                [this.imageBitmap.width, this.imageBitmap.height, 1]
            );
        }

        return compute
    }
}
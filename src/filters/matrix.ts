import { Filter } from './filter'
import matrixWGSL from './shaders/matrix.wgsl?raw';


export type MatrixSettings = {
    size: [number, number], // 1 - 8
    coefficient: [number, number, number], // from 0.0 to 1.0  

    matrix: [
        number, number, number,
        number, number, number,
        number, number, number,
    ]
}

// сдвиг
// const matrix = new Float32Array(
//      0, 0, 0,
//     -1, 1, 0,
//      0, 0, 0
// );

// теснение
// const matrix = new Float32Array(
//     -2.0, -1.0, 0.0,
//     -1.0, 1.0, 1.0,
//     0.0, 1.0, 2.0
// );

// резкость
// const matrix = new Float32Array(
//     0.0, -1.0, 0.0,
//     -1.0,  5, -1.0,
//     0.0, -1.0, 0.0
// );

//  слепок
// const matrix = new Float32Array([
//     -1, -1, -1,
//     -1,  8, -1,
//     -1, -1, -1
// ]);

// gausian
// const matrix = new Float32Array([
//     1.0 / 16.0, 2.0 / 16.0, 1.0 / 16.0,
//     2.0 / 16.0, 4.0 / 16.0, 2.0 / 16.0,
//     1.0 / 16.0, 2.0 / 16.0, 1.0 / 16.0
// ]);


export class Matrix extends Filter<MatrixSettings> {
    init() {
        const pipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                    code: matrixWGSL,
                }),
                // entryPoint: "main"
            },
        });

        const sizeBuffer = this.device.createBuffer({
            label: 'size buffer',
            size: 2 * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        let coeffsBuffer = this.device.createBuffer({
            label: 'coeff buffer',
            size: 16,
            usage:  GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
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
                    resource: this.outputTexute.createView(),
                },
                {
                    binding: 1,
                    resource: intermediateTexture.createView(),
                },
            ],
        });

        const update = (settings: MatrixSettings) => {
            this.device.queue.writeBuffer(
                sizeBuffer,
                0,
                new Int32Array(settings.size)
            );


            this.device.queue.writeBuffer(
                coeffsBuffer,
                0,
                new Float32Array([1.0,1.0,1.0])
            );

            const matrixData = new Float32Array([
                // Assuming you have the matrix data available
                -2.0, -1.0, 0.0,
                -1.0,  1.0, 1.0,
                0.0,  1.0, 2.0
            ]);

            console.log(matrixData.byteLength)

            this.device.queue.writeBuffer(
                matrixBuffer,
                0,
                // new Float32Array(settings.matrix)
                matrixData,
                // 0, 9,
            );
        }

        const [w, h] = this.computeWorkGroupCount([this.imageBitmap.width, this.imageBitmap.height], [16, 16])

        const compute = (commandEncoder: GPUCommandEncoder, settings: MatrixSettings) => {
// console.log(settings, settings.size[0] == 0 || settings.size[1] == 0)
//             return;
            if (settings.size[0] == 0 || settings.size[1] == 0) {
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
                { texture: this.outputTexute },
                [this.imageBitmap.width, this.imageBitmap.height]
            );
        }

        return compute
    }
}
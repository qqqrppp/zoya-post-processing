import { BaseComputeFilter } from './baseComputeFilter';
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

export class Matrix extends BaseComputeFilter<MatrixSettings> {
    private sizeBuffer!: GPUBuffer;
    private coeffsBuffer!: GPUBuffer;
    private matrixBuffer!: GPUBuffer;

    protected get wgslCode() {
        return matrixWGSL;
    }

    protected createResources() {
        this.sizeBuffer = this.device.createBuffer({
            label: 'matrix size buffer',
            size: 8,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        });

        this.coeffsBuffer = this.device.createBuffer({
            label: 'matrix coeffs buffer',
            size: 16,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        });

        this.matrixBuffer = this.device.createBuffer({
            label: 'matrix buffer',
            size: 48,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.constantsBindGroup = this.createConstantsBindGroup([
            {
                binding: 0,
                resource: {
                    buffer: this.sizeBuffer,
                }
            },
            {
                binding: 1,
                resource: {
                    buffer: this.matrixBuffer,
                },
            },
            {
                binding: 2,
                resource: {
                    buffer: this.coeffsBuffer,
                }
            },
        ]);
    }

    protected updateBuffers(settings: MatrixSettings) {
        const size = settings.isLinkedSize ? [settings.size[0], settings.size[0]] : settings.size;
        
        this.device.queue.writeBuffer(
            this.sizeBuffer,
            0,
            new Int32Array(size)
        );

        this.device.queue.writeBuffer(
            this.coeffsBuffer,
            0,
            new Uint32Array(settings.useColors)
        );

        this.device.queue.writeBuffer(
            this.matrixBuffer,
            0,
            mat3x3f(settings.matrix)
        );
    }

    protected shouldSkip(settings: MatrixSettings): boolean {
        return settings.size[0] === 0 && settings.size[1] === 0;
    }
}

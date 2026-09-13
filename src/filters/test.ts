import { Filter } from './filter'
import { Matrix } from './matrix';
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

export class Test extends Filter<MatrixSettings> {
    init() {
        console.log('qwe')
        var matrix = new Matrix(
            this.context,
            this.device,
            this.format,
            this.imageBitmap,
            this.sampler,
            this.inputTexture,
            this.outputTexture,
        );

        const compute = matrix.init()

        return compute
        // this.c
        
    }
}
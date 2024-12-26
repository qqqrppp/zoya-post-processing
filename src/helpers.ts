export const isEqualArray = (a: number[], b: number[]): boolean => {
    if (a.length != b.length) return false;

    for (let i in a) {
        if (a[i] != b[i]) return false;
    };

    return true;
}

const matrixCxRs = (c: number, r: number, s: 'i' | 'f' | 'u' = 'i') =>  {
    const arr = Array.from({ length: c * r + r }, () => 0)
    const matrixTemplate = {
        'i': (arr: number[]) => new Int32Array(arr),
        'f': (arr: number[]) => new Float32Array(arr),
        'u': (arr: number[]) => new Uint32Array(arr),
    }

    return (matrix: number[]) => {
        let offset = 0;
        let offsetIndex = c + 1;
        const mat = arr.map((_, i) => {
            if ((i + 1) % offsetIndex == 0 || i > matrix.length + 2) {
                offset += 1;
                return 0
            }

            return matrix[i - offset] || 0
        });

        return matrixTemplate[s](mat)
    }
}

export const mat3x3i = matrixCxRs(3, 3, 'i');
export const mat3x3u = matrixCxRs(3, 3, 'u');
export const mat3x3f = matrixCxRs(3, 3, 'f');

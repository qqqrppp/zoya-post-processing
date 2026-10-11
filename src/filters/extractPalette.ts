import { MAX_PALETTE_COLORS } from './palette';

export enum ExtractMethod {
    kmeans = 0,        // k-means в Oklab, цвета - средние по кластерам
    kmeansSnapped = 1, // k-means, но каждый цвет заменён ближайшим реальным пикселем
    vivid = 2,         // k-means с повышенным весом насыщенных пикселей (сохраняет акценты)
    medianCut = 3,     // median cut в Oklab
    popular = 4,       // самые частые цвета, заметно отличающиеся друг от друга
}

const SAMPLE_SIZE = 128;     // максимум по длинной стороне после уменьшения картинки
const MAX_ITERATIONS = 24;
const ALPHA_THRESHOLD = 16;  // почти прозрачные пиксели не участвуют
const VIVID_BOOST = 16;      // насколько сильнее влияют насыщенные пиксели: weight = 1 + VIVID_BOOST * chroma

// ---------- Цветовые конвертации ----------

const srgbToLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

const linearToSrgb = (c: number) => {
    const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.min(1, Math.max(0, v));
};

const rgbToOklab = (r: number, g: number, b: number): [number, number, number] => {
    const lr = srgbToLinear(r);
    const lg = srgbToLinear(g);
    const lb = srgbToLinear(b);

    const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
    const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
    const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

    return [
        0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
    ];
};

const oklabToHex = (L: number, a: number, b: number): string => {
    const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
    const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
    const s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);

    const rgb = [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    ];

    return '#' + rgb
        .map(c => Math.round(linearToSrgb(c) * 255).toString(16).padStart(2, '0'))
        .join('');
};

// ---------- Утилиты ----------

// Детерминированный генератор, чтобы одна и та же картинка давала одну и ту же палитру
const mulberry32 = (seed: number) => () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Плоский массив Oklab-координат: [L0, a0, b0, L1, a1, b1, ...]
const readPixels = (image: ImageBitmap): Float32Array => {
    const ratio = Math.min(1, SAMPLE_SIZE / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * ratio));
    const height = Math.max(1, Math.round(image.height * ratio));

    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    context.drawImage(image, 0, 0, width, height);

    const { data } = context.getImageData(0, 0, width, height);
    const points: number[] = [];

    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < ALPHA_THRESHOLD) continue;

        points.push(...rgbToOklab(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255));
    }

    return Float32Array.from(points);
};

const distSq = (points: Float32Array, i: number, centers: Float32Array, c: number) => {
    const dL = points[i * 3] - centers[c * 3];
    const da = points[i * 3 + 1] - centers[c * 3 + 1];
    const db = points[i * 3 + 2] - centers[c * 3 + 2];
    return dL * dL + da * da + db * db;
};

const chromaOf = (points: Float32Array, i: number) =>
    Math.hypot(points[i * 3 + 1], points[i * 3 + 2]);

// ---------- Методы ----------

/**
 * k-means (инициализация k-means++) в Oklab.
 * Если переданы weights, пиксели влияют и на выбор начальных центров, и на положение центров пропорционально весу.
 */
const kMeans = (points: Float32Array, k: number, weights?: Float32Array): Float32Array => {
    const n = points.length / 3;
    const random = mulberry32(1);
    const centers = new Float32Array(k * 3);
    const minDist = new Float64Array(n).fill(Infinity);
    const weightOf = (i: number) => (weights ? weights[i] : 1);
    let found = 0;

    // k-means++: следующий центр выбирается с вероятностью, пропорциональной весу * квадрату расстояния до ближайшего центра
    let first = Math.floor(random() * n);
    while (found < k) {
        centers.set(points.subarray(first * 3, first * 3 + 3), found * 3);

        let total = 0;
        for (let i = 0; i < n; i++) {
            minDist[i] = Math.min(minDist[i], distSq(points, i, centers, found));
            total += minDist[i] * weightOf(i);
        }
        found++;

        // Оставшиеся пиксели совпадают с выбранными центрами - уникальных цветов меньше k
        if (total === 0) break;

        let target = random() * total;
        first = n - 1;
        for (let i = 0; i < n; i++) {
            target -= minDist[i] * weightOf(i);
            if (target <= 0) {
                first = i;
                break;
            }
        }
    }

    const clusters = found;
    const assignment = new Int32Array(n).fill(-1);

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        let changed = false;

        for (let i = 0; i < n; i++) {
            let best = 0;
            let bestDist = Infinity;

            for (let c = 0; c < clusters; c++) {
                const d = distSq(points, i, centers, c);
                if (d < bestDist) {
                    bestDist = d;
                    best = c;
                }
            }

            if (assignment[i] !== best) {
                assignment[i] = best;
                changed = true;
            }
        }

        if (!changed) break;

        const sums = new Float64Array(clusters * 3);
        const sizes = new Float64Array(clusters);

        for (let i = 0; i < n; i++) {
            const c = assignment[i];
            const w = weightOf(i);
            sums[c * 3] += points[i * 3] * w;
            sums[c * 3 + 1] += points[i * 3 + 1] * w;
            sums[c * 3 + 2] += points[i * 3 + 2] * w;
            sizes[c] += w;
        }

        for (let c = 0; c < clusters; c++) {
            if (sizes[c] === 0) continue; // пустой кластер оставляем на месте

            centers[c * 3] = sums[c * 3] / sizes[c];
            centers[c * 3 + 1] = sums[c * 3 + 1] / sizes[c];
            centers[c * 3 + 2] = sums[c * 3 + 2] / sizes[c];
        }
    }

    return centers.subarray(0, clusters * 3);
};

/** Заменяет каждый центр ближайшим реальным пикселем картинки. */
const snapToPixels = (points: Float32Array, centers: Float32Array): Float32Array => {
    const n = points.length / 3;
    const snapped = new Float32Array(centers.length);

    for (let c = 0; c < centers.length / 3; c++) {
        let best = 0;
        let bestDist = Infinity;

        for (let i = 0; i < n; i++) {
            const d = distSq(points, i, centers, c);
            if (d < bestDist) {
                bestDist = d;
                best = i;
            }
        }

        snapped.set(points.subarray(best * 3, best * 3 + 3), c * 3);
    }

    return snapped;
};

/**
 * Median cut: цветовой «ящик» с наибольшим разбросом режется пополам по медиане вдоль самой широкой оси,
 * пока ящиков не станет k. Цвет палитры - среднее по ящику.
 */
const medianCut = (points: Float32Array, k: number): Float32Array => {
    const n = points.length / 3;

    type Box = { indices: number[], axis: number, range: number };

    const makeBox = (indices: number[]): Box => {
        const min = [Infinity, Infinity, Infinity];
        const max = [-Infinity, -Infinity, -Infinity];

        for (const i of indices) {
            for (let axis = 0; axis < 3; axis++) {
                const v = points[i * 3 + axis];
                if (v < min[axis]) min[axis] = v;
                if (v > max[axis]) max[axis] = v;
            }
        }

        let bestAxis = 0;
        let bestRange = -1;
        for (let axis = 0; axis < 3; axis++) {
            const range = max[axis] - min[axis];
            if (range > bestRange) {
                bestRange = range;
                bestAxis = axis;
            }
        }

        return { indices, axis: bestAxis, range: bestRange };
    };

    const boxes: Box[] = [makeBox(Array.from({ length: n }, (_, i) => i))];

    while (boxes.length < k) {
        let target = -1;
        let targetRange = 0;

        boxes.forEach((box, index) => {
            if (box.indices.length > 1 && box.range > targetRange) {
                targetRange = box.range;
                target = index;
            }
        });

        if (target === -1) break; // дальше делить нечего

        const { indices, axis } = boxes[target];
        indices.sort((x, y) => points[x * 3 + axis] - points[y * 3 + axis]);

        const middle = indices.length >> 1;
        boxes.splice(target, 1, makeBox(indices.slice(0, middle)), makeBox(indices.slice(middle)));
    }

    const centers = new Float32Array(boxes.length * 3);
    boxes.forEach((box, c) => {
        for (const i of box.indices) {
            centers[c * 3] += points[i * 3];
            centers[c * 3 + 1] += points[i * 3 + 1];
            centers[c * 3 + 2] += points[i * 3 + 2];
        }
        centers[c * 3] /= box.indices.length;
        centers[c * 3 + 1] /= box.indices.length;
        centers[c * 3 + 2] /= box.indices.length;
    });

    return centers;
};

/**
 * Самые частые цвета: пиксели группируются в ячейки сетки Oklab, ячейки сортируются по числу пикселей,
 * и выбираются самые популярные из тех, что заметно отличаются от уже выбранных.
 * Порог различия снижается, пока не наберётся k цветов.
 */
const popular = (points: Float32Array, k: number): Float32Array => {
    const n = points.length / 3;
    const STEP_L = 0.04;
    const STEP_AB = 0.03;

    const buckets = new Map<string, { count: number, L: number, a: number, b: number }>();

    for (let i = 0; i < n; i++) {
        const key = [
            Math.round(points[i * 3] / STEP_L),
            Math.round(points[i * 3 + 1] / STEP_AB),
            Math.round(points[i * 3 + 2] / STEP_AB),
        ].join(',');

        const bucket = buckets.get(key) ?? { count: 0, L: 0, a: 0, b: 0 };
        bucket.count++;
        bucket.L += points[i * 3];
        bucket.a += points[i * 3 + 1];
        bucket.b += points[i * 3 + 2];
        buckets.set(key, bucket);
    }

    const sorted = [...buckets.values()]
        .sort((x, y) => y.count - x.count)
        .map(x => [x.L / x.count, x.a / x.count, x.b / x.count]);

    let picked: number[][] = [];
    let threshold = 0.12;

    while (true) {
        picked = [];

        for (const color of sorted) {
            const isDistinct = picked.every(p =>
                Math.hypot(p[0] - color[0], p[1] - color[1], p[2] - color[2]) >= threshold
            );

            if (isDistinct) picked.push(color);
            if (picked.length >= k) break;
        }

        if (picked.length >= k || threshold < 0.01) break;
        threshold *= 0.7;
    }

    return Float32Array.from(picked.flat());
};

/**
 * Собирает палитру из `count` цветов картинки выбранным методом.
 * Результат отсортирован от тёмных цветов к светлым, без дубликатов.
 */
export const extractPalette = (
    image: ImageBitmap,
    count: number,
    method: ExtractMethod = ExtractMethod.kmeans,
): string[] => {
    const k = Math.min(Math.max(1, Math.round(count)), MAX_PALETTE_COLORS);
    const points = readPixels(image);
    const n = points.length / 3;

    if (n === 0) return [];

    let centers: Float32Array;

    switch (method) {
        case ExtractMethod.kmeansSnapped:
            centers = snapToPixels(points, kMeans(points, k));
            break;
        case ExtractMethod.vivid: {
            const weights = new Float32Array(n);
            for (let i = 0; i < n; i++) {
                weights[i] = 1 + VIVID_BOOST * chromaOf(points, i);
            }
            centers = kMeans(points, k, weights);
            break;
        }
        case ExtractMethod.medianCut:
            centers = medianCut(points, k);
            break;
        case ExtractMethod.popular:
            centers = popular(points, k);
            break;
        default:
            centers = kMeans(points, k);
    }

    const result: { L: number, hex: string }[] = [];
    for (let c = 0; c < centers.length / 3; c++) {
        result.push({
            L: centers[c * 3],
            hex: oklabToHex(centers[c * 3], centers[c * 3 + 1], centers[c * 3 + 2]),
        });
    }

    result.sort((a, b) => a.L - b.L);

    // Разные центры могут округлиться до одного hex-цвета
    return [...new Set(result.map(x => x.hex))];
};

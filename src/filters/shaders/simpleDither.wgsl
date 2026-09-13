struct Params {
    variant: f32,     // 0 = Bayer 4x4, 1 = Bayer 8x8, 2 = Bayer 16x16, 3 = Noise, 4 = Halftone
    levelR: f32,      // Уровни квантования R (или серого)
    levelG: f32,      // Уровни квантования G
    levelB: f32,      // Уровни квантования B
    equalizing: f32,  // Сила смещения порога (-1.0 .. 1.0)
    scale: f32,       // Масштаб сетки (1.0, 2.0, 4.0, 8.0)
    monochrome: f32,  // 0.0 = Цветной дизеринг, 1.0 = Черно-белый
}

@group(0) @binding(0) var<uniform> params : Params;

@group(1) @binding(0) var inputTexture : texture_2d<f32>;
@group(1) @binding(1) var outputTexture : texture_storage_2d<rgba8unorm, write>;

// Матрицы Байера
const BAYER_4x4 = mat4x4(
    0.0, 8.0, 2.0, 10.0,
    12.0, 4.0, 14.0, 6.0,
    3.0, 11.0, 1.0, 9.0,
    15.0, 7.0, 13.0, 5.0,
);

const BAYER_8x8 = array<array<f32, 8>, 8>(
    array<f32, 8>(0.0, 32.0, 8.0, 40.0, 2.0, 34.0, 10.0, 42.0),
    array<f32, 8>(48.0, 16.0, 56.0, 24.0, 50.0, 18.0, 58.0, 26.0),
    array<f32, 8>(12.0, 44.0, 4.0, 36.0, 14.0, 46.0, 6.0, 38.0),
    array<f32, 8>(60.0, 28.0, 52.0, 20.0, 62.0, 30.0, 54.0, 22.0),
    array<f32, 8>(3.0, 35.0, 11.0, 43.0, 1.0, 33.0, 9.0, 41.0),
    array<f32, 8>(51.0, 19.0, 59.0, 27.0, 49.0, 17.0, 57.0, 25.0),
    array<f32, 8>(15.0, 47.0, 7.0, 39.0, 13.0, 45.0, 5.0, 37.0),
    array<f32, 8>(63.0, 31.0, 55.0, 23.0, 61.0, 29.0, 53.0, 21.0)
);

const BAYER_16x16 = array<array<f32, 16>, 16>(
    array<f32, 16>(0.0, 128.0, 32.0, 160.0, 8.0, 136.0, 40.0, 168.0, 2.0, 130.0, 34.0, 162.0, 10.0, 138.0, 42.0, 170.0),
    array<f32, 16>(192.0, 64.0, 224.0, 96.0, 200.0, 72.0, 232.0, 104.0, 194.0, 66.0, 226.0, 98.0, 202.0, 74.0, 234.0, 106.0),
    array<f32, 16>(48.0, 176.0, 16.0, 144.0, 56.0, 184.0, 24.0, 152.0, 50.0, 178.0, 18.0, 146.0, 58.0, 186.0, 26.0, 154.0),
    array<f32, 16>(240.0, 112.0, 208.0, 80.0, 248.0, 120.0, 216.0, 88.0, 242.0, 114.0, 210.0, 82.0, 250.0, 122.0, 218.0, 90.0),
    array<f32, 16>(12.0, 140.0, 44.0, 172.0, 4.0, 132.0, 36.0, 164.0, 14.0, 142.0, 46.0, 174.0, 6.0, 134.0, 38.0, 166.0),
    array<f32, 16>(204.0, 76.0, 236.0, 108.0, 196.0, 68.0, 228.0, 100.0, 206.0, 78.0, 238.0, 110.0, 198.0, 70.0, 230.0, 102.0),
    array<f32, 16>(60.0, 188.0, 28.0, 156.0, 52.0, 180.0, 20.0, 148.0, 62.0, 190.0, 30.0, 158.0, 54.0, 182.0, 22.0, 150.0),
    array<f32, 16>(252.0, 124.0, 220.0, 92.0, 244.0, 116.0, 212.0, 84.0, 254.0, 126.0, 222.0, 94.0, 246.0, 118.0, 214.0, 86.0),
    array<f32, 16>(3.0, 131.0, 35.0, 163.0, 11.0, 139.0, 43.0, 171.0, 1.0, 129.0, 33.0, 161.0, 9.0, 137.0, 41.0, 169.0),
    array<f32, 16>(195.0, 67.0, 227.0, 99.0, 203.0, 75.0, 235.0, 107.0, 193.0, 65.0, 225.0, 97.0, 201.0, 73.0, 233.0, 105.0),
    array<f32, 16>(51.0, 179.0, 19.0, 147.0, 59.0, 187.0, 27.0, 155.0, 49.0, 177.0, 17.0, 145.0, 57.0, 185.0, 25.0, 153.0),
    array<f32, 16>(243.0, 115.0, 211.0, 83.0, 251.0, 123.0, 219.0, 91.0, 241.0, 113.0, 209.0, 81.0, 249.0, 121.0, 217.0, 89.0),
    array<f32, 16>(15.0, 143.0, 47.0, 175.0, 7.0, 135.0, 39.0, 167.0, 13.0, 141.0, 45.0, 173.0, 5.0, 133.0, 37.0, 165.0),
    array<f32, 16>(207.0, 79.0, 239.0, 111.0, 199.0, 71.0, 231.0, 103.0, 205.0, 77.0, 237.0, 109.0, 197.0, 69.0, 229.0, 101.0),
    array<f32, 16>(63.0, 191.0, 31.0, 159.0, 55.0, 183.0, 23.0, 151.0, 61.0, 189.0, 29.0, 157.0, 53.0, 181.0, 21.0, 149.0),
    array<f32, 16>(255.0, 127.0, 223.0, 95.0, 247.0, 119.0, 215.0, 87.0, 253.0, 125.0, 221.0, 93.0, 245.0, 117.0, 213.0, 85.0)
);

// Быстрая псевдослучайная функция шума на GPU
fn hash2d(p: vec2f) -> f32 {
    let sin_val = sin(dot(p, vec2f(127.1, 311.7)));
    return fract(sin_val * 43758.5453123) - 0.5;
}

@compute @workgroup_size(16, 16)
fn main(
    @builtin(global_invocation_id) id: vec3<u32>
) {
    let textureSize = textureDimensions(inputTexture);
    if id.x >= textureSize.x || id.y >= textureSize.y {
        return;
    }

    let coords = vec2i(id.xy);
    var color = textureLoad(inputTexture, coords, 0);

    // Если включен Monochrome режим, переводим пиксель в Ч/Б
    if params.monochrome > 0.5 {
        let gray = dot(color.rgb, vec3f(0.299, 0.587, 0.114));
        color = vec4f(gray, gray, gray, color.a);
    }

    let scale = max(1.0, params.scale);
    let ditherX = u32(f32(id.x) / scale);
    let ditherY = u32(f32(id.y) / scale);

    let variant = i32(params.variant);
    var threshold = 0.0;

    if variant == 0 {
        // Bayer 4x4 Ordered Dither
        threshold = (BAYER_4x4[ditherX % 4u][ditherY % 4u] / 16.0) - 0.5;

    } else if variant == 1 {
        // Bayer 8x8 Ordered Dither
        threshold = (BAYER_8x8[ditherX % 8u][ditherY % 8u] / 64.0) - 0.5;

    } else if variant == 2 {
        // Bayer 16x16 Ordered Dither
        threshold = (BAYER_16x16[ditherX % 16u][ditherY % 16u] / 256.0) - 0.5;

    } else if variant == 3 {
        // Noise Dither (случайное зерно)
        threshold = hash2d(vec2f(f32(ditherX), f32(ditherY))) * 1.0;

    } else if variant == 4 {
        // Halftone Dither (крупный комикс-растр)
        let cell_size = scale;
        let cell_x = (floor(f32(id.x) / cell_size) + 0.5) * cell_size;
        let cell_y = (floor(f32(id.y) / cell_size) + 0.5) * cell_size;
        
        let dist = distance(vec2f(id.xy), vec2f(cell_x, cell_y));
        let max_radius = cell_size * 0.7071; // Полудиагональ ячейки
        
        // Переводим радиальное расстояние в порог
        threshold = (dist / max_radius) - 0.5;
    }

    // Применяем дизеринг по формуле квантования со смещением
    let ditheredColor = vec4<f32>(
        floor(color.r * params.levelR + threshold + params.equalizing) / params.levelR,
        floor(color.g * params.levelG + threshold + params.equalizing) / params.levelG,
        floor(color.b * params.levelB + threshold + params.equalizing) / params.levelB,
        color.a
    );

    textureStore(outputTexture, id.xy, ditheredColor);
}

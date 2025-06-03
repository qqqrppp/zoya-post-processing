struct Color {
    r: f32,
    g: f32,
    b: f32,
}
@group(0) @binding(0) var<uniform> variant : u32; // 1 - 4x4, 2 - average8x8, 3 - 16x16
@group(0) @binding(1) var<uniform> level : Color; // Уменьшаем до 4 оттенков на канал

@group(1) @binding(0) var inputTexture : texture_2d<f32>;
@group(1) @binding(1) var outputTexture : texture_storage_2d<rgba8unorm, write>;


// Предопределённая палитра (например, 8-цветная EGA)
const PALETTE: array<vec3<f32>, 8> = array<vec3<f32>, 8>(
    vec3f(0.07, 0.07, 0.06),    // Чёрный
    vec3f(0.59, 0.18, 0.06),     // Красный
    vec3f(0.0, 1.0, 0.0),     // Зелёный
    vec3f(0.95, 0.74, 0.345),     // Жёлтый
    vec3f(0.0, 0.0, 1.0),     // Синий
    vec3f(0.44, 0.40, 0.50),     // Пурпурный
    vec3f(0.56, 0.576, 0.61),     // Голубой
    vec3f(0.98, 0.98, 0.98)      // Белый
);

fn findNearestColor(color: vec3<f32>) -> vec3<f32> {
    var minDist = 9999.0;
    var bestColor = vec3<f32>(0.0);
    
    for (var i = 0u; i < 8u; i++) {
        let paletteColor = PALETTE[i];
        let dist = distance(color, paletteColor);
        if (dist < minDist) {
            minDist = dist;
            bestColor = paletteColor;
        }
    }
    return bestColor;
}

// fn findNearestColor(color: vec3<f32>) -> vec3<f32> {
//     var minDist = 9999.0;
//     var bestIndex = 1u;
    
//     let yuvColor = rgbToYuv(color);
    
//     for (var i = 0u; i < 8u; i++) {
//         let paletteYuv = rgbToYuv(PALETTE[i]);
//         let dist = yuvDistance(yuvColor, paletteYuv);
        
//         if (dist < minDist) {
//             minDist = dist;
//             bestIndex = i;
//         }
//     }
//     return PALETTE[bestIndex];
// }

// fn rgbToYuv(rgb: vec3<f32>) -> vec3<f32> {
//     return vec3<f32>(
//         0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b, // Y
//         -0.14713 * rgb.r - 0.28886 * rgb.g + 0.436 * rgb.b, // U
//         0.615 * rgb.r - 0.51499 * rgb.g - 0.10001 * rgb.b  // V
//     );
// }

// fn yuvDistance(yuv1: vec3<f32>, yuv2: vec3<f32>) -> f32 {
//     let dY = yuv1.x - yuv2.x;
//     let dU = yuv1.y - yuv2.y;
//     let dV = yuv1.z - yuv2.z;
//     return dY*dY + dU*dU + dV*dV;
// }
@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let vari = variant;
    let lev = level;
    let color = textureLoad(inputTexture, vec2<i32>(id.xy), 0);
    let nearestColor = findNearestColor(color.rgb);
    textureStore(outputTexture, vec2<i32>(id.xy), vec4(nearestColor, color.a));
}
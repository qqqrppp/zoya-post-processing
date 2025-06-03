struct Color {
    r: f32,
    g: f32,
    b: f32,
}
@group(0) @binding(0) var<uniform> variant : u32; // 1 - 4x4, 2 - average8x8, 3 - 16x16
@group(0) @binding(1) var<uniform> level : Color; 
@group(0) @binding(2) var<uniform> equalizing : f32;

@group(1) @binding(0) var inputTexture : texture_2d<f32>;
@group(1) @binding(1) var outputTexture : texture_storage_2d<rgba8unorm, write>;

// Матрица Байера для дизеринга 4x4
const BAYER_MATRIX_4x4 = mat4x4(
    0, 8, 2, 10,
    12, 4, 14, 6,
    3, 11, 1, 9,
    15, 7, 13, 5,
);

const BAYER_MATRIX_8x8 = array<array<i32, 8>, 8>(
    array<i32, 8>(0, 32, 8, 40, 2, 34, 10, 42),
    array<i32, 8>(48, 16, 56, 24, 50, 18, 58, 26),
    array<i32, 8>(12, 44, 4, 36, 14, 46, 6, 38),
    array<i32, 8>(60, 28, 52, 20, 62, 30, 54, 22),
    array<i32, 8>(3, 35, 11, 43, 1, 33, 9, 41),
    array<i32, 8>(51, 19, 59, 27, 49, 17, 57, 25),
    array<i32, 8>(15, 47, 7, 39, 13, 45, 5, 37),
    array<i32, 8>(63, 31, 55, 23, 61, 29, 53, 21),
);

const BAYER_MATRIX_16x16 = array<array<i32, 16>, 16>(
    array<i32, 16>(0, 128, 32, 160, 8, 136, 40, 168, 2, 130, 34, 162, 10, 138, 42, 170),
    array<i32, 16>(192, 64, 224, 96, 200, 72, 232, 104, 194, 66, 226, 98, 202, 74, 234, 106),
    array<i32, 16>(48, 176, 16, 144, 56, 184, 24, 152, 50, 178, 18, 146, 58, 186, 26, 154),
    array<i32, 16>(240, 112, 208, 80, 248, 120, 216, 88, 242, 114, 210, 82, 250, 122, 218, 90),
    array<i32, 16>(12, 140, 44, 172, 4, 132, 36, 164, 14, 142, 46, 174, 6, 134, 38, 166),
    array<i32, 16>(204, 76, 236, 108, 196, 68, 228, 100, 206, 78, 238, 110, 198, 70, 230, 102),
    array<i32, 16>(60, 188, 28, 156, 52, 180, 20, 148, 62, 190, 30, 158, 54, 182, 22, 150),
    array<i32, 16>(252, 124, 220, 92, 244, 116, 212, 84, 254, 126, 222, 94, 246, 118, 214, 86),
    array<i32, 16>(3, 131, 35, 163, 11, 139, 43, 171, 1, 129, 33, 161, 9, 137, 41, 169),
    array<i32, 16>(195, 67, 227, 99, 203, 75, 235, 107, 193, 65, 225, 97, 201, 73, 233, 105),
    array<i32, 16>(51, 179, 19, 147, 59, 187, 27, 155, 49, 177, 17, 145, 57, 185, 25, 153),
    array<i32, 16>(243, 115, 211, 83, 251, 123, 219, 91, 241, 113, 209, 81, 249, 121, 217, 89),
    array<i32, 16>(15, 143, 47, 175, 7, 135, 39, 167, 13, 141, 45, 173, 5, 133, 37, 165),
    array<i32, 16>(207, 79, 239, 111, 199, 71, 231, 103, 205, 77, 237, 109, 197, 69, 229, 101),
    array<i32, 16>(63, 191, 31, 159, 55, 183, 23, 151, 61, 189, 29, 157, 53, 181, 21, 149),
    array<i32, 16>(255, 127, 223, 95, 247, 119, 215, 87, 253, 125, 221, 93, 245, 117, 213, 85),
);

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let textureSize = textureDimensions(inputTexture);
    if id.x >= textureSize.x || id.y >= textureSize.y {
        return;
    }

    let uv = vec2<f32>(id.xy) / vec2<f32>(textureSize);
    let color = textureLoad(inputTexture, vec2<i32>(id.xy), 0);

    // Применяем дизеринг
    var threshold: f32;

    switch variant {
        case 1u, default {
            threshold = f32(BAYER_MATRIX_4x4[id.x % 4u][id.y % 4u]) / 16.0 + equalizing * -1;
            break;
        }
        case 2u {
            threshold = f32(BAYER_MATRIX_8x8[id.x % 8u][id.y % 8u]) / 64.0 + equalizing * -1;
            break;
        }
        case 3u {
            threshold = f32(BAYER_MATRIX_16x16[id.x % 16u][id.y % 16u]) / 256.0 + equalizing * -1;
            break;
        }
    }

    let ditheredColor = vec4<f32>(
        floor(color.r * level.r + threshold + equalizing) / level.r,
        floor(color.g * level.g + threshold + equalizing) / level.g,
        floor(color.b * level.b + threshold + equalizing) / level.b,
        color.a
    );

    textureStore(outputTexture, id.xy, ditheredColor);
}



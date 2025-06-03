struct Color {
    r: f32,
    g: f32,
    b: f32,
}
@group(0) @binding(0) var<uniform> variant : u32; // 1 - 4x4, 2 - average8x8, 3 - 16x16
@group(0) @binding(1) var<uniform> level : Color; // Уменьшаем до 4 оттенков на канал

@group(1) @binding(0) var inputTexture : texture_2d<f32>;
@group(1) @binding(1) var outputTexture : texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    // todo
    let vari = variant;

    let texSize = textureDimensions(inputTexture);
    if (id.x >= texSize.x || id.y >= texSize.y) { return; }

    let color = textureLoad(inputTexture, vec2<i32>(id.xy), 0);
    
    // Постеризация до N уровней на канал
    let posterized = vec4<f32>(
        floor(color.r * level.r + 0.5) / level.r,
        floor(color.g * level.g + 0.5) / level.g,
        floor(color.b * level.b + 0.5) / level.b,
        color.a
    );

    textureStore(outputTexture, vec2<i32>(id.xy), posterized);
}


// const BAYER_4x4 = array(
//     array( 0,  8,  2, 10 ),
//     array(12,  4, 14,  6 ),
//     array( 3, 11,  1,  9 ),
//     array(15,  7, 13,  5 )
// );

// const eq = 0.7;

// @compute @workgroup_size(16, 16)
// fn main(@builtin(global_invocation_id) id: vec3<u32>) {
//     // let levels = 4.0;
//     let vari = variant;

//     let threshold = f32(BAYER_4x4[id.x % 4][id.y % 4]) / 16.0 - eq; // [-0.5..0.5]
    
//     let color = textureLoad(inputTexture, vec2<i32>(id.xy), 0);
//     let posterized = vec4<f32>(
//         floor(color.r * level.r + threshold + eq) / level.r,
//         floor(color.g * level.g + threshold + eq) / level.g,
//         floor(color.b * level.b + threshold + eq) / level.b,
//         color.a
//     );

//     textureStore(outputTexture, vec2<i32>(id.xy), posterized);
// }
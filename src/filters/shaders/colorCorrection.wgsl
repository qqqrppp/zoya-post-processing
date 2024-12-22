

struct Color {
    r: f32,
    g: f32,
    b: f32,
}

@group(0) @binding(0) var<uniform> correction : Color;
@group(0) @binding(1) var<uniform> reduction : Color;

@group(1) @binding(0) var input_texture : texture_2d<f32>;
@group(1) @binding(1) var output_texture : texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(16, 16)
fn main(
    @builtin(global_invocation_id) global_id: vec3u,
) {
    let dimensions = textureDimensions(input_texture);
    let coords = vec2u(global_id.xy);

    if coords.x >= dimensions.x
    || coords.y >= dimensions.y {
        return;
    }

    let color = textureLoad(input_texture, vec2i(global_id.xy), 0);

    let new_color = vec4(
        (color.r + correction.r) * (1 + reduction.r),
        (color.g + correction.g) * (1 + reduction.g),
        (color.b + correction.b) * (1 + reduction.b),
        color.a
    );

    textureStore(output_texture, vec2i(global_id.xy), vec4f(new_color));
}

struct Coefficient {
    r: f32,
    g: f32,
    b: f32,
}
@group(0) @binding(0) var<uniform> coeffs : Coefficient;


@group(1) @binding(0) var input_texture : texture_2d<f32>;
@group(1) @binding(1) var output_texture : texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(16, 16)
fn main(
  @builtin(global_invocation_id) global_id : vec3<u32>,
) {
    let dimensions = textureDimensions(input_texture);

    if(u32(global_id.x) >= dimensions.x || u32(global_id.y) >= dimensions.y) {
      return;
    }

    let color = textureLoad(input_texture, vec2i(global_id.xy), 0);
    let inverse = vec4f(
      color.r * coeffs.r + (1 - color.r) * (1.0 - coeffs.r),
      color.g * coeffs.g + (1 - color.g) * (1.0 - coeffs.g),
      color.b * coeffs.b + (1 - color.b) * (1.0 - coeffs.b),
      color.a);

    textureStore(output_texture, vec2i(global_id.xy), inverse);
}
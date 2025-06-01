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
    let coords = vec2i(global_id.xy);

    let coef = coeffs;

    if(u32(global_id.x) >= dimensions.x || u32(global_id.y) >= dimensions.y) {
      return;
    }

    let x = dimensions.x % 4;
	let y = dimensions.y % 4;
    let dithering_size = 16.0;
    // let indexMatrix4x4 = array<i32, 16>(
	// 	-4, 0, -3, 1,
	// 	2, -2, 3, -1,
	// 	-3, 1, -4, 0,
	// 	3, -1, 2, -2
    // );

    let indexMatrix4x4 = array<i32, 16>(
        0,  8,  2,  10,
        12, 4,  14, 6,
        3,  11, 1,  9,
        15, 7,  13, 5
    );

    var color = textureLoad(input_texture, vec2i(global_id.xy), 0);
    var closestColor = (color.r + color.g + color.b) / 3.0;
    if closestColor > 0.5 {
        closestColor = 1.0;
    } else {
        closestColor = 0.0;
    }

    let secondClosestColor = 1.0 - closestColor;

    // let x = i32(mod(coords.x, 4));
    // let y = i32(mod(coords.y, 4));
    let d = f32(indexMatrix4x4[(x + y * 4)]) / dithering_size;
    let distance = abs(closestColor - color);

    var qqq = 0.0;
    let dd = (color.r + color.g + color.b) / 3.0;
    if (dd > d) {
        qqq = closestColor;
    } else {
        qqq = secondClosestColor;
    } 
    // color = (color > 0.5) ? 0 : 1;


    // color += f32(pattern[y * 4 + x]*dithering_size) / 255.0;
    // let inverse = vec4f(
    //   color.r * coeffs.r + (1 - color.r) * (1.0 - coeffs.r),
    //   color.g * coeffs.g + (1 - color.g) * (1.0 - coeffs.g),
    //   color.b * coeffs.b + (1 - color.b) * (1.0 - coeffs.b),
    //   color.a);

    textureStore(output_texture, vec2i(global_id.xy), vec4f(qqq, qqq, qqq, 1.0));
}


// fn indexValue(coords: vec2i) {
//     let x = i32(mod(coords.x, 4));
//     let y = i32(mod(coords.y, 4));
//     return indexMatrix4x4[(x + y * 4)] / 16.0;
// }

// dither(color: vec3f, closestColor: f32, coords: vec2i) {
//     // let closestColor = (color < 0.5) ? 0 : 1;
//     let secondClosestColor = 1.0 - closestColor;
//     let d = indexValue(coords);
//     let distance = abs(closestColor - color);
//     return (distance < d) ? closestColor : secondClosestColor;
// }
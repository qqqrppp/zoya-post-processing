// https://www.johndcook.com/blog/2009/08/24/algorithms-convert-color-grayscale/
// https://docs.gimp.org/2.6/en/gimp-tool-desaturate.html
//
// RGBA color to RGBA greyscale
//
// smooth transition based on u_colorFactor: 0.0 = original, 1.0 = greyscale
//
// http://www.johndcook.com/blog/2009/08/24/algorithms-convert-color-grayscale/
// "The luminosity method is a more sophisticated version of the average method.
// It also averages the values, but it forms a weighted average to account for human perception.
// We’re more sensitive to green than other colors, so green is weighted most heavily. The formula
// for luminosity is 0.21 R + 0.72 G + 0.07 B."

const LIGHTNESS: u32    = 0;
const AVERAGE: u32      = 1;
const LUMINOCITY: u32   = 2;

const R = 0.21;
const G = 0.72;
const B = 0.07;

struct Color {
    r: f32,
    g: f32,
    b: f32,
}

@group(0) @binding(0) var<uniform> variant : u32; // 0 - lightness, 1 - average, 2 - luminosity
@group(0) @binding(1) var<uniform> factor : Color;
@group(0) @binding(2) var<uniform> coeffs : Color;


@group(1) @binding(0) var input_texture : texture_2d<f32>;
@group(1) @binding(1) var output_texture : texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(16, 16)
fn main(
    @builtin(global_invocation_id) global_id: vec3u,
) {
    let dimensions = textureDimensions(input_texture);
    if u32(global_id.x) >= dimensions.x || u32(global_id.y) >= dimensions.y {
        return;
    }

    let color = textureLoad(input_texture, vec2i(global_id.xy), 0);

    var gray: f32;

    switch variant {
        case LIGHTNESS, default {
            gray = (max(max(color.r, color.g), color.b) + min(min(color.r, color.g), color.b)) / 2;
            break;
        }
        case AVERAGE: {
            gray = (color.r + color.g + color.b) / 3;
            break;
        }
        case LUMINOCITY: {
            gray =  factor.r * color.r + factor.g * color.g + factor.b * color.b;
            break;
        }
    }

    let grayscale = vec4(
        color.r * coeffs.r + gray * (1.0 - coeffs.r),
        color.g * coeffs.g + gray * (1.0 - coeffs.g),
        color.b * coeffs.b + gray * (1.0 - coeffs.b),
        color.a
    );

    textureStore(output_texture, vec2i(global_id.xy), vec4f(grayscale));
}

// a simple matrix convolution algorithm

struct Position {
    x: i32,
    y: i32
}

struct Color {
    r: u32,
    g: u32,
    b: u32,
}

@group(0) @binding(0) var<uniform> size : Position;
@group(0) @binding(1) var<uniform> use_color : Color;
@group(0) @binding(2) var<uniform> matrix : mat3x3f;

@group(1) @binding(0) var inputTexture : texture_2d<f32>;
@group(1) @binding(1) var outputTexture : texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(16, 16)
fn main(
    @builtin(global_invocation_id) global_id : vec3u
) {
    let dimensions = vec2i(textureDimensions(inputTexture, 0));
    let coords = vec2i(global_id.xy);

    var color = vec4f(0.0);
    for (var i: i32 = -size.y; i <= size.y; i +=  size.y) {
        for (var j: i32 = -size.x; j <= size.x; j +=  size.x) {
            var pixelX: i32 = j;
            var pixelY: i32 = i;

            // use mirroring for edges
            if coords.x + pixelX <= 0
            || coords.x + pixelX >= dimensions.x {
                pixelX = -pixelX;
            }

            if coords.y + pixelY <= 0
            || coords.y + pixelY >= dimensions.y {
                pixelY = -pixelY;
            }

            let sampleCoords = coords + vec2i(pixelX, pixelY);
            let sampleColor = vec4f(textureLoad(inputTexture, sampleCoords, 0));

            let y = u32((i + size.y) / size.y);
            let x = u32((j + size.x) / size.x);

            color += sampleColor * matrix[y][x];

            if use_color.r == 0 {
                color.r = 0;
            } else if use_color.r == 1 {
                color.r = sampleColor.r;
            }

            if use_color.g == 0 {
                color.g = 0;
            } else if use_color.g == 1 {
                color.g = sampleColor.g;
            }

            if use_color.b == 0 {
                color.b = 0;
            } else if use_color.b == 1 {
                color.b = sampleColor.b;
            }

            // exit size 0
            if size.x == 0 {
                break;
            }
        }

        if size.y == 0 {
            break;
        }
    }

    textureStore(outputTexture, coords, color);
}

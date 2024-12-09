@group(0) @binding(0) var<uniform> pixelSize : i32;
// @group(0) @binding(0) var<uniform> resolution : vec2<f32>;

@group(1) @binding(0) var inputTexture : texture_2d<f32>;
@group(1) @binding(1) var outputTexture : texture_storage_2d<rgba8unorm, write>;

const kernel = mat3x3f(
    vec3f(0.0, -1.0, 0.0),
    vec3f(-1.0, 5.0, -1.0),
    vec3f(0.0, -1.0, 0.0)
);

const primary = mat3x3f(
    vec3f(1.0, 1.0, 1.0),
    vec3f(1.0, 1.0, 1.0),
    vec3f(1.0, 1.0, 1.0)
);

@compute @workgroup_size(16, 16)
fn main(
    @builtin(global_invocation_id) global_id : vec3u
) {
    let x = pixelSize;
    let dimensions = textureDimensions(inputTexture, 0);
    let coords = vec2i(global_id.xy);

    let ss: i32 = pixelSize;
    // let kernelSize = kernel.length();

    // if u32(global_id.x) >= dimensions.x || u32(global_id.y) >= dimensions.y {
    //     return;
    // }
    // if ss <= 0
    //     || coords.x <= ss 
    //     || coords.y <= ss 
    //     || coords.x >= i32(dimensions.x) - ss 
    //     || coords.y >= i32(dimensions.y) - ss
    // {
    //     // textureStore(outputTexture, coords);
    //     textureStore(outputTexture, coords, textureLoad(inputTexture, coords, 0));
    //     return;
    // }


    // if (coords.x >= ss && coords.x < i32(dimensions.x) - ss && coords.y >= ss && coords.y < i32(dimensions.y) - ss) {
        var color = vec4f(0.0);


        for (var i: i32 = -ss; i <= ss; i = i + ss) {
            for (var j: i32 = -ss; j <= ss; j = j + ss) {
                // var x = i;
                // if (coords.x >= i32(dimensions.x) - ss) {
                //     x = 0;
                // }

                // var y = 0;
                // if (coords.y >= i32(dimensions.y) - ss) {
                //     y = j;
                // }
                
                let sampleCoords = coords + vec2i(i, j);
                let sampleColor = textureLoad(inputTexture, sampleCoords, 0);
                if (
                    coords.x <= ss 
                    || coords.y <= ss 
                    || coords.x >= i32(dimensions.x) - ss 
                    || coords.y >= i32(dimensions.y) - ss
                ) {
                    color = textureLoad(inputTexture, coords + vec2i(-ss, -ss), 0);
                } else {
                    color += sampleColor * kernel[i + 1][j + 1];
                }
            }
        }

        textureStore(outputTexture, coords, color);
    // }
}
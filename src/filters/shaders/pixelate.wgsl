// pixelate.wgsl
@group(0) @binding(0) var<uniform> pixelSize : i32;
// @group(0) @binding(0) var<uniform> resolution : vec2<f32>;

@group(1) @binding(0) var inputTexture : texture_2d<f32>;
@group(1) @binding(1) var outputTexture : texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(16, 16)
fn main(
    @builtin(global_invocation_id) global_id : vec3u
) {
    let dimension = textureDimensions(inputTexture, 0);

    if u32(global_id.x) >= dimension.x || u32(global_id.y) >= dimension.y {
        // todo это нужно будет если картинка будет не квадратная 
        return;
    }

    // let uv = vec2f(global_id.xy) / vec2f(dimension); 

    // let size = 1.0 / f32(pixelSize);
    // let pixelatedUV = floor(uv / size) * size;

    // let color = textureLoad(inputTexture, vec2i(pixelatedUV * vec2f(dimension)), 0);
    // textureStore(outputTexture, vec2i(global_id.xy), color);
    
    let coords = vec2i(global_id.xy);
    var color = vec4f(0.0);

//    for (var i: i32 = 0; i < pixelSize; i += 1) {
//         for (var j: i32 = 0; j < pixelSize; j += 1) {
            let pixelX = coords.x / pixelSize * pixelSize + pixelSize / 2;
            let pixelY = coords.y / pixelSize * pixelSize + pixelSize / 2;
            // let sampleCoords = coords + vec2i(pixelX, pixelY);
            let sampleCoords = vec2i(pixelX, pixelY);

            let sampleColor = vec4f(textureLoad(inputTexture, sampleCoords, 0));

            color = sampleColor;
    //     }
    // }

    // color = color / f32(pixelSize * pixelSize);

    // let color = textureLoad(inputTexture, vec2i(global_id.xy), 0)
    textureStore(outputTexture, coords, color);
}
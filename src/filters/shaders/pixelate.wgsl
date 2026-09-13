struct Params {
    pixelSize: i32,
    variant: i32,
}

@group(0) @binding(0) var<uniform> params : Params;

@group(1) @binding(0) var inputTexture : texture_2d<f32>;
@group(1) @binding(1) var outputTexture : texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(16, 16)
fn main(
    @builtin(global_invocation_id) global_id : vec3u
) {
    let dimension = vec2i(textureDimensions(inputTexture, 0));
    let coords = vec2i(global_id.xy);

    if coords.x >= dimension.x || coords.y >= dimension.y {
        return;
    }

    let pixelSize = params.pixelSize;
    let variant = params.variant;

    if pixelSize <= 1 {
        let color = textureLoad(inputTexture, coords, 0);
        textureStore(outputTexture, coords, color);
        return;
    }

    var color = vec4f(0.0);

    if variant == 0 {
        // Standard / Nearest Neighbor Center-Sampling
        let pixelX = coords.x / pixelSize * pixelSize + pixelSize / 2;
        let pixelY = coords.y / pixelSize * pixelSize + pixelSize / 2;
        let sampleCoords = clamp(vec2i(pixelX, pixelY), vec2i(0), dimension - vec2i(1));
        color = textureLoad(inputTexture, sampleCoords, 0);

    } else if variant == 1 {
        // Average (Box-Filter)
        let blockX = (coords.x / pixelSize) * pixelSize;
        let blockY = (coords.y / pixelSize) * pixelSize;
        var sumColor = vec4f(0.0);
        var sampleCount = 0.0;

        for (var dy: i32 = 0; dy < pixelSize; dy += 1) {
            for (var dx: i32 = 0; dx < pixelSize; dx += 1) {
                let sampleCoords = vec2i(blockX + dx, blockY + dy);
                if sampleCoords.x < dimension.x && sampleCoords.y < dimension.y {
                    sumColor += textureLoad(inputTexture, sampleCoords, 0);
                    sampleCount += 1.0;
                }
            }
        }
        color = sumColor / sampleCount;

    } else if variant == 2 {
        // Retro Grid
        let blockX = (coords.x / pixelSize) * pixelSize;
        let blockY = (coords.y / pixelSize) * pixelSize;
        let localX = coords.x % pixelSize;
        let localY = coords.y % pixelSize;

        let centerX = blockX + pixelSize / 2;
        let centerY = blockY + pixelSize / 2;
        let sampleCoords = clamp(vec2i(centerX, centerY), vec2i(0), dimension - vec2i(1));
        color = textureLoad(inputTexture, sampleCoords, 0);

        let isBorder = (localX == 0) || (localY == 0);
        if isBorder && pixelSize > 2 {
            color = vec4f(color.rgb * 0.7, color.a);
        }

    } else if variant == 3 {
        // LED Dot Matrix
        let blockX = (coords.x / pixelSize) * pixelSize;
        let blockY = (coords.y / pixelSize) * pixelSize;

        let centerX = f32(blockX) + f32(pixelSize) * 0.5;
        let centerY = f32(blockY) + f32(pixelSize) * 0.5;
        let dist = distance(vec2f(coords), vec2f(centerX, centerY));

        let maxRadius = f32(pixelSize) * 0.5;

        let centerCoords = clamp(vec2i(i32(centerX), i32(centerY)), vec2i(0), dimension - vec2i(1));
        let centerColor = textureLoad(inputTexture, centerCoords, 0);

        let edgeWidth = 1.0;
        let t = smoothstep(maxRadius, maxRadius - edgeWidth, dist);

        let backgroundColor = vec4f(0.0, 0.0, 0.0, 1.0);
        color = mix(backgroundColor, centerColor, t);
    }

    textureStore(outputTexture, coords, color);
}

// свертка матриц

struct Params {
    x: i32,
    y: i32
}

struct Color {
    r: f32,
    g: f32,
    b: f32,
}
@group(0) @binding(0) var<uniform> size : Params;
@group(0) @binding(1) var<uniform> coeffs : Color;
// const coeffs = Color(1,1,1);


@group(1) @binding(0) var inputTexture : texture_2d<f32>;
@group(1) @binding(1) var outputTexture : texture_storage_2d<rgba8unorm, write>;


// сдвиг
// const matrix = mat3x3f(
//     vec3f( 0, 0, 0),
//     vec3f(-1, 1, 0),
//     vec3f( 0, 0, 0)
// );

// теснение
// const matrix = mat3x3f(
//     vec3f(-2.0, -1.0, 0.0),
//     vec3f(-1.0, 1.0, 1.0),
//     vec3f(0.0, 1.0, 2.0)
// );

// резкость
const matrix = mat3x3f(
    vec3f(0.0, -1.0, 0.0),
    vec3f(-1.0, 5, -1.0),
    vec3f(0.0, -1.0, 0.0)
);

//  слепок
// const matrix = mat3x3f(
//     vec3f(-1, -1, -1),
//     vec3f(-1,  8, -1),
//     vec3f(-1, -1, -1)
// );

// gausian
// const matrix = mat3x3f(
//     vec3f(1.0 / 16.0, 2.0 / 16.0, 1.0 / 16.0),
//     vec3f(2.0 / 16.0, 4.0 / 16.0, 2.0 / 16.0),
//     vec3f(1.0 / 16.0, 2.0 / 16.0, 1.0 / 16.0)
// );

// @ group(0) @binding(2) var<uniform> matrix2d : mat3x3<f32>;
// @ group(0) @binding(2) var<uniform> matrix2d : mat3x3<f32>;

@compute @workgroup_size(16, 16)
fn main(
    @builtin(global_invocation_id) global_id : vec3u
) {
    let dimensions = textureDimensions(inputTexture, 0);
    let coords = vec2i(global_id.xy);

    // let a = matrix2d;
    // let b = size;
    let c = coeffs;

    if u32(global_id.x) >= dimensions.x - u32(size.x) 
    || u32(global_id.y) >= dimensions.y - u32(size.y)
    || u32(global_id.x) <= u32(size.x)
    || u32(global_id.y) <= u32(size.y) 
    {
        // textureStore(outputTexture, coords, vec4f(coeffs.r, coeffs.g, coeffs.b, 1));

        // return;
    }

    // var color = textureLoad(inputTexture, coords, 0);
    var color = vec4f(0.0);
    for (var i: i32 = -size.y; i <= size.y; i +=  size.y) {
        for (var j: i32 = -size.x; j <= size.x; j +=  size.x) {
            var pixelX: i32 = i;
            var pixelY: i32 = j;

            // use mirroring for edges
            if coords.x + pixelX <= 0
            || coords.x + pixelX >= i32(dimensions.x) {
                pixelX = -pixelX;
            }

            if coords.y + pixelY <= 0
            || coords.y + pixelY >= i32(dimensions.y) {
                pixelY = -pixelY;
            }

            let sampleCoords = coords + vec2i(pixelX, pixelY);
            let sampleColor = vec4f(textureLoad(inputTexture, sampleCoords, 0));
           
            let x = u32((i + size.x) / size.x);
            let y = u32((j + size.y) / size.y);
            
            // pow
            // color.r = color.r * coeffs.r + sampleColor.r * pow(matrix[y][x], coeffs.r);
            // color.g = color.g * coeffs.r + sampleColor.g * pow(matrix[y][x], coeffs.r);
            // color.b = color.b * coeffs.r + sampleColor.b * pow(matrix[y][x], coeffs.r);

            // color += sampleColor * matrix[y][x];//, coeffs.r);

            color.r = color.r + sampleColor.r * matrix[y][x] * coeffs.r;//, coeffs.r);
            color.g = color.g + sampleColor.g * matrix[y][x] * coeffs.g;//, coeffs.g);
            color.b = color.b + sampleColor.b * matrix[y][x] * coeffs.b;//, coeffs.b);

            // color.r = color.r * coeffs.r + (sampleColor.r * matrix[y][x]) * (1 - coeffs.r);
            // color.g = color.g * coeffs.g + (sampleColor.g * matrix[y][x]) * (1 - coeffs.g);
            // color.b = color.b * coeffs.b + (sampleColor.b * matrix[y][x]) * (1 - coeffs.b);

            color.a = sampleColor.a;
        }
    }

    textureStore(outputTexture, coords, color);
}
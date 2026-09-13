struct Params {
    direction: vec2f,
    radius: i32,
    _padding: f32, // выравнивание до 16 байт
}

@group(0) @binding(0) var samp : sampler;
@group(0) @binding(1) var<uniform> params : Params;

@group(1) @binding(0) var inputTexture : texture_2d<f32>;
@group(1) @binding(1) var outputTexture : texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(16, 16)
fn main(
    @builtin(global_invocation_id) global_id : vec3u
) {
    let dimensions = vec2i(textureDimensions(inputTexture, 0));
    let coords = vec2i(global_id.xy);

    // Выход за границы текстуры
    if (coords.x >= dimensions.x || coords.y >= dimensions.y) {
        return;
    }

    let r = params.radius;
    if (r <= 0) {
        let color = textureLoad(inputTexture, coords, 0);
        textureStore(outputTexture, coords, color);
        return;
    }

    // Сигма (стандартное отклонение)
    let sigma = f32(r) / 2.0;
    let two_sigma_sq = 2.0 * sigma * sigma;

    var sum_color = vec3f(0.0);
    var sum_weight = 0.0;

    // Нормализованные UV координаты центра пикселя
    let uv = (vec2f(coords) + vec2f(0.5)) / vec2f(dimensions);
    // Шаг сдвига в UV координатах
    let step = params.direction / vec2f(dimensions);

    // Свертка по Гауссу
    for (var i = -r; i <= r; i++) {
        let weight = exp(-f32(i * i) / two_sigma_sq);
        let sample_uv = uv + f32(i) * step;

        // Используем textureSampleLevel для выборки со встроенным сглаживанием границ
        let sample_color = textureSampleLevel(inputTexture, samp, sample_uv, 0.0).rgb;

        sum_color += sample_color * weight;
        sum_weight += weight;
    }

    // Сохраняем оригинальную прозрачность
    let original_alpha = textureLoad(inputTexture, coords, 0).a;
    let final_color = vec4f(sum_color / sum_weight, original_alpha);

    textureStore(outputTexture, coords, final_color);
}

struct Params {
    radius: f32,
    variant: f32,
    hardness: f32,
    stretching: f32,
    opacity: f32,
}

@group(0) @binding(0) var<uniform> params : Params;

@group(1) @binding(0) var inputTexture : texture_2d<f32>;
@group(1) @binding(1) var outputTexture : texture_storage_2d<rgba8unorm, write>;

const PI: f32 = 3.14159265359;

// Вспомогательная функция вычисления тензора структуры изображения для Anisotropic
fn get_structure_tensor(pos: vec2i, dim: vec2i) -> vec3f {
    var sumE = 0.0;
    var sumG = 0.0;
    var sumF = 0.0;
    
    // Усредняем градиенты в окне 5x5 для стабильности контуров
    for (var y = -2; y <= 2; y = y + 1) {
        for (var x = -2; x <= 2; x = x + 1) {
            let samplePos = clamp(pos + vec2i(x, y), vec2i(0), dim - vec2i(1));
            
            // Быстрые центральные разности по яркости пикселей
            let left  = clamp(samplePos + vec2i(-1, 0), vec2i(0), dim - vec2i(1));
            let right = clamp(samplePos + vec2i(1, 0), vec2i(0), dim - vec2i(1));
            let top   = clamp(samplePos + vec2i(0, -1), vec2i(0), dim - vec2i(1));
            let bot   = clamp(samplePos + vec2i(0, 1), vec2i(0), dim - vec2i(1));
            
            let c_l = dot(textureLoad(inputTexture, left, 0).rgb, vec3f(0.299, 0.587, 0.114));
            let c_r = dot(textureLoad(inputTexture, right, 0).rgb, vec3f(0.299, 0.587, 0.114));
            let c_t = dot(textureLoad(inputTexture, top, 0).rgb, vec3f(0.299, 0.587, 0.114));
            let c_b = dot(textureLoad(inputTexture, bot, 0).rgb, vec3f(0.299, 0.587, 0.114));
            
            let Ix = (c_r - c_l) * 0.5;
            let Iy = (c_b - c_t) * 0.5;
            
            sumE += Ix * Ix;
            sumG += Iy * Iy;
            sumF += Ix * Iy;
        }
    }
    
    return vec3f(sumE / 25.0, sumG / 25.0, sumF / 25.0);
}

@compute @workgroup_size(16, 16)
fn main(
    @builtin(global_invocation_id) global_id : vec3u
) {
    let dimension = vec2i(textureDimensions(inputTexture, 0));
    let coords = vec2i(global_id.xy);

    if coords.x >= dimension.x || coords.y >= dimension.y {
        return;
    }

    let R = i32(params.radius);
    let variant = i32(params.variant);

    let original_pixel = textureLoad(inputTexture, coords, 0);

    if R <= 0 {
        textureStore(outputTexture, coords, original_pixel);
        return;
    }

    let alpha_channels = original_pixel.a;

    // ==========================================
    // 1. CLASSIC KUWAHARA
    // ==========================================
    if variant == 0 {
        let n = f32((R + 1) * (R + 1));
        var mean = array<vec3f, 4>(vec3f(0.0), vec3f(0.0), vec3f(0.0), vec3f(0.0));
        var variance = array<vec3f, 4>(vec3f(0.0), vec3f(0.0), vec3f(0.0), vec3f(0.0));

        let ranges = array<vec4i, 4>(
            vec4i(-R, 0, -R, 0), // Q1: top-left
            vec4i(0, R, -R, 0),  // Q2: top-right
            vec4i(-R, 0, 0, R),  // Q3: bottom-left
            vec4i(0, R, 0, R)    // Q4: bottom-right
        );

        for (var k: u32 = 0u; k < 4u; k = k + 1u) {
            let r = ranges[k];
            var sum = vec3f(0.0);
            var sumSq = vec3f(0.0);

            for (var y = r.z; y <= r.w; y = y + 1) {
                for (var x = r.x; x <= r.y; x = x + 1) {
                    let sampleCoords = clamp(coords + vec2i(x, y), vec2i(0), dimension - vec2i(1));
                    let color_val = textureLoad(inputTexture, sampleCoords, 0).rgb;
                    
                    sum += color_val;
                    sumSq += color_val * color_val;
                }
            }

            mean[k] = sum / n;
            variance[k] = abs((sumSq / n) - (mean[k] * mean[k]));
        }

        var minVariance = 999999.0;
        var bestIndex = 0u;

        for (var k: u32 = 0u; k < 4u; k = k + 1u) {
            let v = variance[k].r + variance[k].g + variance[k].b;
            if v < minVariance {
                minVariance = v;
                bestIndex = k;
            }
        }

        let paint_color = vec4f(mean[bestIndex], alpha_channels);
        let final_color = mix(original_pixel, paint_color, params.opacity);
        textureStore(outputTexture, coords, final_color);
        return;
    }

    // ==========================================
    // 2. GENERALIZED OR 3. ANISOTROPIC KUWAHARA
    // ==========================================
    // Общие структуры данных для взвешенного сглаживания по секторам (8 секторов)
    var sum_w = array<f32, 8>(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
    var sum_c = array<vec3f, 8>(vec3f(0.0), vec3f(0.0), vec3f(0.0), vec3f(0.0), vec3f(0.0), vec3f(0.0), vec3f(0.0), vec3f(0.0));
    var sum_sqc = array<vec3f, 8>(vec3f(0.0), vec3f(0.0), vec3f(0.0), vec3f(0.0), vec3f(0.0), vec3f(0.0), vec3f(0.0), vec3f(0.0));

    // Параметры анизотропного эллипса
    var cosT = 1.0;
    var sinT = 0.0;
    var stretch = 1.0; // s-параметр

    if variant == 2 {
        // Рассчитываем параметры эллипса на основе тензора структуры
        let tensor = get_structure_tensor(coords, dimension);
        let E = tensor.x;
        let G = tensor.y;
        let F = tensor.z;
        
        let theta = 0.5 * atan2(2.0 * F, E - G);
        cosT = cos(theta);
        sinT = sin(theta);
        
        let eigen_diff = sqrt((E - G) * (E - G) + 4.0 * F * F);
        let lambda1 = (E + G + eigen_diff) * 0.5;
        let lambda2 = (E + G - eigen_diff) * 0.5;
        
        let anisotropy = clamp((lambda1 - lambda2) / (lambda1 + lambda2 + 1e-5), 0.0, 1.0);
        
        // Значение stretching регулирует силу деформации эллипса
        let alpha = 2.0 - clamp(params.stretching, 0.0, 1.9);
        stretch = alpha / (alpha + anisotropy);
    }

    // Сигма для радиального гауссовского затухания
    let sigma = f32(R) * 0.5;
    let zeta = 1.0 / (2.0 * sigma * sigma);

    // Центральные углы для 8 секторов
    let sector_angles = array<f32, 8>(
        0.0, 0.25 * PI, 0.5 * PI, 0.75 * PI,
        PI, 1.25 * PI, 1.5 * PI, 1.75 * PI
    );

    // Проходим по окрестности
    for (var dy = -R; dy <= R; dy = dy + 1) {
        for (var dx = -R; dx <= R; dx = dx + 1) {
            // Деформируем координаты для Anisotropic, либо оставляем исходными для Generalized
            var rx = f32(dx);
            var ry = f32(dy);
            
            if variant == 2 {
                // Преобразование координат в систему координат эллипса
                rx = (f32(dx) * cosT + f32(dy) * sinT) / stretch;
                ry = (-f32(dx) * sinT + f32(dy) * cosT) * stretch;
            }

            let dist_sq = rx * rx + ry * ry;
            let r = sqrt(dist_sq);

            if r > f32(R) + 0.1 {
                continue;
            }

            let sampleCoords = clamp(coords + vec2i(dx, dy), vec2i(0), dimension - vec2i(1));
            let color_val = textureLoad(inputTexture, sampleCoords, 0).rgb;

            // Радиальный вес (Гауссиан)
            let radial_w = exp(-dist_sq * zeta);

            // Угол вектора
            var phi = atan2(ry, rx);
            if phi < 0.0 {
                phi += 2.0 * PI;
            }

            // Рассчитываем веса для каждого из 8 секторов
            // Угловой вес: cos(phi - alpha_k)^hardness для регулировки жесткости кисти
            for (var k = 0; k < 8; k = k + 1) {
                let diff = phi - sector_angles[k];
                let cos_diff = max(0.0, cos(diff));
                let angular_w = pow(cos_diff, params.hardness);

                let w = radial_w * angular_w;

                sum_w[k] += w;
                sum_c[k] += color_val * w;
                sum_sqc[k] += color_val * color_val * w;
            }
        }
    }

    var minVariance = 999999.0;
    var bestIndex = 0;
    var final_mean = vec3f(0.0);

    for (var k = 0; k < 8; k = k + 1) {
        let w = sum_w[k];
        if w > 1e-5 {
            let mean = sum_c[k] / w;
            let variance_vec = abs((sum_sqc[k] / w) - (mean * mean));
            let v = variance_vec.r + variance_vec.g + variance_vec.b;
            
            if v < minVariance {
                minVariance = v;
                bestIndex = k;
                final_mean = mean;
            }
        }
    }

    var paint_color = original_pixel;

    if minVariance < 999998.0 {
        paint_color = vec4f(final_mean, alpha_channels);
    }

    // Смешиваем результат живописи с оригиналом по коэффициенту opacity
    let final_color = mix(original_pixel, paint_color, params.opacity);
    textureStore(outputTexture, coords, final_color);
}

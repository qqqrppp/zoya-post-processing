struct Params {
    variant: f32,           // 0 = Standard RGB, 1 = HSV, 2 = Oklab, 3 = Adaptive
    levelR: f32,            // Уровни R / Hue / Lightness
    levelG: f32,            // Уровни G / Saturation / Chroma A
    levelB: f32,            // Уровни B / Value / Chroma B
    detailThreshold: f32,   // Порог детализации для adaptive режима (0.0 - 1.0)
}

@group(0) @binding(0) var<uniform> params : Params;

@group(1) @binding(0) var inputTexture : texture_2d<f32>;
@group(1) @binding(1) var outputTexture : texture_storage_2d<rgba8unorm, write>;

// ---------- Цветовые конвертации ----------

fn rgb_to_hsv(c: vec3f) -> vec3f {
    let K = vec4f(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    let p = mix(vec4f(c.bg, K.wz), vec4f(c.gb, K.xy), step(c.b, c.g));
    let q = mix(vec4f(p.xyw, c.r), vec4f(c.r, p.yzx), step(p.x, c.r));

    let d = q.x - min(q.w, q.y);
    let e = 1.0e-10;
    return vec3f(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

fn hsv_to_rgb(c: vec3f) -> vec3f {
    let K = vec4f(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    let p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, vec3f(0.0), vec3f(1.0)), c.y);
}

// RGB to Oklab conversion
fn rgb_to_oklab(c: vec3f) -> vec3f {
    // Linear sRGB to OKLab
    let l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
    let m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
    let s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
    
    let l_ = pow(max(l, 0.0), 1.0 / 3.0);
    let m_ = pow(max(m, 0.0), 1.0 / 3.0);
    let s_ = pow(max(s, 0.0), 1.0 / 3.0);
    
    return vec3f(
        0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    );
}

fn oklab_to_rgb(c: vec3f) -> vec3f {
    let l_ = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
    let m_ = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
    let s_ = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
    
    let l = l_ * l_ * l_;
    let m = m_ * m_ * m_;
    let s = s_ * s_ * s_;
    
    return vec3f(
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    );
}

// ---------- Утилиты ----------

// Вычисление локального контраста/детализации
fn compute_detail(coords: vec2i) -> f32 {
    let size = vec2i(textureDimensions(inputTexture));
    let maxC = size - vec2i(1);

    // Сэмплим соседние пиксели (с clamp по границам)
    let left = textureLoad(inputTexture, clamp(coords + vec2i(-1, 0), vec2i(0), maxC), 0).rgb;
    let right = textureLoad(inputTexture, clamp(coords + vec2i(1, 0), vec2i(0), maxC), 0).rgb;
    let top = textureLoad(inputTexture, clamp(coords + vec2i(0, -1), vec2i(0), maxC), 0).rgb;
    let bottom = textureLoad(inputTexture, clamp(coords + vec2i(0, 1), vec2i(0), maxC), 0).rgb;
    
    // Градиент как мера детализации
    let grad_x = distance(left, right);
    let grad_y = distance(top, bottom);
    let gradient = sqrt(grad_x * grad_x + grad_y * grad_y);
    
    // Нормализуем в диапазон 0-1
    return clamp(gradient * 2.0, 0.0, 1.0);
}

// ---------- Main shader ----------

@compute @workgroup_size(16, 16)
fn main(
    @builtin(global_invocation_id) id: vec3<u32>
) {
    let texSize = textureDimensions(inputTexture);
    if id.x >= texSize.x || id.y >= texSize.y { 
        return; 
    }

    let coords = vec2i(id.xy);
    let color = textureLoad(inputTexture, coords, 0);
    
    let variant = i32(params.variant);
    var posterized = color.rgb;

    if variant == 0 {
        // Standard RGB Posterization
        posterized = vec3f(
            floor(color.r * params.levelR + 0.5) / params.levelR,
            floor(color.g * params.levelG + 0.5) / params.levelG,
            floor(color.b * params.levelB + 0.5) / params.levelB
        );
        
    } else if variant == 1 {
        // HSV Posterization
        var hsv = rgb_to_hsv(color.rgb);
        
        hsv.x = floor(hsv.x * params.levelR + 0.5) / params.levelR;
        hsv.y = floor(hsv.y * params.levelG + 0.5) / params.levelG;
        
        if params.levelB > 0.0 {
            hsv.z = floor(hsv.z * params.levelB + 0.5) / params.levelB;
        }

        posterized = hsv_to_rgb(hsv);
        
    } else if variant == 2 {
        // Oklab Posterization (perceptually uniform)
        var oklab = rgb_to_oklab(color.rgb);
        
        // a и b лежат примерно в [-0.4, 0.4] - нормируем в [0, 1] перед квантованием
        let ab = oklab.yz * 1.25 + vec2f(0.5);

        let q_l = floor(oklab.x * params.levelR + 0.5) / params.levelR;
        let q_a = floor(ab.x * params.levelG + 0.5) / params.levelG;
        let q_b = floor(ab.y * params.levelB + 0.5) / params.levelB;

        let result = vec3f(q_l, (q_a - 0.5) / 1.25, (q_b - 0.5) / 1.25);
        posterized = clamp(oklab_to_rgb(result), vec3f(0.0), vec3f(1.0));
        
    } else if variant == 3 {
        // Adaptive Posterization with detail preservation
        let detail = compute_detail(coords);

        // Высокая детализация = больше уровней (детали сохраняются)
        // Плоские области = базовое число уровней (сильная постеризация)
        // detailThreshold - при каком контрасте области считаются детальными
        let t = smoothstep(0.0, max(params.detailThreshold, 0.001), detail);

        let adaptive_level_r = mix(params.levelR, params.levelR * 3.0, t);
        let adaptive_level_g = mix(params.levelG, params.levelG * 3.0, t);
        let adaptive_level_b = mix(params.levelB, params.levelB * 3.0, t);
        
        posterized = vec3f(
            floor(color.r * adaptive_level_r + 0.5) / adaptive_level_r,
            floor(color.g * adaptive_level_g + 0.5) / adaptive_level_g,
            floor(color.b * adaptive_level_b + 0.5) / adaptive_level_b
        );
    }


    textureStore(outputTexture, coords, vec4f(posterized, color.a));
}

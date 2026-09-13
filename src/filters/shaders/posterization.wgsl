struct Params {
    variant: f32,   // 0 = Standard RGB, 1 = HSV, 2 = Palette Mapping
    levelR: f32,    // Уровни R / Hue / Сила дизеринга палитры
    levelG: f32,    // Уровни G / Saturation / Прозрачность палитры
    levelB: f32,    // Уровни B / Value
    palette: f32,   // Выбранная палитра (0..5)
}

@group(0) @binding(0) var<uniform> params : Params;

@group(1) @binding(0) var inputTexture : texture_2d<f32>;
@group(1) @binding(1) var outputTexture : texture_storage_2d<rgba8unorm, write>;

// Константы ретро-палитр (все выровнены ровно до 8 цветов для простоты сэмплирования)
const PALETTES = array<array<vec3f, 8>, 6>(
    // 0. GameBoy Classic (зеленый монохром)
    array<vec3f, 8>(
        vec3f(0.058, 0.219, 0.058), vec3f(0.058, 0.219, 0.058),
        vec3f(0.188, 0.384, 0.188), vec3f(0.188, 0.384, 0.188),
        vec3f(0.545, 0.674, 0.058), vec3f(0.545, 0.674, 0.058),
        vec3f(0.607, 0.737, 0.058), vec3f(0.607, 0.737, 0.058)
    ),
    // 1. CGA Mode 4 (Черный, Голубой, Пурпурный, Белый)
    array<vec3f, 8>(
        vec3f(0.0, 0.0, 0.0), vec3f(0.0, 0.0, 0.0),
        vec3f(0.0, 1.0, 1.0), vec3f(0.0, 1.0, 1.0),
        vec3f(1.0, 0.0, 1.0), vec3f(1.0, 0.0, 1.0),
        vec3f(1.0, 1.0, 1.0), vec3f(1.0, 1.0, 1.0)
    ),
    // 2. Cyberpunk Neon
    array<vec3f, 8>(
        vec3f(0.05, 0.0, 0.1), // Тёмно-фиолетовый
        vec3f(1.0, 0.0, 0.5),  // Розовый неон
        vec3f(0.0, 1.0, 1.0),  // Голубой неон
        vec3f(0.5, 0.0, 1.0),  // Фиолетовый неон
        vec3f(1.0, 0.9, 0.0),  // Желтый неон
        vec3f(0.0, 0.1, 0.5),  // Синий
        vec3f(1.0, 0.4, 0.0),  // Оранжевый
        vec3f(0.9, 0.9, 0.9)   // Светло-серый
    ),
    // 3. Retro Sunset (Закат)
    array<vec3f, 8>(
        vec3f(0.1, 0.0, 0.2), // Тёмная ночь
        vec3f(0.3, 0.0, 0.3), // Сумерки
        vec3f(0.5, 0.0, 0.2), // Пурпурный
        vec3f(0.8, 0.1, 0.1), // Красный
        vec3f(0.9, 0.3, 0.0), // Тёмно-оранжевый
        vec3f(1.0, 0.6, 0.0), // Оранжевый
        vec3f(1.0, 0.8, 0.0), // Желтый
        vec3f(1.0, 0.9, 0.5)  // Золотой рассвет
    ),
    // 4. Monochrome Gray (8 градаций серого)
    array<vec3f, 8>(
        vec3f(0.0), vec3f(0.14), vec3f(0.28), vec3f(0.42),
        vec3f(0.56), vec3f(0.70), vec3f(0.84), vec3f(1.0)
    ),
    // 5. NES Retro (классическая палитра Dendy)
    array<vec3f, 8>(
        vec3f(0.0, 0.0, 0.0),       // Черный
        vec3f(0.1, 0.1, 0.9),       // Синий
        vec3f(0.0, 0.6, 0.0),       // Зеленый
        vec3f(0.9, 0.1, 0.1),       // Красный
        vec3f(0.9, 0.6, 0.0),       // Оранжевый
        vec3f(0.8, 0.8, 0.0),       // Желтый
        vec3f(0.5, 0.3, 0.1),       // Коричневый
        vec3f(1.0, 1.0, 1.0)        // Белый
    )
);

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

fn get_closest_palette_color(color: vec3f, palette_idx: i32) -> vec3f {
    let palette = PALETTES[palette_idx];
    var min_dist = 99999.0;
    var best_color = palette[0];
    
    for (var i = 0; i < 8; i = i + 1) {
        let dist = distance(color, palette[i]);
        if dist < min_dist {
            min_dist = dist;
            best_color = palette[i];
        }
    }
    
    return best_color;
}

// Быстрый хэш шума на GPU
fn hash2d(p: vec2f) -> f32 {
    let sin_val = sin(dot(p, vec2f(127.1, 311.7)));
    return fract(sin_val * 43758.5453123) - 0.5;
}

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
    var posterized = color;

    if variant == 0 {
        // Standard RGB Posterization
        posterized = vec4<f32>(
            floor(color.r * params.levelR + 0.5) / params.levelR,
            floor(color.g * params.levelG + 0.5) / params.levelG,
            floor(color.b * params.levelB + 0.5) / params.levelB,
            color.a
        );
    } else if variant == 1 {
        // HSV Posterization
        var hsv = rgb_to_hsv(color.rgb);
        
        hsv.x = floor(hsv.x * params.levelR + 0.5) / params.levelR;
        hsv.y = floor(hsv.y * params.levelG + 0.5) / params.levelG;
        
        if params.levelB > 0.0 {
            hsv.z = floor(hsv.z * params.levelB + 0.5) / params.levelB;
        }

        posterized = vec4f(hsv_to_rgb(hsv), color.a);
    } else if variant == 2 {
        // Palette Mapping
        let p_idx = clamp(i32(params.palette), 0, 5);
        let dither_amount = params.levelR; // levelR используется как сила шума
        
        // Инжектируем шум дизеринга
        let noise = hash2d(vec2f(id.xy)) * dither_amount;
        let dithered_rgb = clamp(color.rgb + vec3f(noise), vec3f(0.0), vec3f(1.0));
        
        let mapped_rgb = get_closest_palette_color(dithered_rgb, p_idx);
        posterized = vec4f(mapped_rgb, color.a);
    }

    // Регулируем прозрачность наложения (для палитры берем из params.levelG, для остальных 1.0)
    var final_opacity = 1.0;
    if variant == 2 {
        final_opacity = params.levelG; // levelG используется как прозрачность
    }

    let final_color = mix(color, posterized, final_opacity);
    textureStore(outputTexture, coords, final_color);
}

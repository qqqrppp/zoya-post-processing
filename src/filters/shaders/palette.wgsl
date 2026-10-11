const MAX_COLORS = 16;

const VARIANT_RGB = 0;
const VARIANT_OKLAB = 1;
const VARIANT_REDMEAN = 2;
const VARIANT_LAB = 3;
const VARIANT_OKLAB_WEIGHTED = 4;

struct Params {
    count: f32,             // Сколько цветов палитры реально используется (0 .. MAX_COLORS)
    variant: f32,           // 0 = RGB, 1 = Oklab, 2 = Redmean, 3 = CIE Lab, 4 = Oklab weighted
    strength: f32,          // 0.0 - исходная картинка, 1.0 - полностью цвета палитры
    lightnessWeight: f32,   // Вес яркости L для Oklab weighted (1.0 = обычный Oklab)
    colors: array<vec4f, MAX_COLORS>, // rgb в sRGB [0..1], a не используется
}

@group(0) @binding(0) var<uniform> params : Params;

@group(1) @binding(0) var inputTexture : texture_2d<f32>;
@group(1) @binding(1) var outputTexture : texture_storage_2d<rgba8unorm, write>;

fn srgb_to_linear(c: vec3f) -> vec3f {
    let lo = c / 12.92;
    let hi = pow((c + vec3f(0.055)) / 1.055, vec3f(2.4));
    return select(hi, lo, c <= vec3f(0.04045));
}

// Linear sRGB -> Oklab
fn linear_to_oklab(c: vec3f) -> vec3f {
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

fn lab_f(t: f32) -> f32 {
    let delta = 6.0 / 29.0;
    if t > delta * delta * delta {
        return pow(t, 1.0 / 3.0);
    }
    return t / (3.0 * delta * delta) + 4.0 / 29.0;
}

// Linear sRGB -> CIE Lab (D65)
fn linear_to_lab(c: vec3f) -> vec3f {
    let x = 0.4124564 * c.r + 0.3575761 * c.g + 0.1804375 * c.b;
    let y = 0.2126729 * c.r + 0.7151522 * c.g + 0.0721750 * c.b;
    let z = 0.0193339 * c.r + 0.1191920 * c.g + 0.9503041 * c.b;

    let fx = lab_f(x / 0.95047);
    let fy = lab_f(y);
    let fz = lab_f(z / 1.08883);

    return vec3f(116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz));
}

// Преобразует sRGB-цвет в пространство, в котором считается расстояние
fn to_metric_space(srgb: vec3f, variant: i32) -> vec3f {
    switch variant {
        case VARIANT_OKLAB, VARIANT_OKLAB_WEIGHTED: {
            return linear_to_oklab(srgb_to_linear(srgb));
        }
        case VARIANT_LAB: {
            return linear_to_lab(srgb_to_linear(srgb));
        }
        default: {
            // RGB и Redmean работают прямо в sRGB
            return srgb;
        }
    }
}

// Квадрат расстояния между двумя цветами, уже переведёнными в to_metric_space
fn color_distance(a: vec3f, b: vec3f, variant: i32) -> f32 {
    var diff = a - b;

    if variant == VARIANT_REDMEAN {
        // Redmean: веса каналов зависят от среднего красного
        let rmean = (a.r + b.r) * 0.5;
        return (2.0 + rmean) * diff.r * diff.r
            + 4.0 * diff.g * diff.g
            + (3.0 - rmean) * diff.b * diff.b;
    }

    if variant == VARIANT_OKLAB_WEIGHTED {
        diff.x *= params.lightnessWeight;
    }

    return dot(diff, diff); // sqrt не нужен для сравнения
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

    let count = min(i32(params.count), MAX_COLORS);
    let variant = i32(params.variant);

    let target_color = to_metric_space(color.rgb, variant);

    var best_index = 0;
    var best_dist = 1.0e20;

    for (var i = 0; i < count; i++) {
        let candidate = to_metric_space(params.colors[i].rgb, variant);
        let dist = color_distance(target_color, candidate, variant);

        if dist < best_dist {
            best_dist = dist;
            best_index = i;
        }
    }

    let nearest = params.colors[best_index].rgb;
    let result = mix(color.rgb, nearest, clamp(params.strength, 0.0, 1.0));

    textureStore(outputTexture, coords, vec4f(result, color.a));
}

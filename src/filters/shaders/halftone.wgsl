// Двухпроходный halftone.
//   Проход 1 (computeCells): для каждой ячейки растра считаем средний цвет и пишем в cellsOut
//                            (слой 0 - основной угол, 1 - R (+15°), 2 - G (+75°)).
//   Проход 2 (main):         рисуем круги, читая цвет ячеек из cellsIn одним textureLoad на ячейку.

struct Params {
    dotSize: f32,     // Размер ячейки (диаметр точки)
    angle: f32,       // Угол поворота сетки в радианах
    smoothness: f32,  // Сглаживание краев точек (0.0 .. 1.0)
    monochrome: f32,  // 0.0 = Цветной, 1.0 = Монохромный
    invert: f32,      // 0.0 = Темные точки на светлом, 1.0 = Светлые на темном
    variant: f32,     // 0.0 = CMYK/RGB, 1.0 = Средний цвет каждого круга
    radiusK: f32,     // Максимальный радиус точки в долях dotSize (0.3 .. 0.95)
    merge: f32,       // 0.0 .. 1.0 - мягкое слияние краёв соседних точек (0 = жёсткое объединение)
}

@group(0) @binding(0) var<uniform> params : Params;

// Проход 1
@group(1) @binding(0) var inputTexture : texture_2d<f32>;
@group(1) @binding(2) var cellsOut : texture_storage_2d_array<rgba8unorm, write>;

// Проход 2
@group(1) @binding(1) var outputTexture : texture_storage_2d<rgba8unorm, write>;
@group(1) @binding(3) var cellsIn : texture_2d_array<f32>;

// Допустимый диапазон params.radiusK (доли dotSize).
// 0.7071 (= sqrt(2)/2) - полностью закрашивает ячейку, включая углы.
// Верхняя граница должна быть < 1.0, иначе 2x2 соседних ячеек будет недостаточно.
const RADIUS_K_MIN: f32 = 0.3;
const RADIUS_K_MAX: f32 = 0.95;

const ANGLE_R: f32 = 0.2618; // +15°
const ANGLE_G: f32 = 1.3090; // +75°

// Поворот 2D-координат
fn rotate2d(p: vec2f, a: f32) -> vec2f {
    let s = sin(a);
    let c = cos(a);
    return vec2f(p.x * c - p.y * s, p.x * s + p.y * c);
}

// Угол сетки для слоя (0 - основной/B, 1 - R, 2 - G)
fn layerAngle(layer: u32) -> f32 {
    if layer == 1u {
        return params.angle + ANGLE_R;
    }
    if layer == 2u {
        return params.angle + ANGLE_G;
    }
    return params.angle;
}

struct Grid {
    origin: vec2i, // индекс ячейки, соответствующий texel (0, 0) в cells-текстуре
    size: vec2i,   // количество ячеек по осям
}

// Диапазон ячеек повернутой сетки, покрывающий изображение (+1 ячейка с каждой стороны,
// чтобы круги соседних ячеек за краем изображения тоже были доступны).
// Вызывается с одними и теми же аргументами в обоих проходах -> результаты идентичны.
fn gridInfo(angle: f32, dotSize: f32, imgSize: vec2f) -> Grid {
    let c1 = rotate2d(vec2f(imgSize.x, 0.0), angle);
    let c2 = rotate2d(vec2f(0.0, imgSize.y), angle);
    let c3 = rotate2d(imgSize, angle);
    let mn = min(min(vec2f(0.0), c1), min(c2, c3));
    let mx = max(max(vec2f(0.0), c1), max(c2, c3));
    let lo = vec2i(floor(mn / dotSize)) - vec2i(1);
    let hi = vec2i(floor(mx / dotSize)) + vec2i(1);
    return Grid(lo, hi - lo + vec2i(1));
}

// Семплирует средний цвет ячейки растра, чтобы линии изображения не деформировали круг
fn sampleCellColor(center: vec2f, dotSize: f32, textureSize: vec2i) -> vec4f {
    let step = dotSize * 0.25;
    var sum = vec4f(0.0);
    var count = 0.0;

    // Семплируем сетку точек в пределах круга для честного среднего цвета
    for (var dy: f32 = -1.5; dy <= 1.5; dy += 1.0) {
        for (var dx: f32 = -1.5; dx <= 1.5; dx += 1.0) {
            let offset = vec2f(dx * step, dy * step);
            if length(offset) <= dotSize * 0.55 {
                let p = clamp(vec2i(center + offset), vec2i(0), textureSize - vec2i(1));
                sum += textureLoad(inputTexture, p, 0);
                count += 1.0;
            }
        }
    }

    if count > 0.0 {
        return sum / count;
    }
    let p = clamp(vec2i(center), vec2i(0), textureSize - vec2i(1));
    return textureLoad(inputTexture, p, 0);
}

// ---------------------------------------------------------------------------
// Проход 1: средний цвет каждой ячейки
// ---------------------------------------------------------------------------
@compute @workgroup_size(8, 8)
fn computeCells(@builtin(global_invocation_id) id: vec3<u32>) {
    let texSize = vec2i(textureDimensions(inputTexture));
    let dotSize = max(2.0, params.dotSize);
    let angle = layerAngle(id.z);
    let grid = gridInfo(angle, dotSize, vec2f(texSize));

    if any(vec2i(id.xy) >= grid.size) {
        return;
    }

    let cellIdx = vec2f(grid.origin + vec2i(id.xy));
    let centerRot = (cellIdx + 0.5) * dotSize;
    let centerOrig = rotate2d(centerRot, -angle);

    let color = sampleCellColor(centerOrig, dotSize, texSize);
    textureStore(cellsOut, vec2i(id.xy), i32(id.z), color);
}

// ---------------------------------------------------------------------------
// Проход 2: рисование кругов
// ---------------------------------------------------------------------------

// Рендерит слой растра для заданного угла.
// Учитывает 4 ближайшие ячейки (своя + 3 соседние по квадранту), поэтому круги
// могут быть больше половины ячейки и перекрываться, не обрезаясь краем ячейки.
// Возвращает: rgb = средний цвет ячейки, чья точка покрывает пиксель, a = маска (0 = точка, 1 = фон).
// layer: слой cells-текстуры. channelIdx: -1 = яркость, 0/1/2 = R/G/B.
fn renderDotLayer(
    pos: vec2f,
    angle: f32,
    layer: i32,
    dotSize: f32,
    smoothness: f32,
    channelIdx: i32,
    invertCoverage: bool,
    imgSize: vec2f
) -> vec4f {
    let grid = gridInfo(angle, dotSize, imgSize);
    let rot = rotate2d(pos, angle);
    let f = rot / dotSize;
    let base = floor(f);
    // Направление к ближайшим соседним ячейкам (в зависимости от квадранта внутри ячейки)
    let dir = select(vec2f(-1.0), vec2f(1.0), (f - base) >= vec2f(0.5));

    let maxRadius = dotSize * clamp(params.radiusK, RADIUS_K_MIN, RADIUS_K_MAX);
    let edge = max(0.5, smoothness * maxRadius * 0.5);

    // Расстояния до края круга (<0 = внутри) и цвета для 4 ячеек
    var ds: array<f32, 4>;
    var cols: array<vec3f, 4>;

    for (var j: i32 = 0; j < 2; j += 1) {
        for (var i: i32 = 0; i < 2; i += 1) {
            let idx = base + vec2f(f32(i), f32(j)) * dir;
            let centerRot = (idx + 0.5) * dotSize;

            // Цвет ячейки посчитан в проходе 1 -> круг идеальной формы
            let cellCoord = clamp(vec2i(idx) - grid.origin, vec2i(0), grid.size - vec2i(1));
            let cellColor = textureLoad(cellsIn, cellCoord, layer, 0);

            var intensity: f32;
            if channelIdx < 0 {
                intensity = dot(cellColor.rgb, vec3f(0.299, 0.587, 0.114));
            } else if channelIdx == 0 {
                intensity = cellColor.r;
            } else if channelIdx == 1 {
                intensity = cellColor.g;
            } else {
                intensity = cellColor.b;
            }

            let coverage = select(1.0 - intensity, intensity, invertCoverage);
            let radius = maxRadius * sqrt(clamp(coverage, 0.0, 1.0));

            ds[j * 2 + i] = distance(rot, centerRot) - radius;
            cols[j * 2 + i] = cellColor.rgb;
        }
    }

    // Гладкий минимум (log-sum-exp): симметричный, мягко сливает края соседних кругов.
    // k - ширина зоны слияния; ограничена 0.2 * dotSize, чтобы 2x2 соседей оставалось достаточно.
    // При merge = 0 ведёт себя как обычный min.
    let k = max(clamp(params.merge, 0.0, 1.0) * dotSize * 0.2, 0.001);
    let dmin = min(min(ds[0], ds[1]), min(ds[2], ds[3]));

    var wSum = 0.0;
    var colSum = vec3f(0.0);
    for (var n: i32 = 0; n < 4; n += 1) {
        let w = exp(-(ds[n] - dmin) / k);
        wSum += w;
        colSum += cols[n] * w;
    }

    let dSmooth = dmin - k * log(wSum);
    let mask = smoothstep(-edge, edge, dSmooth);

    return vec4f(colSum / wSum, mask);
}

@compute @workgroup_size(16, 16)
fn main(
    @builtin(global_invocation_id) id: vec3<u32>
) {
    let textureSize = vec2i(textureDimensions(outputTexture));
    if id.x >= u32(textureSize.x) || id.y >= u32(textureSize.y) {
        return;
    }

    let coords = vec2i(id.xy);
    let pos = vec2f(coords);
    let imgSize = vec2f(textureSize);
    let dotSize = max(2.0, params.dotSize);
    let smoothness = clamp(params.smoothness, 0.01, 1.0);

    var resultColor: vec4f;

    if params.variant > 0.5 {
        // Режим: средний цвет для каждого круга
        let layer = renderDotLayer(pos, params.angle, 0, dotSize, smoothness, -1, params.invert > 0.5, imgSize);
        let dotMask = layer.a;

        // Цвет круга: средний цвет ячейки либо монохром
        var circleColor: vec3f;
        if params.monochrome > 0.5 {
            circleColor = select(vec3f(0.0), vec3f(1.0), params.invert > 0.5);
        } else {
            circleColor = layer.rgb;
        }

        // Фон: белый (1.0) по умолчанию, черный (0.0) при инверсии
        let bgColor = select(vec3f(1.0), vec3f(0.0), params.invert > 0.5);

        let finalRgb = mix(circleColor, bgColor, dotMask);
        resultColor = vec4f(finalRgb, 1.0);

    } else if params.monochrome > 0.5 {
        var dotVal = renderDotLayer(pos, params.angle, 0, dotSize, smoothness, -1, false, imgSize).a;

        if params.invert > 0.5 {
            dotVal = 1.0 - dotVal;
        }

        resultColor = vec4f(dotVal, dotVal, dotVal, 1.0);
    } else {
        // Цветной растр: каждый канал со своей независимой сеткой и углом (слои 1/2/0 = R/G/B)
        var dotR = renderDotLayer(pos, layerAngle(1u), 1, dotSize, smoothness, 0, false, imgSize).a;
        var dotG = renderDotLayer(pos, layerAngle(2u), 2, dotSize, smoothness, 1, false, imgSize).a;
        var dotB = renderDotLayer(pos, layerAngle(0u), 0, dotSize, smoothness, 2, false, imgSize).a;

        if params.invert > 0.5 {
            dotR = 1.0 - dotR;
            dotG = 1.0 - dotG;
            dotB = 1.0 - dotB;
        }

        resultColor = vec4f(dotR, dotG, dotB, 1.0);
    }

    textureStore(outputTexture, coords, resultColor);
}

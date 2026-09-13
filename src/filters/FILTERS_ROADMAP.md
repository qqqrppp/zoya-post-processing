# Дорожная карта и идеи фильтров WebGPU (FILTERS_ROADMAP.md)

Благодаря архитектуре на **Compute-шейдерах** и новому базовому классу `BaseComputeFilter<T>`, добавление новых эффектов в проект теперь занимает считанные минуты. Ниже подробно описаны фильтры, которые отлично дополнят ваш проект, с готовыми формулами, архитектурой и WGSL-кодом.

---

## 1. Истинная хроматическая аберрация (Radial Chromatic Aberration)

### Описание эффекта
Имитирует несовершенство оптических линз. В отличие от простой матрицы свертки 3x3, этот фильтр делает центр кадра идеально резким, а к краям кадра плавно размывает и разводит в стороны красный и синий цветовые каналы (радиальный сдвиг).

### WGSL Шейдер (`src/filters/shaders/chromaticAberration.wgsl`)
```wgsl
struct Params {
    intensity: f32, // Сила эффекта (рекомендуется диапазон от 0.0 до 0.08)
}

@group(0) @binding(0) var<uniform> params : Params;

@group(1) @binding(0) var inputTexture : texture_2d<f32>;
@group(1) @binding(1) var outputTexture : texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) global_id : vec3u) {
    let dimensions = vec2f(textureDimensions(inputTexture, 0));
    let coords = vec2f(global_id.xy);

    if (coords.x >= dimensions.x || coords.y >= dimensions.y) {
        return;
    }

    let uv = coords / dimensions;
    let to_center = uv - vec2f(0.5, 0.5);
    let dist = dot(to_center, to_center); // Квадрат расстояния до центра
    let shift = to_center * dist * params.intensity;

    let coords_r = vec2i((uv + shift) * dimensions);
    let coords_g = vec2i(coords);
    let coords_b = vec2i((uv - shift) * dimensions);

    let max_coords = vec2i(dimensions) - vec2i(1, 1);
    let r_pixel = clamp(coords_r, vec2i(0), max_coords);
    let b_pixel = clamp(coords_b, vec2i(0), max_coords);

    let r = textureLoad(inputTexture, r_pixel, 0).r;
    let g = textureLoad(inputTexture, coords_g, 0).g;
    let b = textureLoad(inputTexture, b_pixel, 0).b;
    let a = textureLoad(inputTexture, coords_g, 0).a;

    textureStore(outputTexture, vec2i(coords), vec4f(r, g, b, a));
}
```

### TypeScript класс (`src/filters/chromaticAberration.ts`)
```typescript
import { BaseComputeFilter } from './baseComputeFilter';
import chromaticWGSL from './shaders/chromaticAberration.wgsl?raw';

export type ChromaticSettings = {
    name: string,
    intensity: number, // 0..100 -> конвертируем в 0.0..0.08
}

export class ChromaticAberration extends BaseComputeFilter<ChromaticSettings> {
    private buffer!: GPUBuffer;

    protected get wgslCode() { return chromaticWGSL; }

    protected createResources() {
        this.buffer = this.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.constantsBindGroup = this.createConstantsBindGroup([{
            binding: 0,
            resource: { buffer: this.buffer }
        }]);
    }

    protected updateBuffers(settings: ChromaticSettings) {
        const intensityFloat = (settings.intensity / 100) * 0.08;
        this.device.queue.writeBuffer(this.buffer, 0, new Float32Array([intensityFloat]));
    }

    protected shouldSkip(settings: ChromaticSettings) {
        return settings.intensity === 0;
    }
}
```

---

## 2. Кинематографическая виньетка (Vignette)

### Описание эффекта
Плавно затемняет изображение от центра к углам. Фокусирует взгляд на центральной части композиции и добавляет глубины.

### WGSL Шейдер (`src/filters/shaders/vignette.wgsl`)
```wgsl
struct Params {
    radius_start: f32, // Где начинается затемнение (0.0..1.0)
    radius_end: f32,   // Где оно становится максимальным (0.0..1.5)
    intensity: f32,    // Процент затемнения (0.0..1.0)
}

@group(0) @binding(0) var<uniform> params : Params;

@group(1) @binding(0) var inputTexture : texture_2d<f32>;
@group(1) @binding(1) var outputTexture : texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) global_id : vec3u) {
    let dimensions = vec2f(textureDimensions(inputTexture, 0));
    let coords = vec2i(global_id.xy);

    if (f32(coords.x) >= dimensions.x || f32(coords.y) >= dimensions.y) {
        return;
    }

    let uv = vec2f(coords) / dimensions;
    let dist = distance(uv, vec2f(0.5, 0.5)); // Расстояние до центра экрана
    
    // Вычисляем фактор затемнения по функции smoothstep
    let vignette = smoothstep(params.radius_start, params.radius_end, dist);
    
    let color = textureLoad(inputTexture, coords, 0);
    let final_rgb = color.rgb * (1.0 - vignette * params.intensity);

    textureStore(outputTexture, coords, vec4f(final_rgb, color.a));
}
```

---

## 3. Эффект мазка кисти / Живописи (Kuwahara Filter / Brush Effect)

### Описание эффекта
Потрясающий художественный фильтр, который превращает фотографию в картину, написанную маслом (или широкой художественной кистью).
Алгоритм делит квадратную окрестность пикселя на четыре перекрывающихся квадранта. Для каждого квадранта вычисляется средний цвет и дисперсия (математическое отклонение цвета). Текущий пиксель заменяется средним цветом того квадранта, у которого дисперсия оказалась наименьшей. 

**Результат**: Текстуры и мелкие шумы полностью разглаживаются, а все контрастные границы и контуры объектов остаются невероятно четкими!

### WGSL Шейдер (`src/filters/shaders/kuwahara.wgsl`)
```wgsl
struct Params {
    radius: i32, // Радиус мазка кисти (например, от 2 до 6)
}

@group(0) @binding(0) var<uniform> params : Params;

@group(1) @binding(0) var inputTexture : texture_2d<f32>;
@group(1) @binding(1) var outputTexture : texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) global_id : vec3u) {
    let dimensions = vec2i(textureDimensions(inputTexture, 0));
    let coords = vec2i(global_id.xy);

    if (coords.x >= dimensions.x || coords.y >= dimensions.y) {
        return;
    }

    let R = params.radius;
    let n = f32((R + 1) * (R + 1));

    // Нам нужно рассчитать среднее и дисперсию для 4 квадрантов:
    // Q1: [top-left], Q2: [top-right], Q3: [bottom-left], Q4: [bottom-right]
    var mean = array<vec3f, 4>(vec3f(0.0), vec3f(0.0), vec3f(0.0), vec3f(0.0));
    var variance = array<vec3f, 4>(vec3f(0.0), vec3f(0.0), vec3f(0.0), vec3f(0.0));

    // Сетки смещений для четырех квадрантов
    let ranges = array<vec4i, 4>(
        vec4i(-R, 0, -R, 0), // Q1
        vec4i(0, R, -R, 0),  // Q2
        vec4i(-R, 0, 0, R),  // Q3
        vec4i(0, R, 0, R)    // Q4
    );

    for (var k: u32 = 0u; k < 4u; k = k + 1u) {
        let r = ranges[k];
        var sum = vec3f(0.0);
        var sumSq = vec3f(0.0);

        for (var x = r.x; x <= r.y; x = x + 1) {
            for (var y = r.z; y <= r.w; y = y + 1) {
                let sampleCoords = clamp(coords + vec2i(x, y), vec2i(0), dimensions - vec2i(1));
                let color = textureLoad(inputTexture, sampleCoords, 0).rgb;
                
                sum = sum + color;
                sumSq = sumSq + (color * color);
            }
        }

        mean[k] = sum / n;
        variance[k] = abs((sumSq / n) - (mean[k] * mean[k]));
    }

    // Ищем квадрант с минимальной суммарной дисперсией (яркостной)
    var minVariance = 9999.0;
    var bestIndex = 0u;

    for (var k: u32 = 0u; k < 4u; k = k + 1u) {
        let v = variance[k].r + variance[k].g + variance[k].b;
        if (v < minVariance) {
            minVariance = v;
            bestIndex = k;
        }
    }

    let alpha = textureLoad(inputTexture, coords, 0).a;
    textureStore(outputTexture, coords, vec4f(mean[bestIndex], alpha));
}
```

---

## 4. Эффект неонового свечения (Bloom / Glow)

### Описание эффекта
Придает ярким участкам изображения (источникам света, неону, бликам) эффект красивого размытого самосвечения.

### Архитектура реализации
Так как это многопроходный (multi-pass) эффект, его лучше реализовать на уровне менеджера `Core`:
1. **Шаг 1 (Threshold)**: В первом Compute-пайплайне мы отсекаем тусклые пиксели: если яркость пикселя выше `0.8`, оставляем его, иначе красим в черный `(0,0,0)`.
2. **Шаг 2 (Blur)**: Пропускаем полученную яркую маску через ваш существующий быстрый `Blur` (размытие по Гауссу).
3. **Шаг 3 (Blend)**: В финальном фрагментном шейдере складываем оригинальную картинку и размытую маску: `final_color = original + blurred_glow`.

---

## 5. Профессиональная цветокоррекция через 3D LUT (Look-Up Tables)

### Описание эффекта
Использует текстуру-сетку размером $512 \times 512$ пикселей (представляющую собой 3D куб цветов $16^3$ или $32^3$), чтобы мгновенно перекрашивать пиксели. Цвет исходного пикселя `(R, G, B)` используется в качестве трехмерной координаты в этой LUT-таблице для поиска нового, художественно обработанного цвета.

### WGSL Шейдер (`src/filters/shaders/lut3d.wgsl`)
```wgsl
@group(1) @binding(0) var inputTexture : texture_2d<f32>;
@group(1) @binding(1) var lutTexture : texture_2d<f32>; // 2D LUT Таблица
@group(1) @binding(2) var lutSampler : sampler;
@group(1) @binding(3) var outputTexture : texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) global_id : vec3u) {
    let dimensions = vec2i(textureDimensions(inputTexture, 0));
    let coords = vec2i(global_id.xy);

    if (coords.x >= dimensions.x || coords.y >= dimensions.y) {
        return;
    }

    let color = textureLoad(inputTexture, coords, 0);
    
    // Размерность LUT куба (обычно 32)
    let lutSize = 32.0; 
    
    // Переводим RGB в координаты LUT
    let r = color.r * (lutSize - 1.0);
    let g = color.g * (lutSize - 1.0);
    let b = color.b * (lutSize - 1.0);

    // Вычисляем координаты 2D ячеек в сетке LUT
    let cell_b_floor = floor(b);
    let cell_b_ceil = ceil(b);

    // Координаты на 2D-текстуре LUT (размером 1024x32 или 512x512)
    // Формула зависит от раскладки LUT-изображения.
    // Пример для стандартного Strip-LUT (например, 1024x32):
    let x_floor = (cell_b_floor * lutSize + r + 0.5) / (lutSize * lutSize);
    let y_floor = (g + 0.5) / lutSize;
    let lutColorFloor = textureSampleLevel(lutTexture, lutSampler, vec2f(x_floor, y_floor), 0.0);

    let x_ceil = (cell_b_ceil * lutSize + r + 0.5) / (lutSize * lutSize);
    let y_ceil = (g + 0.5) / lutSize;
    let lutColorCeil = textureSampleLevel(lutTexture, lutSampler, vec2f(x_ceil, y_ceil), 0.0);

    // Смешиваем две соседние ячейки куба для плавного перехода (трилинейная интерполяция)
    let final_rgb = mix(lutColorFloor.rgb, lutColorCeil.rgb, fract(b));

    textureStore(outputTexture, coords, vec4f(final_rgb, color.a));
}
```

---

## Как добавить любой из этих фильтров в проект:

1. Создайте `.wgsl` файл в `src/filters/shaders/`.
2. Создайте `.ts` файл в `src/filters/`, унаследовав класс от `BaseComputeFilter<YourSettings>`.
3. Подключите ваш новый класс в `src/filters/index.ts` к менеджеру `Core` аналогично остальным фильтрам.
4. Добавьте его настройки в интерфейс и в Svelte-компонент настроек. 

---

## 6. Стратегия утилизации ресурсов WebGPU (Resource Lifecycle & VRAM Recycling)

В низкоуровневых API, таких как WebGPU, сборщик мусора JavaScript (Garbage Collector) **не освобождает видеопамять VRAM мгновенно**. При частой смене файлов или переинициализации картинок это неминуемо приведет к падению вкладки браузера по ошибке Out-Of-Memory (OOM).

### Архитектурный план очистки (Recycling Strategy)

#### Этап А: Метод `destroy` в классах фильтров
Каждый класс фильтра (как наследники `Filter`, так и `BaseComputeFilter`) должен иметь явный жизненный цикл разрушения для удаления созданных GPU ресурсов:
```typescript
// src/filters/filter.ts
export abstract class Filter<T> {
    // ...
    destroy() {
        if (this.inputTexture) { this.inputTexture.destroy(); }
        if (this.outputTexture) { this.outputTexture.destroy(); }
    }
}

// src/filters/baseComputeFilter.ts
export abstract class BaseComputeFilter<T> extends Filter<T> {
    // ...
    override destroy() {
        super.destroy();
        if (this.intermediateTexture) { this.intermediateTexture.destroy(); }
        // Дочерние классы уничтожают свои буферы констант
        this.destroyResources();
    }
    protected abstract destroyResources(): void;
}
```

#### Этап Б: Метод `destroy` в оркестраторе `Core`
При закрытии изображения или открытии нового файла, Svelte-компонент должен вызвать метод `destroy` у старого экземпляра `Core`:
```typescript
// src/filters/index.ts (класс Core)
destroy() {
    // 1. Уничтожаем текстуры ядра
    this.inputTexture.destroy();
    this.outputTexture.destroy();
    
    // 2. Уничтожаем ресурсы всех зарегистрированных фильтров
    for (let [name, frame] of this.frames) {
        // Если у нас хранятся экземпляры фильтров, вызываем их destroy()
    }
}
```

#### Этап В: Оптимизация буферов (Zero-Allocation on Slider Moves)
*Текущая архитектура проекта уже идеальна в этом аспекте!* Во время движения слайдеров мы **не пересоздаем** буферы, а только обновляем их содержимое через `device.queue.writeBuffer(...)`. Это самая быстрая и эффективная операция, не вызывающая фрагментацию памяти.


---

## 7. Оптимизация холста и Viewport Manager (Clean Viewport Control)

Сейчас математика масштабирования (`scale`), перемещения (`offset`), соотношения сторон (`aspectRatio`) и рендеринга смешана внутри `CanvasGpu.svelte` и `Core.view()`. Это усложняет код и затрудняет оптимизацию отрисовки.

### Архитектурный план рефакторинга

#### Шаг 1: Выделение `ViewportController` (Чистый класс)
Создаем выделенный TypeScript-класс `ViewportController`, который инкапсулирует всю математику камерных проекций:
* Расчет коэффициента масштабирования с ограничением (`zoomMin`, `zoomMax`).
* Ограничение перемещения (`pan`), чтобы изображение не «улетало» за пределы видимости.
* Расчет матрицы преобразования и структуры `aspectRatio` (размеры холста vs размеры текстуры).

```typescript
// src/helpers/viewportController.ts
export class ViewportController {
    scale = 1.0;
    offset = { x: 0, y: 0 };
    canvasSize = { width: 0, height: 0 };
    imageSize = { width: 0, height: 0 };

    zoom(delta: number, mouseX: number, mouseY: number) {
        // ... математика зума относительно курсора мыши
    }

    pan(dx: number, dy: number) {
        // ... математика перемещения
    }

    getUniformData() {
        // Возвращает массив Float32Array для шейдера
    }
}
```

#### Шаг 2: Экономия ресурсов GPU через Scissor Testing (Отсечение невидимого)
Если текстура сильно приближена (большой `scale`) или смещена, WebGPU тратит ресурсы на выполнение фрагментного шейдера над пикселями, которые находятся за физическими границами холста.

Мы можем принудительно обрезать проход рендеринга с помощью встроенного в WebGPU метода **Scissor Testing**:
```typescript
// Внутри Core.render()
const passEncoder = this.commandEncoder.beginRenderPass({ ... });

// Рассчитываем пересечение прямоугольника изображения с границами канваса
let scissorX = Math.max(0, calculatedOffset.x);
let scissorY = Math.max(0, calculatedOffset.y);
let scissorW = Math.min(canvasWidth, calculatedWidth);
let scissorH = Math.min(canvasHeight, calculatedHeight);

// Устанавливаем рамку отсечения. GPU вообще не будет выполнять шейдеры за её пределами!
passEncoder.setScissorRect(scissorX, scissorY, scissorW, scissorH);

	passEncoder.setPipeline(fullscreenQuadPipeline);
	passEncoder.draw(6);
	passEncoder.end();
```
Это снизит нагрузку на видеокарту на **30-70%** при детальной работе (зуме) с большими изображениями, предотвратит лишний рендеринг за границами экрана и сэкономит батарею ноутбука/устройства.


---

## 8. Стабилизация и рефакторинг истории операций (Undo/Redo & State Architecture)

На данный момент менеджер истории (`history` в `model.svelte.ts`) работает нестабильно, имеет некоторые шероховатости при откате изменений и содержит архитектурные компромиссы. В будущем запланирован полный рефакторинг системы состояния для обеспечения идеальной надежности.

### Планируемые улучшения и исправления:

1. **Единый атомарный снимок (Single Source of Truth / State Snapshots)**:
   * Вместо разрозненного хранения истории внутри индивидуальных фильтров и сложного ручного отслеживания «предыдущих/текущих» состояний в `createFilter`, история должна хранить полные атомарные снимки состояний всего приложения: `Record<FilterName, FilterSettings>`.
   * При операции Undo/Redo мы просто заменяем текущее состояние приложения на снимок из стека истории и инициируем один общий рендер.

2. **Предотвращение дублирования шагов (Debounced History Actions)**:
   * Сейчас во время интерактивного перетаскивания слайдера история может забиваться промежуточными значениями.
   * Планируется разделение изменений состояния на **активные (в реальном времени)** и **зафиксированные (commit)**. В историю должны попадать только зафиксированные шаги (например, при событии `change` у слайдера или после дебаунса/дросселирования в 300–500 мс).

3. **Изоляция побочных эффектов**:
   * Избавление от неявных связей в функциях `untrackSet` и `historyUpdate`, создание предсказуемой и легко тестируемой однонаправленной схемы потока данных (Unidirectional Data Flow).
```
Это снизит нагрузку на видеокарту на **30-70%** при детальной работе (зуме) с большими изображениями, предотвратит лишний рендеринг за границами экрана и сэкономит батарею ноутбука/устройства.
 

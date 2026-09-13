# Архитектура проекта Zoe-Svelte (ARCHITECTURE.md)

В данном документе описана архитектура графического движка и интерфейса приложения **Zoya-Svelte** (инструмента для постобработки изображений на базе WebGPU). 

Проект построен на реактивном фреймворке **Svelte 5** и низкоуровневом графическом API **WebGPU** с активным использованием **вычислительных шейдеров (Compute Shaders)** для цепочечной обработки пикселей.

---

## 1. Визуальная схема архитектуры

```mermaid
graph TD
    %% UI LAYER
    subgraph UI_Layer [1. Слой представления Svelte 5]
        Sidebar[Sidebar.svelte]
        CanvasGpu[CanvasGpu.svelte]
        Sliders[Слайдеры настроек]
    end

    %% STATE & HISTORY LAYER
    subgraph State_Layer [2. Слой состояния и истории]
        Model[model.svelte.ts]
        History[history - менеджер истории]
        FilterStores[Svelte Stores - индивидуальные фильтры]
    end

    %% WEBGPU CORE ENGINE
    subgraph WebGPU_Engine [3. Графический оркестратор WebGPU]
        Core[Core - класс-диспетчер]
        Sampler[GPUSampler]
        InputTex[inputTexture - оригинал]
        OutputTex[outputTexture - результат]
    end

    %% COMPUTE & FILTERS LAYER
    subgraph Compute_Layer [4. Вычисления и фильтры GPU]
        FilterBase[Filter - базовый абстрактный класс]
        BaseCompute[BaseComputeFilter - унифицированные фильтры]
        
        %% Конкретные реализации
        Blur[Blur]
        Gauss[GaussianBlur]
        Pixelate[Pixelate]
        Inverse[Inverse]
        Saturation[Saturation]
        Posterization[Posterization]
        Matrix[Matrix]
        SimpleDither[SimpleDither]
        ColorCorrection[ColorCorrection / Contrast]
    end

    %% SHADER LAYER
    subgraph Shaders [5. Слой WGSL Шейдеров]
        QuadWGSL[fullscreenTexturedQuad.wgsl - Отрисовка на холст]
        ComputeWGSL[Вычислительные шейдеры .wgsl - Фильтры]
    end

    %% Взаимодействия и потоки данных (Data Flow)
    Sliders -.->|Изменение параметров| FilterStores
    FilterStores -->|Запись в историю| History
    History -->|derived snapshot| Model
    
    CanvasGpu -->|onwheel/onmousemove| CanvasGpu
    Model -->|Эффект: view/offset/scale| CanvasGpu
    CanvasGpu -->|Вызов view| Core
    
    Core -->|1. Инициализация кадра| InputTex
    Core -->|2. Последовательный вызов compute| Compute_Layer
    
    FilterBase <|-- BaseCompute
    BaseCompute <|-- Pixelate
    BaseCompute <|-- Inverse
    BaseCompute <|-- Saturation
    BaseCompute <|-- Posterization
    BaseCompute <|-- Matrix
    BaseCompute <|-- SimpleDither
    BaseCompute <|-- ColorCorrection
    FilterBase <|-- Blur
    FilterBase <|-- Gauss

    Compute_Layer -->|3. Запуск вычислений| ComputeWGSL
    ComputeWGSL -->|4. Запись результатов| OutputTex
    
    Core -->|5. Рендеринг финального кадра| QuadWGSL
    QuadWGSL -->|6. Вывод пикселей| CanvasGpu
```

---

## 2. Описание архитектурных слоев

### 1. Слой представления (UI Layer — Svelte 5 & Carbon)
* **`Sidebar.svelte`**: Боковое меню приложения, разделенное по вкладкам (Color, Effects и т.д.). Динамически монтирует слайдеры параметров для каждого эффекта.
  * **Объединение интерфейсов**: Для удобства пользователя сложные или родственные фильтры сгруппированы в единые разделы меню. Например, **Blur** и **Gaussian Blur** объединены в одном компоненте управления с бесшовным переключением алгоритмов. То же самое сделано для различных продвинутых вариантов **Pixelate**.
* **`CanvasGpu.svelte`**: Главная рабочая область.
  * Управляет HTML5-элементом `<canvas>` и его WebGPU-контекстом.
  * Отслеживает действия мыши (drag-and-drop для перемещения, колесико мыши для масштабирования) и транслирует координаты экрана во внутренние NDC (Normalized Device Coordinates).
  * Подключен к `ResizeObserver` для динамического ресайза WebGPU буферов при изменении размера окна браузера (поддерживает высокое качество HighDPI / Retina).

### 2. Слой состояния и истории (State & History)
* **`model.svelte.ts`**:
  * Инициализирует индивидуальные реактивные Svelte Stores для каждого фильтра с помощью фабричного метода `createFilter`.
  * Содержит менеджер истории **`history`**, который собирает хронологический стек изменений и предоставляет реактивное свойство `history.filters` (снимок из последних версий всех активных фильтров).

### 3. Графический оркестратор WebGPU (Core Engine)
* **`Core` (`src/filters/index.ts`)**: Оркестратор ресурсов GPU.
  * Настраивает `GPUDevice`, `GPUSampler` и `GPUCanvasContext`.
  * Создает неизменяемую текстуру оригинала (`inputTexture`) и текстуру вывода цепочки фильтрации (`outputTexture`).
  * Динамически регистрирует все классы фильтров и хранит их исполнительные функции в `Map`.
  * **Метод `view()`**: Пересобирает кадр: копирует оригинал в рабочую текстуру, последовательно запускает вычисления для каждого примененного фильтра и выводит финальную текстуру на экран.

### 4. Вычисления и фильтры GPU (Compute Filters)
* **`Filter<T>`**: Базовый абстрактный класс, определяющий контракт инициализации фильтра на GPU.
* **`BaseComputeFilter<T>`**: Абстрактный класс-обёртка для однопроходных 2D Compute-фильтров. Предоставляет унифицированный конвейер:
  * Автоматически создаёт промежуточную текстуру (`intermediateTexture`) и бинд-группу ввода-вывода (IO).
  * Рассчитывает сетку рабочих групп GPU (`dispatchWorkgroups`).
  * Копирует результаты работы обратно в главную цепочку.
  * Минимизирует дублирование кода в конкретных фильтрах.
  * **Наследники `BaseComputeFilter`**: `Pixelate`, `Inverse`, `Saturation`, `Posterization`, `Matrix`, `SimpleDither`, `ColorCorrection` (и его подкласс `Contrast`). Эти фильтры описывают исключительно конфигурацию буферов констант (`createResources`) и запись актуальных параметров (`updateBuffers`).
* **Многопроходные фильтры (напрямую наследуют `Filter<T>`)**:
  * **`Blur`** (быстрый тайловый размыв по блокам) и **`GaussianBlur`** (качественный двухпроходный разделенный размыв). Они требуют сложного пинг-понга текстур, нескольких проходов вычислений (`computePass`) и передачи самплеров, поэтому реализуют метод `init()` самостоятельно без ограничений однопроходного `BaseComputeFilter`.

### 5. Слой шейдеров WGSL (Shaders)
* **`fullscreenTexturedQuad.wgsl`**: Вершинно-фрагментный шейдер отрисовки текстуры на канвас. Выполняет позиционирование изображения с учётом масштаба (`scale`) и смещения (`offset`) с использованием аппаратной билинейной интерполяции GPU.
* **Вычислительные шейдеры (`.wgsl`)**: Выполняют параллельные математические преобразования над пикселями на GPU.

---

## 3. Жизненный цикл кадра (Frame Lifecycle & Data Flow)

```
[Пользователь меняет слайдер]
           │
           ▼
[Обновление Svelte Store фильтра]
           │
           ▼
[Добавление записи в историю изменений (History)]
           │
           ▼
[Срабатывание реактивного $effect в CanvasGpu]
           │
           ▼
[Вызов Core.view(history.filters, { scale, offset, aspectRatio })]
           │
           ▼
[Core: копирование inputTexture -> outputTexture]
           │
           ▼
[Core: Цикл по активным фильтрам] ───► [Вызов compute() каждого фильтра]
                                                    │
                                                    ▼
                                      [Запись параметров в GPUBuffer]
                                                    │
                                                    ▼
                                      [Запуск Compute-пайплайна на GPU]
                                                    │
                                                    ▼
                                      [Запись результата в intermediateTexture]
                                                    │
                                                    ▼
                                      [Копирование intermediate -> outputTexture]
                                                    │
           ┌────────────────────────────────────────┘
           ▼
[Core: Запуск отрисовки fullscreenTexturedQuad.wgsl]
           │
           ▼
[Отображение готового изображения на экране холста]
```

<script lang="ts">
  import { onMount, tick } from "svelte";
  import { Core } from "~/filters";
  import { history } from "./settings/model.svelte";
  import { hexToRgbA, rgbaToFloat } from "~/helpers";
  import Undo from "~/ui/Undo.svelte";
  import Reset from "~/ui/Reset.svelte";
  import Download from "~/ui/Download.svelte";
  import debounce from "lodash/debounce";

  let { file } = $props();
  let filter = $state<Core>();

  const render = () => {
    // filter?.view(history.filters);
    changingsize()
  };

  $effect(render);

  let canvas: HTMLCanvasElement;
  let bitMap: ImageBitmap;
  let context: GPUCanvasContext | null;
  let device: GPUDevice | undefined;
  let presentationFormat: GPUTextureFormat;
  let uvScale = {
    canvasWidth: 1.0,
    canvasHeight: 1.0,
    imageWidth: 1.0,
    imageHeight: 1.0
  };

  async function create(canvas: HTMLCanvasElement) {
    if (!canvas) return;

    const adapter = await navigator.gpu?.requestAdapter();
    device = await adapter?.requestDevice();

    if (!device) {
      console.error("not support gpu adapter");
      return;
    }

    bitMap = await createImageBitmap(file);

    context = canvas.getContext("webgpu") as GPUCanvasContext;

    const devicePixelRatio = window.devicePixelRatio;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;

    presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
      device,
      format: presentationFormat,
    });

    const viewport = getAdjustedViewport(canvas, bitMap);

    // Передаем соотношение сторон изображения
    // const imageAspect = bitMap.width / bitMap.height;
    // uvScale = { u: imageAspect, v: 1.0 };

      // console.log(uvScale)
    const color = window
      .getComputedStyle(document.body)
      .getPropertyValue("--cds-ui-background");

    // Передаем соотношение сторон изображения
    const imageAspect = bitMap.width / bitMap.height;
    uvScale = { u: imageAspect, v: 1.0 };

    //   // console.log(uvScale)
    // const color = window
    //   .getComputedStyle(document.body)
    //   .getPropertyValue("--cds-ui-background");

    filter = new Core(
      context,
      device,
      presentationFormat,
      bitMap,
      viewport,
      rgbaToFloat(hexToRgbA(color))
    );

    // Рассчитываем начальный масштаб с отступом
    // Если изображение больше холста, уменьшаем его с отступом 20px
    const padding = 20;
    const scaleX = (canvas.width - padding * 2) / bitMap.width;
    const scaleY = (canvas.height - padding * 2) / bitMap.height;

    // Используем меньший масштаб, чтобы изображение поместилось с отступом
    scale = Math.min(scaleX, scaleY, 1.0);

    // Передаем размеры холста и изображения для правильного расчета в шейдере
    uvScale = {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      imageWidth: bitMap.width,
      imageHeight: bitMap.height
    };

    render();
  }

  async function saveTexture() {
    const pixelData = await filter!.upload();
    const canvas = new OffscreenCanvas(bitMap.width, bitMap.height);
    const context = canvas.getContext("2d");
    const imageData = context!.createImageData(bitMap.width, bitMap.height);

    // WebGPU использует формат RGBA, но ImageData тоже, так что можно копировать напрямую
    imageData.data.set(pixelData);

    context.putImageData(imageData, 0, 0);

    const blob = await canvas.convertToBlob({ type: file.type });
    const url = URL.createObjectURL(blob);

    window.open(url, "_blank");

    // Освобождаем память
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  function getAdjustedViewport(canvas, bitMap) {
    const imageAspect = bitMap.width / bitMap.height;
    const canvasAspect = canvas.width / canvas.height;
    let viewportWidth, viewportHeight;

    if (canvasAspect > imageAspect) {
      // Холст шире изображения
      viewportHeight = canvas.height;
      viewportWidth = canvas.height * imageAspect;
    } else {
      // Холст уже изображения
      viewportWidth = canvas.width;
      viewportHeight = canvas.width / imageAspect;
    }

    return {
      x: (canvas.width - viewportWidth) / 2,
      y: (canvas.height - viewportHeight) / 2,
      width: viewportWidth,
      height: viewportHeight,
    };
  }


  function resizeCanvas() {
    if (!canvas || !context || !device) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const newWidth = Math.floor(rect.width * devicePixelRatio);
    const newHeight = Math.floor(rect.height * devicePixelRatio);

    // Изменяем размер только если он действительно поменялся
    if (canvas.width !== newWidth || canvas.height !== newHeight) {
      canvas.width = newWidth;
      canvas.height = newHeight;

      context.configure({
        device,
        format: presentationFormat,
      });

      // Обновляем масштабы для шейдера
      uvScale = {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        imageWidth: bitMap.width,
        imageHeight: bitMap.height
      };

      render();
    }
  }

  onMount(() => {
    if (!canvas) {
      console.error("not instance canvas");
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });

    create(canvas).then(() => {
      resizeObserver.observe(canvas);
    });

    return () => {
      resizeObserver.disconnect();
    };
  });

  let size = $state(800);
  // const recreate = debounce(create, 250);

  let scale = $state(1);
  let offset = { x: 0, y: 0 };

  // Состояние для drag
  let isDragging = false;
  let lastMousePos = { x: 0, y: 0 };

  function handleMouseDown(event: MouseEvent) {
    isDragging = true;
    lastMousePos = { x: event.clientX, y: event.clientY };
  }

  function handleMouseMove(event: MouseEvent) {
    if (!isDragging) return;

    const deltaX = event.clientX - lastMousePos.x;
    const deltaY = event.clientY - lastMousePos.y;

    // Преобразуем смещение из пикселей экрана в координаты холста
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Конвертируем в NDC
    // deltaX по X, deltaY по Y (инвертируем, т.к. в экране Y идет вниз)
    offset.x += (deltaX * scaleX * 2) / canvas.width;
    offset.y -= (deltaY * scaleY * 2) / canvas.height;

    lastMousePos = { x: event.clientX, y: event.clientY };

    filter?.view(history.filters, { scale, offset, aspectRatio: uvScale });
  }

  function handleMouseUp() {
    isDragging = false;
  }

  function handleMouseLeave() {
    isDragging = false;
  }
  function changingsize(event: WheelEvent) {
    if(!event) {
      filter?.view(history.filters, { scale, offset, aspectRatio: uvScale });
      return;
    }

    const delta = -event.deltaY * 0.001;
    const newScale = Math.max(0.1, Math.min(10, scale * (1 + delta)));

    // Масштабирование относительно центра (без смещения)
    // offset остается неизменным при зуме
    scale = newScale;

    filter?.view(history.filters, { scale, offset, aspectRatio: uvScale });
  }
</script>

<div class="relative flex flex-col h-full justify-between overflow-hidden">
  <div class="flex justify-between w-full z-1">
    <Undo undo={history.back} />
    <Reset reset={() => history.reset()} />
  </div>
  <canvas
    bind:this={canvas}
    style={`--size: ${size}px`}
    onwheel={changingsize}
    onmousedown={handleMouseDown}
    onmousemove={handleMouseMove}
    onmouseup={handleMouseUp}
    onmouseleave={handleMouseLeave}
  ></canvas>

  <div class="flex justify-between w-full">
    <div></div>
    <Download download={saveTexture} />
  </div>
</div>

<style>
  canvas {
    position: absolute;
    /* z-index: -1; */
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    /* width: var(--size);
    height: var(--size); */
    width: 100%;
    height: 100%;
    color: #888;
    cursor: grab;
  }

  canvas:active {
    cursor: grabbing;
  }
</style>

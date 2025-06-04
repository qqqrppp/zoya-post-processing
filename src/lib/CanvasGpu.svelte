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
    filter?.view(history.filters);
  };

  $effect(render);

  let canvas: HTMLCanvasElement;
  let bitMap: ImageBitmap;

  async function create(canvas: HTMLCanvasElement) {
    if (!canvas) return;

    const adapter = await navigator.gpu?.requestAdapter();
    const device = await adapter?.requestDevice();

    if (!device) {
      console.error("not support gpu adapter");
      return;
    }

    bitMap = await createImageBitmap(file);

    const context = canvas.getContext("webgpu") as GPUCanvasContext;

    const devicePixelRatio = window.devicePixelRatio;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
      device,
      format: presentationFormat,
    });

    const viewport = getAdjustedViewport(canvas, bitMap);
    const color = window
      .getComputedStyle(document.body)
      .getPropertyValue("--cds-ui-background");

    filter = new Core(
      context,
      device,
      presentationFormat,
      bitMap,
      viewport,
      rgbaToFloat(hexToRgbA(color))
    );
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

  onMount(async () => {
    if (!canvas) {
      console.error("not instance canvas");
      return;
    }

    await create(canvas);
  });

  let size = $state(800);
  const recreate = debounce(create, 250);

  function changingsize(event: WheelEvent) {
    let direction = event.deltaY > 0 ? -1 : 1;
    let counter = 100;

    if (size > 200 && direction == -1) {
      size -= counter;
    } else if (size < 4000 && direction == 1) {
      size += counter;
    }

    // TODO: неоптимально
    requestAnimationFrame(
      recreate(canvas)
    )
  }

</script>

<div
  onwheel={changingsize}
  class="relative flex flex-col h-full justify-between overflow-hidden"
>
  <div class="flex justify-between w-full z-1 overflow-hidden">
    <Undo undo={history.back} />
    <Reset reset={() => history.reset()} />
  </div>
  <canvas bind:this={canvas} style={`--size: ${size}px`}></canvas>

  <div class="flex justify-between w-full z-1 overflow-hidden">
    <div></div>
    <Download download={saveTexture} />
  </div>
</div>

<style>
  canvas {
    position: absolute;
    z-index: -1;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: var(--size);
    height: var(--size);
    color: #888;
  }
</style>

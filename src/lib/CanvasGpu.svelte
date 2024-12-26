<script lang="ts">
  import { onMount, tick } from "svelte";
  import { Core, Blur, Saturation, Inverse, ColorCorrection, Contrast, Pixelate, Matrix } from "~/filters";
  import {
    pixelate,
    blur,
    saturation,
    inverse,
    color,
    contrast,
    matrix,
  } from "./settings/model.svelte";

  let { file } = $props();
  let filter = $state<Core>();

  const render = () => {
    filter?.view({
      [Matrix.name]: $matrix,
      [Blur.name]: $blur,
      [Saturation.name]: $saturation,
      [Pixelate.name]: $pixelate,
      [Inverse.name]: $inverse,
      [ColorCorrection.name]: $color,
      [Contrast.name]: $contrast,
    });
  };

  $effect(render)

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

    filter = new Core(context, device, presentationFormat, bitMap);
  }

  onMount(async () => {
    if (!canvas) {
      console.error("not instance canvas");
      return;
    }

    await create(canvas);
  });
</script>

<div class="wrapper">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  canvas {
    width: 500px;
    height: 500px;
    color: #888;
  }
</style>

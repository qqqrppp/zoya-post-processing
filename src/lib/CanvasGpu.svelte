<script lang="ts">
  import { onMount } from "svelte";
  import { Core } from "@/filters";
  import {
    blurFilter,
    grayFilter,
    pixelateFilter,
    matrixFilter,
    inverseFilter,
  } from "./settings/model.svelte";

  $effect(() => {
    render();
  });

  let { file } = $props();
  let filter = $state<Core>();

  const render = () => {
    filter?.view({
      Blur: blurFilter,
      Gray: grayFilter,
      Pixelate: pixelateFilter,
      Matrix: pixelateFilter,
      Inverse: inverseFilter,
    });
  };

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
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

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

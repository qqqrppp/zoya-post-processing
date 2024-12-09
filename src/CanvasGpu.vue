<script setup lang="ts">
import { throttle } from 'lodash'
import { onMounted, ref, defineProps, nextTick, computed, reactive, watchEffect, watch } from 'vue'
import { Core, GrayColorFactor } from './filters'
import type { BlurSettings, GraySettings, PixelateSettings } from './filters'

const canvas = ref<HTMLCanvasElement>();

const size = ref<HTMLInputElement>();
const props = defineProps<{ image: File, buffer: ArrayBuffer }>();
const bitMap = ref();

let filter: Core;

const blurFilter = reactive<BlurSettings>({
  filterSize: 10,
  iterations: 0,
})

const pixelateFilter = reactive<PixelateSettings>({
  pixelSize: 16,
})

const grayFilter = reactive<GraySettings>({
  coefficient: [1.0, 1.0, 1.0],
  variant: 0,
  colorFactor: [GrayColorFactor.R, GrayColorFactor.G, GrayColorFactor.B]
})

async function create(canvas: HTMLCanvasElement) {

  if (!canvas) return;

  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();

  if (!device) {
    console.error('not support gpu adapter')
    return;
  }

  bitMap.value = await createImageBitmap(props.image);

  await nextTick();

  const context = canvas.getContext('webgpu') as GPUCanvasContext;

  const devicePixelRatio = window.devicePixelRatio;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format: presentationFormat,
  });

  filter = new Core(context, device, presentationFormat, bitMap.value)
  render()
}

onMounted(async () => {
  if (!canvas.value) {
    console.error("not instance canvas");
    return;
  }

  await create(canvas.value)
})

const render = () => {
  filter.view({ 
    Blur: blurFilter, 
    Gray: grayFilter, 
    Pixelate: pixelateFilter, 
    Matrix: pixelateFilter,
    Inverse: grayFilter,
  })
}

const throttleRender = throttle(render, 100)

watch([blurFilter, grayFilter], () => {
  throttleRender();
})
</script>

<template>
  <div class="wrapper">
    <div>
      <canvas  ref="canvas" />
    </div>
    <input ref="size" v-model="blurFilter.filterSize" type="range" min="1" max="64" value="1" step="1" />
    <input ref="iter" v-model="blurFilter.iterations" type="range" min="0" max="8" value="0" step="1" />

    <pre>{{ blurFilter }}</pre>

    <input ref="size" v-model="grayFilter.coefficient[0]" type="range" min="0" max="1" value="0" step="0.1" />
    <input ref="size" v-model="grayFilter.coefficient[1]" type="range" min="0" max="1" value="0" step="0.1" />
    <input ref="size" v-model="grayFilter.coefficient[2]" type="range" min="0" max="1" value="0" step="0.1" />

    <input ref="iter" v-model="grayFilter.variant" type="range" min="0" max="2" value="1" step="1" />

    <input ref="size" v-model="grayFilter.colorFactor[0]" type="range" min="0" max="1" step="0.01" />
    <input ref="iter" v-model="grayFilter.colorFactor[1]" type="range" min="0" max="1" step="0.01" />
    <input ref="size" v-model="grayFilter.colorFactor[2]" type="range" min="0" max="1" step="0.01" />

    <pre>{{ grayFilter }}</pre>
  </div>
</template>

<style scoped>
.wrapper {
  display: flex;
  flex-flow: column;
}

canvas {
  width: 500px;
  height: 500px;
  color: #888;
}
</style>

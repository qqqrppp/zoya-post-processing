import { GrayColorFactor } from "@/filters/index";
import type { BlurSettings, GraySettings, InverseSettings, PixelateSettings } from "@/filters";

export let pixelateFilter = $state<PixelateSettings>({
  pixelSize: 0,
});

export const blurFilter = $state<BlurSettings>({
  filterSize: 0,
  iterations: 0,
})


export const grayFilter = $state<GraySettings>({
  variant: 0,
  coefficient: [1.0, 1.0, 1.0],
  colorFactor: [GrayColorFactor.R, GrayColorFactor.G, GrayColorFactor.B]
})

export const matrixFilter = $state({
  // filterSize: 0,
  // iterations: 0,
})

export const inverseFilter = $state<InverseSettings>({
  coefficient: [1.0, 1.0, 1.0],
})

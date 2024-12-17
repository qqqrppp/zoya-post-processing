import { GrayColorFactor } from "~/filters/index";
import type { BlurSettings, GraySettings, InverseSettings, PixelateSettings, ColorCorrectionSettings } from "~/filters";
import type { MatrixSettings } from "~/filters/matrix";

type Settings = BlurSettings | GraySettings | InverseSettings | PixelateSettings | ColorCorrectionSettings | MatrixSettings


// const snapshot = <T extends Settings>(obj: T): T => {
//   if(obj == null || typeof(obj) != 'object') {
//     return obj;
//   }

//   const temp = { ...obj };

//   for(var key in obj) {
//     if (obj.hasOwnProperty(key)) {
//       temp[key] = snapshot(obj[key]);
//     }
//   }

//   return temp;
// }

const reset = <T extends Settings>(current: T, init: T) => { 
  const newState = { ...init }
  for(let key in current) {
    current[key] = newState[key]
  }
}

//---------------Pixelate State-----------------------------
const initPixelate: PixelateSettings = {
  pixelSize: 0,
}

export const pixelateFilter = $state<PixelateSettings>({ ...initPixelate });

export const resetPixelate = () => reset(pixelateFilter, initPixelate)

//---------------Blur State-----------------------------
const initBlur: BlurSettings = {
  filterSize: 0,
  iterations: 0,
}

export const blurFilter = $state<BlurSettings>({ ...initBlur })

export const resetBlur = () => reset(blurFilter, initBlur)

//------------------Gray State--------------------------
const initGray: GraySettings = {
  variant: 0,
  coefficient: [1.0, 1.0, 1.0],
  colorFactor: [GrayColorFactor.R, GrayColorFactor.G, GrayColorFactor.B]
}

export const grayFilter = $state<GraySettings>({ ...initGray })

export const resetGray = () => reset(grayFilter, initGray)

//----------------Inverse state----------------------------
const initInverse: InverseSettings = {
  coefficient: [1.0, 1.0, 1.0],

}
export const inverseFilter = $state<InverseSettings>({ ...initInverse })

export const resetInverse = () => reset(inverseFilter, initInverse)

//------------------Color Correction State--------------------------
const initColor: ColorCorrectionSettings = {
  color: [0, 0, 0],
  reduction: [0,0,0]
}

export const colorFilter = $state<ColorCorrectionSettings>({ ...initColor })

export const resetColor = () => reset(colorFilter, initColor)

//------------------Color Correction State--------------------------
const initContrast: ColorCorrectionSettings = {
  color: [0, 0, 0],
  reduction: [0,0,0]
}

export const contrastFilter = $state<ColorCorrectionSettings>({ ...initContrast })

export const resetContrast = () => reset(contrastFilter, initContrast)

//------------------Color Correction State--------------------------
const initMatrix: MatrixSettings = {
  size: [0, 0],
  coefficient: [1.0,1.0,1.0],
  matrix: [
    -2.0, -1.0, 0.0,
    -1.0,  1.0, 1.0,
     0.0,  1.0, 2.0
  ]
}

export const matrixFilter = $state<MatrixSettings>({ ...initMatrix });

export const resetMatrix = () => reset(matrixFilter, initMatrix)

// export let commands = () => $derived([grayFilter, inverseFilter])

// $inspect([blurFilter, grayFilter]).with((type, value) => {
//   console.log(type, value)
// })

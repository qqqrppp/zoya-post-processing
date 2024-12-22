import { SaturationColorFactor } from "~/filters/index";
import type { BlurSettings, SaturationSettings, InverseSettings, PixelateSettings, ColorCorrectionSettings } from "~/filters";
import type { MatrixSettings } from "~/filters/matrix";

type Settings = BlurSettings | SaturationSettings | InverseSettings | PixelateSettings | ColorCorrectionSettings | MatrixSettings


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

//------------------Saturation State--------------------------
const initSaturation: SaturationSettings = {
  variant: 0,
  coefficient: [1.0, 1.0, 1.0],
  colorFactor: [SaturationColorFactor.R, SaturationColorFactor.G, SaturationColorFactor.B]
}

export const saturationFilter = $state<SaturationSettings>({ ...initSaturation })

export const resetSaturation = () => reset(saturationFilter, initSaturation)

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
  useColors: [2, 2, 2],
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

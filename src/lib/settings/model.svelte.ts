import { readable, toStore, writable } from "svelte/store";
import { SaturationColorFactor } from "~/filters/index";
import type {
  BlurSettings,
  SaturationSettings,
  InverseSettings,
  PixelateSettings,
  ColorCorrectionSettings,
} from "~/filters";
import type { MatrixSettings } from "~/filters/matrix";
import { untrack } from "svelte";

type Settings =
  | BlurSettings
  | SaturationSettings
  | InverseSettings
  | PixelateSettings
  | ColorCorrectionSettings
  | MatrixSettings;

//---------------Pixelate State-----------------------------
const initPixelate: PixelateSettings = {
  pixelSize: 0,
};

//---------------Blur State-----------------------------
const initBlur: BlurSettings = {
  filterSize: 0,
  iterations: 0,
};

//------------------Saturation State--------------------------
const initSaturation: SaturationSettings & { isLinkedCoefficient: boolean } = {
  isLinkedCoefficient: true,
  variant: 0,
  coefficient: [1.0, 1.0, 1.0],
  colorFactor: [
    SaturationColorFactor.R,
    SaturationColorFactor.G,
    SaturationColorFactor.B,
  ],
};

//----------------Inverse state----------------------------
const initInverse: InverseSettings & { isLinkedCoefficient: boolean} = {
  isLinkedCoefficient: true,
  coefficient: [100, 100, 100],
};

//------------------Color Correction State--------------------------
const initColor: ColorCorrectionSettings = {
  color: [0, 0, 0],
  reduction: [0, 0, 0],
};

//------------------Color Correction State--------------------------
const initContrast: ColorCorrectionSettings = {
  color: [0, 0, 0],
  reduction: [0, 0, 0],
};

//------------------Color Correction State--------------------------
const initMatrix: MatrixSettings & { isLinkedSize: boolean } = {
  isLinkedSize: true,
  size: [0, 0],
  useColors: [2, 2, 2],
  matrix: [0, 0, 0, 0, 1, 0, 0, 0, 0],
};

function createFilter<T extends Settings>(settings: T) {
  const { subscribe, set, update } = writable(settings);
  const init = structuredClone(settings);

  const reset = () => {
    set(structuredClone(init));
  };

  return {
    reset,
    set,
    subscribe,
    update,
  };
}

function createMatrix() {
  const model = createFilter(initMatrix);

  model.subscribe((v) => {
    if (v.isLinkedSize && v.size[0] !== v.size[1]) {
      model.set({
        ...v,
        size: [v.size[0], v.size[0]],
      });
    }
  });

  return model;
}

function createSaturation() {
  const model = createFilter(initSaturation);

  model.subscribe((v) => {
    if (
      v.isLinkedCoefficient
      && v.coefficient[0] !== v.coefficient[1]
      && v.coefficient[0] !== v.coefficient[2]
    ) {
      model.set({
        ...v,
        coefficient: [v.coefficient[0], v.coefficient[0], v.coefficient[0]],
      });
    }
  });

  return model;
}

function createInverse() {
  const model = createFilter(initInverse);

  model.subscribe((v) => {
    if (
      v.isLinkedCoefficient
      && v.coefficient[0] !== v.coefficient[1]
      && v.coefficient[0] !== v.coefficient[2]
    ) {
      model.set({
        ...v,
        coefficient: [v.coefficient[0], v.coefficient[0], v.coefficient[0]],
      });
    }
  });

  return model
}

export const pixelate = createFilter(initPixelate);
export const blur = createFilter(initBlur);
export const saturation = createSaturation();
export const inverse = createInverse();
export const color = createFilter(initColor);
export const contrast = createFilter(initContrast);
export const matrix = createMatrix();

// function createStore(init = []) {
//   const { subscribe, set, update } = writable(init);
//   let history = [];

//   // matrixFilter.

//   return {
//     subscribe,
//     getHistory: () => history
//   }
// }

// export const store = createStore();

// export let commands = derived([matrixFilter], ([$matrixFilter]) => {
//   console.log($matrixFilter);
//   return {
//     $matrixFilter
//   }
// });

// $inspect([blurFilter]).with((type, value) => {
//   console.log(type, value)
// })

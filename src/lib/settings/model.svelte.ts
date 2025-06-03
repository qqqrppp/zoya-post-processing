import { derived, readable, toStore, writable } from "svelte/store";
import { SaturationColorFactor } from "~/filters/index";
import type {
  BlurSettings,
  SaturationSettings,
  InverseSettings,
  PixelateSettings,
  ColorCorrectionSettings,
  PosterizationSettings,
} from "~/filters";
import {
  Core,
  Blur,
  Saturation,
  Inverse,
  ColorCorrection,
  Contrast,
  Pixelate,
  Matrix,
} from "~/filters";

import type { MatrixSettings } from "~/filters/matrix";
import { onMount, tick, untrack } from "svelte";
import debounce from "lodash/debounce";
import throttle from "lodash/throttle"
import { isEqualObject } from "~/helpers";
import { SimpleDither, type SimpleDitherSettings } from "~/filters/simpleDither";
import { Posterization } from "~/filters/posterization";

type Settings = (
  | BlurSettings
  | SaturationSettings
  | InverseSettings
  | PixelateSettings
  | ColorCorrectionSettings
  | MatrixSettings
  | SimpleDitherSettings
);

//---------------Pixelate State-----------------------------
const initPixelate: PixelateSettings = {
  name: Pixelate.name,
  pixelSize: 0,
};

//---------------Blur State-----------------------------
const initBlur: BlurSettings = {
  name: Blur.name,
  filterSize: 0,
  iterations: 0,
};

//------------------Saturation State--------------------------
const initSaturation: SaturationSettings = {
  name: Saturation.name,
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
const initInverse: InverseSettings = {
  name: Inverse.name,
  isLinkedCoefficient: true,
  coefficient: [100, 100, 100],
};

//------------------Color Correction State--------------------------
const initColor: ColorCorrectionSettings = {
  name: ColorCorrection.name,
  color: [0, 0, 0],
  reduction: [0, 0, 0],
};

//------------------Color Correction State--------------------------
const initContrast: ColorCorrectionSettings = {
  name: Contrast.name,
  color: [0, 0, 0],
  reduction: [0, 0, 0],
};

//------------------Color Correction State--------------------------
const initMatrix: MatrixSettings = {
  name: Matrix.name,
  isLinkedSize: true,
  size: [0, 0],
  useColors: [2, 2, 2],
  matrix: [0, 0, 0, 0, 1, 0, 0, 0, 0],
};

const initSimpleDither: SimpleDitherSettings = {
  name: SimpleDither.name,
  variant: 0,
  isLinkedLevel: true,
  levels: [4,4,4],
  equalizing: 0.5,
}

const initPosterization: PosterizationSettings = {
  name: Posterization.name,
  variant: 0,
  isLinkedLevel: true,
  levels: [0,0,0],
}

function createFilter<T extends Settings>(settings: T) {
  const history: T[] = [structuredClone(settings), structuredClone(settings)];
  const init = structuredClone(settings);
  let current = writable(settings);

  type Pub = (data: T) => void;
  let subs: Pub[] = []

  const pub = (data: T) => {
    subs.forEach(publisher => publisher(data))
  };
  const sub = (publisher: Pub) => {
    subs.push(publisher);
  };

  const reset = () => {
    untrack(() => { // todo: нужен ли он???
      current.set(structuredClone(init));
      history[0] = structuredClone(init)
      history[1] = structuredClone(init)
    });
  };

  const untrackSet = (value: T, prev?: T) => {
    untrack(() => { // todo: нужен ли он???
      current.set(structuredClone(value))

      history[0] = structuredClone(prev || init)
      history[1] = structuredClone(value)
    });
  };

  const historyUpdate = (v: T) => { // todo: какой то тупой метод проверки оновления
    history.push(structuredClone(v));

    if (history.length > 2) {
      history.shift()
    }
  }

  const set = (value: T) => {
    if (isEqualObject(history[1], value)) return;

    historyUpdate(value);
    // current.set(structuredClone(value));
    current.set(value);

    pub(value);
  };


  return {
    name: settings.name,
    set,
    update: current.update,
    subscribe: current.subscribe,
    sub,
    reset,
    untrackSet,
    get current() {
      return history[1]; 
    },
    get prev() {
      return history[0];
    },
    get init() {
      return init;
    }
  };
}

const pixelate = createFilter(initPixelate);
const blur = createFilter(initBlur);
const matrix = createFilter(initMatrix);
const saturation = createFilter(initSaturation);
const inverse = createFilter(initInverse);
const color = createFilter(initColor);
const contrast = createFilter(initContrast);
const simpleDither = createFilter(initSimpleDither)
const posterization = createFilter(initPosterization)


// const filters = {
//   [Pixelate.name]: pixelate
//   [Blur.name]: blur
//   [Matrix.name]: matrix
//   [Saturation.name]: saturation
//   [Inverse.name]: inverse
//   [ColorCorrection.name]: color
//   [Matrix.name]: contrast

// }

function createHistory() {
  let position = $state(0);
  // const list: Settings[] = [];
  let list = $state<Settings[]>([]);

  const current = $derived( list[position - 1] )

  const filters = [
    pixelate,
    matrix,
    blur,
    saturation,
    inverse,
    color,
    contrast,
    simpleDither,
    posterization
  ]

  const currentFilter = $derived.by(() => {
    return filters.find(x => x.init.name == current.name)
  })

  const getFilter = (name: string) => {
    return filters.find(x => x.init.name == name)
  }

  // const actualFilters = $derived.by(() => {
  //   let newFilters = Object.groupBy(v, ({ name }) => name)

  //   for (let i in newFilters) {
  //     if (newFilters[i]) {
  //       newFilters[i] = newFilters[i]?.at(-1)
  //     }
  //   }

  //   return newFilters
  // })
  // todo не удалять а двигаться по истории вверх вниз
  // после update стираем историю до индекса для конкретного фильтра если наш индекс ниже чем значение фильтра


  const back = () => {
    if (position > 1) {
      position -= 1;

      currentFilter?.untrackSet($state.snapshot(current))
    } else {
      reset()
    }
  }

  const reset = (name?: string) => {
    if (name) {
      const filter = getFilter(name)
      filter?.reset()
      const newList = list.filter((x) => x.name !== name)
      position = newList.length
      list = [...newList]
    } else {
      filters.forEach(x => x.reset())
      position = 0
      list = []
    }
  }

  const updateHistory = (data: Settings) => {
      list.push(data);
      position += 1;
      return
  };

  const throttleUpdateHistory = throttle(updateHistory, 200);

  for (let filter of filters) {
    filter.sub(throttleUpdateHistory);
  }

  return {
    back,
    reset,
    get list() {
      return list
    },
    get position() {
      return position;
    },
    get filters() {
      const filters = Object.groupBy(list.slice(0, position), ({name}) => name)
      let newFilters: Record<string, Settings | undefined> = {}
      for (let i in filters) {
          newFilters[i] = filters[i]!.at(-1)
      }

      return newFilters
    }
  }
}

const history = createHistory();

export {
  history,
  pixelate,
  blur,
  matrix,
  saturation,
  inverse,
  color,
  contrast,
  simpleDither,
  posterization,
};

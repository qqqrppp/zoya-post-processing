<script lang="ts">
  import { untrack } from "svelte";
  import {
    RadioButton,
    RadioButtonGroup,
  } from "carbon-components-svelte";
  import Slider from "~/ui/Slider.svelte";
  import Reset from "~/ui/Reset.svelte";

  import { blur, gaussianBlur } from "./model.svelte";

  // Локальное состояние для выбора типа размытия: "box" или "gaussian"
  let blurType = $state($gaussianBlur.filterSize > 0 ? "gaussian" : "box");

  // Синхронизация типов размытия при изменениях сторов (например, Undo/Redo)
  $effect(() => {
    if ($gaussianBlur.filterSize > 0 && blurType !== "gaussian") {
      blurType = "gaussian";
    } else if ($blur.filterSize > 0 && blurType !== "box") {
      blurType = "box";
    }
  });

  // Эффект бесшовного переноса настроек при переключении типа пользователем в UI
  $effect(() => {
    const currentType = blurType;
    untrack(() => {
      if (currentType === "gaussian") {
        if ($blur.filterSize > 0) {
          const size = $blur.filterSize;
          // У Gaussian Blur максимальный предел итераций равен 5
          const iters = Math.min($blur.iterations, 5);
          $blur.filterSize = 0;
          $blur.iterations = 0;
          $gaussianBlur.filterSize = size;
          $gaussianBlur.iterations = iters;
        }
      } else {
        if ($gaussianBlur.filterSize > 0) {
          const size = $gaussianBlur.filterSize;
          const iters = $gaussianBlur.iterations;
          $gaussianBlur.filterSize = 0;
          $gaussianBlur.iterations = 0;
          $blur.filterSize = size;
          $blur.iterations = iters;
        }
      }
    });
  });

  // Сброс обоих фильтров
  function handleReset() {
    blur.reset();
    gaussianBlur.reset();
    blurType = "box";
  }
</script>

<div class="settings-group">
  <div>
    <RadioButtonGroup
      legendText="Variant"
      name="blur-variant"
      bind:selected={blurType}
    >
      <RadioButton labelText="Box Blur (Fast)" value="box" />
      <RadioButton labelText="Gaussian Blur" value="gaussian" />
    </RadioButtonGroup>

    {#if blurType === "box"}
      <div style="margin-top: 1rem;">
        <Slider
          labelText="Filter size"
          min={0}
          max={96}
          step={1}
          bind:value={$blur.filterSize}
        />
      </div>
      <Slider
        labelText="Iterations"
        min={0}
        max={10}
        step={1}
        bind:value={$blur.iterations}
      />
    {:else}
      <div style="margin-top: 1rem;">
        <Slider
          labelText="Radius"
          min={0}
          max={96}
          step={1}
          bind:value={$gaussianBlur.filterSize}
        />
      </div>
      <Slider
        labelText="Iterations"
        min={0}
        max={5}
        step={1}
        bind:value={$gaussianBlur.iterations}
      />
    {/if}
  </div>

  <Reset reset={handleReset} />
</div>

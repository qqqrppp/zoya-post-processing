<script lang="ts">
  import {
    Checkbox,
    RadioButton,
    RadioButtonGroup,
  } from "carbon-components-svelte";
  import Slider from "~/ui/Slider.svelte";
  import Reset from "~/ui/Reset.svelte";
  import { PosterizationVariant } from "~/filters";
  import { posterization, history } from "./model.svelte";
</script>

<div class="settings-group">
  <div>
    <RadioButtonGroup
      legendText="Variant"
      name="posterization-variant"
      bind:selected={$posterization.variant}
    >
      <RadioButton labelText="Standard RGB" value={PosterizationVariant.standard} />
      <RadioButton labelText="HSV Style" value={PosterizationVariant.hsv} />
      <RadioButton labelText="Oklab (Perceptual)" value={PosterizationVariant.oklab} />
      <RadioButton labelText="Adaptive (Detail-aware)" value={PosterizationVariant.adaptive} />
    </RadioButtonGroup>

    <div class="pt-3">
      <Checkbox labelText="Linked level" bind:checked={$posterization.isLinkedLevel} />
    </div>

    <div style="margin-top: 1rem;">
      {#if $posterization.isLinkedLevel}
        <Slider
          labelText={
            $posterization.variant === PosterizationVariant.hsv ? "Colors (Hue)" :
            $posterization.variant === PosterizationVariant.oklab ? "Lightness steps" :
            "Level"
          }
          min={1}
          max={64}
          step={1}
          bind:value={$posterization.levels[0]}
        />
      {:else}
        <Slider
          labelText={
            $posterization.variant === PosterizationVariant.hsv ? "Hue (H) steps" :
            $posterization.variant === PosterizationVariant.oklab ? "Lightness (L) steps" :
            "Level R"
          }
          min={1}
          max={64}
          step={1}
          bind:value={$posterization.levels[0]}
        />
        <Slider
          labelText={
            $posterization.variant === PosterizationVariant.hsv ? "Saturation (S) steps" :
            $posterization.variant === PosterizationVariant.oklab ? "Chroma A (green-red) steps" :
            "Level G"
          }
          min={1}
          max={64}
          step={1}
          bind:value={$posterization.levels[1]}
        />
        <Slider
          labelText={
            $posterization.variant === PosterizationVariant.hsv ? "Value (V) steps" :
            $posterization.variant === PosterizationVariant.oklab ? "Chroma B (blue-yellow) steps" :
            "Level B"
          }
          min={1}
          max={64}
          step={1}
          bind:value={$posterization.levels[2]}
        />
      {/if}
    </div>


    {#if $posterization.variant === PosterizationVariant.adaptive}
      <div>
        <Slider
          labelText="Detail threshold (preserve edges)"
          min={0.0}
          max={1.0}
          step={0.05}
          bind:value={$posterization.detailThreshold}
        />
      </div>
    {/if}
  </div>

  <Reset reset={() => history.reset(posterization.name)} />
</div>

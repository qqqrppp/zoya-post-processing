<script lang="ts">
  import {
    Checkbox,
    RadioButton,
    RadioButtonGroup,
  } from "carbon-components-svelte";
  import Slider from "~/ui/Slider.svelte";
  import { DitherVariant } from "~/filters";
  import { simpleDither, history } from "./model.svelte";
  import Reset from "~/ui/Reset.svelte";
</script>

<div class="settings-group">
  <div>
    <RadioButtonGroup
      orientation="vertical"
      legendText="Variant"
      name="dither-variant"
      bind:selected={$simpleDither.variant}
    >
      <RadioButton labelText="Bayer 4x4" value={DitherVariant.bayer4x4} />
      <RadioButton labelText="Bayer 8x8" value={DitherVariant.bayer8x8} />
      <RadioButton labelText="Bayer 16x16" value={DitherVariant.bayer16x16} />
      <RadioButton labelText="Noise Grain" value={DitherVariant.noise} />
      <RadioButton labelText="Halftone Dots" value={DitherVariant.halftone} />
    </RadioButtonGroup>

    <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
      <Checkbox
        labelText="Monochrome (B&W) Retro"
        bind:checked={$simpleDither.monochrome}
      />
      <Checkbox
        labelText="Linked colors"
        bind:checked={$simpleDither.isLinkedLevel}
      />
    </div>

    <div style="margin-top: 1rem;">
      <Slider
        labelText="Pattern size (Scale)"
        min={1}
        max={16}
        step={1}
        bind:value={$simpleDither.scale}
      />
    </div>

    <div style="margin-top: 1rem;">
      <Slider
        labelText="Equalizing"
        min={-1.0}
        max={1.0}
        step={0.05}
        bind:value={$simpleDither.equalizing}
      />
    </div>

    <div style="margin-top: 1rem;">
      {#if $simpleDither.isLinkedLevel}
        <Slider
          labelText={$simpleDither.monochrome ? "Gray shades" : "Color steps"}
          min={1}
          max={64}
          step={1}
          bind:value={$simpleDither.levels[0]}
        />
      {:else}
        <Slider
          labelText="Level R"
          min={1}
          max={64}
          step={1}
          bind:value={$simpleDither.levels[0]}
        />
        <Slider
          labelText="Level G"
          min={1}
          max={64}
          step={1}
          bind:value={$simpleDither.levels[1]}
        />
        <Slider
          labelText="Level B"
          min={1}
          max={64}
          step={1}
          bind:value={$simpleDither.levels[2]}
        />
      {/if}
    </div>
  </div>

  <Reset reset={() => history.reset(simpleDither.name)} />
</div>

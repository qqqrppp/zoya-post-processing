<script lang="ts">
  import {
    RadioButton,
    RadioButtonGroup,
  } from "carbon-components-svelte";
  import Slider from "~/ui/Slider.svelte";
  import Reset from "~/ui/Reset.svelte";
  import { PixelateVariant } from "~/filters";
  import { pixelate, history } from "./model.svelte";
</script>

<div class="settings-group">
  <div>
    <RadioButtonGroup
      legendText="Variant"
      name="pixelate-variant"
      bind:selected={$pixelate.variant}
    >
      <RadioButton labelText="Standard" value={PixelateVariant.standard} />
      <RadioButton labelText="Average" value={PixelateVariant.average} />
      <RadioButton labelText="Retro Grid" value={PixelateVariant.grid} />
      <RadioButton labelText="LED Dot" value={PixelateVariant.dot} />
    </RadioButtonGroup>

    <div style="margin-top: 1rem;">
      <Slider
        labelText="Pixel size"
        min={0}
        max={128}
        step={1}
        bind:value={$pixelate.pixelSize}
      />
    </div>
  </div>

  <Reset reset={() => history.reset(pixelate.name)} />
</div>

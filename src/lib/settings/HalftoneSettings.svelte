<script lang="ts">
  import {
    Checkbox,
    RadioButton,
    RadioButtonGroup,
  } from "carbon-components-svelte";
  import Slider from "~/ui/Slider.svelte";
  import { HalftoneVariant } from "~/filters";
  import { halftone, history } from "./model.svelte";
  import Reset from "~/ui/Reset.svelte";
</script>

<div class="settings-group">
  <div>
    <RadioButtonGroup
      legendText="Variant"
      name="halftone-variant"
      bind:selected={$halftone.variant}
    >
      <RadioButton labelText="CMYK / RGB" value={HalftoneVariant.cmyk} />
      <RadioButton labelText="Average color" value={HalftoneVariant.average} />
    </RadioButtonGroup>

    <div>
      <Slider
        labelText="Dot size"
        min={0}
        max={32}
        step={1}
        bind:value={$halftone.dotSize}
      />
    </div>

    <div>
      <Slider
        labelText="Angle (°)"
        min={0}
        max={90}
        step={5}
        bind:value={$halftone.angle}
      />
    </div>

    <div>
      <Slider
        labelText="Edge smoothness"
        min={0.0}
        max={1.0}
        step={0.05}
        bind:value={$halftone.smoothness}
      />
    </div>

    <div>
      <Slider
        labelText="Edge merge"
        min={0.0}
        max={1.0}
        step={0.05}
        bind:value={$halftone.merge}
      />
    </div>

    <div>
      <Slider
        labelText="Max dot radius"
        min={0.3}
        max={0.95}
        step={0.01}
        bind:value={$halftone.radiusK}
      />
    </div>

    <div>
      <Checkbox
        labelText="Monochrome (B&W)"
        bind:checked={$halftone.monochrome}
      />
      <Checkbox
        labelText="Invert"
        bind:checked={$halftone.invert}
      />
    </div>


  </div>

  <Reset reset={() => history.reset(halftone.name)} />
</div>

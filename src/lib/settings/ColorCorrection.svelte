<script lang="ts">
  import {
    Checkbox,
    RadioButton,
    RadioButtonGroup,
  } from "carbon-components-svelte";
  import Slider from "~/ui/Slider.svelte";
  import { Variant } from "~/filters/gray";
  import { colorFilter, resetColor } from "./model.svelte";
  import Reset from "./_Reset.svelte";
</script>

<div class="settings-group">
  <div>
    <Slider
      variant="R"
      labelText="Correction R"
      min={-50}
      max={50}
      step={0.1}
      bind:value={colorFilter.color[0]}
    />
    <Slider
      variant="G"
      labelText="Correction G"
      min={-50}
      max={50}
      step={0.1}
      bind:value={colorFilter.color[1]}
    />
    <Slider
      variant="B"
      labelText="Correction B"
      min={-50}
      max={50}
      step={0.1}
      bind:value={colorFilter.color[2]}
    />
  </div>
  <div>
    <Slider
      variant="R"
      labelText="Reduction R"
      min={-1}
      max={1}
      step={0.01}
      bind:value={colorFilter.reduction[0]}
    />
    <Slider
      variant="G"
      labelText="Reduction G"
      min={-1}
      max={1}
      step={0.01}
      bind:value={colorFilter.reduction[1]}
    />
    <Slider
      variant="B"
      labelText="Reduction B"
      min={-1}
      max={1}
      step={0.01}
      bind:value={colorFilter.reduction[2]}
    />
  </div>
  <Reset reset={resetColor} />
</div>

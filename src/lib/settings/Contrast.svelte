<script lang="ts">
  import Slider from "~/ui/Slider.svelte";
  import { contrastFilter, resetContrast } from "./model.svelte";
  import Reset from "./_Reset.svelte";


  $effect(() => {
    contrastFilter.color[1] = contrastFilter.color[0];
    contrastFilter.color[2] = contrastFilter.color[0];
  });

  $effect(() => {
    contrastFilter.reduction[1] = contrastFilter.reduction[0];
    contrastFilter.reduction[2] = contrastFilter.reduction[0];
  });
</script>

<div class="settings-group">
  <div>
    <Slider
      labelText="Contrast"
      min={-50}
      max={50}
      step={0.1}
      bind:value={contrastFilter.color[0]}
    />

  </div>
  <div>
    <!-- variant="R" -->
    <Slider
      labelText="Reduction R"
      min={-1}
      max={1}
      step={0.1}
      bind:value={contrastFilter.reduction[0]}
    />
    <!-- <Slider
      variant="G"
      labelText="Reduction G"
      min={-1}
      max={1}
      step={0.1}
      bind:value={contrastFilter.reduction[1]}
    />
    <Slider
      variant="B"
      labelText="Reduction B"
      min={-1}
      max={1}
      step={0.1}
      bind:value={contrastFilter.reduction[2]}
    /> -->
  </div>
  <Reset reset={resetContrast} />
</div>

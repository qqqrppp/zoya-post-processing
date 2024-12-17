<script lang="ts">
  import Slider from "~/ui/Slider.svelte";
  // import { Slider } from "carbon-components-svelte"; // TODO вернуть как было
  import Reset from "./_Reset.svelte";

  import { blurFilter, resetBlur } from "./model.svelte";
</script>

<div class="settings-group">
  <Slider
    labelText="Filter size"
    min={0}
    max={96}
    step={1}
    bind:value={blurFilter.filterSize}
  />
  <!-- bind:value={blurFilter.filterSize} -->
  <Slider
    labelText="Iterations"
    min={0}
    max={10}
    step={1}
    bind:value={blurFilter.iterations}
  />

  <Reset reset={resetBlur} />
</div>

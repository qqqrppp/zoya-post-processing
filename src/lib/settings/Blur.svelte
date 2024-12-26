<script lang="ts">
  import Slider from "~/ui/Slider.svelte";
  import Reset from "./_Reset.svelte";

  import { blur } from "./model.svelte";
</script>

<div class="settings-group">
  <Slider
    labelText="Filter size"
    min={0}
    max={96}
    step={1}
    bind:value={$blur.filterSize}
  />
  <Slider
    labelText="Iterations"
    min={0}
    max={10}
    step={1}
    bind:value={$blur.iterations}
  />

  <Reset reset={blur.reset} />
</div>

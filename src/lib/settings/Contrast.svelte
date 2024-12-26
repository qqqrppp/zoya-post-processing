<script lang="ts">
  import Slider from "~/ui/Slider.svelte";
  import Reset from "./_Reset.svelte";
  import { contrast } from "./model.svelte";

  let color = $state($contrast.color[0])
  $effect(() => {
    $contrast.color[0] = color;
    $contrast.color[1] = color;
    $contrast.color[2] = color;
  });

  let reduction = $state($contrast.reduction[0])
  $effect(() => {
    $contrast.reduction[0] = reduction;
    $contrast.reduction[1] = reduction;
    $contrast.reduction[2] = reduction;
  });

  function reset() {
    contrast.reset();
    color = $contrast.color[0];
    reduction = $contrast.reduction[0];
  }
</script>

<div class="settings-group">
  <div>
    <Slider
      labelText="Contrast"
      min={-100}
      max={100}
      step={1}
      bind:value={color}
    />

  </div>
  <div>
    <Slider
      labelText="Reduction"
      min={-1}
      max={1}
      step={0.1}
      bind:value={reduction}
    />
  </div>
  <Reset reset={reset} />
</div>

<script lang="ts">
  import { Checkbox } from "carbon-components-svelte";
  import Slider from "@/ui/Slider.svelte";
  import { inverseFilter } from "./model.svelte";
  let checked = $state(false);
  let linkedCoefficient = $state(1);

  $effect(() => {
    inverseFilter.coefficient[0] = $state.snapshot(linkedCoefficient);
    inverseFilter.coefficient[1] = $state.snapshot(linkedCoefficient);
    inverseFilter.coefficient[2] = $state.snapshot(linkedCoefficient);
  });
</script>

<div class="settings-group">
  <div>
    <Checkbox labelText="Linked Coefficient" bind:checked />
    {#if !checked}
      <Slider
        labelText="Coefficient"
        light
        min={0}
        max={1}
        step={0.1}
        bind:value={linkedCoefficient}
      />
    {:else}
      <Slider
        variant="R"
        labelText="Coefficient R"
        light
        min={0}
        max={1}
        step={0.1}
        bind:value={inverseFilter.coefficient[0]}
      />
      <Slider
        variant="G"
        labelText="Coefficient G"
        light
        min={0}
        max={1}
        step={0.1}
        bind:value={inverseFilter.coefficient[1]}
      />
      <Slider
        variant="B"
        labelText="Coefficient B"
        light
        min={0}
        max={1}
        step={0.1}
        bind:value={inverseFilter.coefficient[2]}
      />
    {/if}
  </div>
  <!-- <Slider
      labelText="Coefficient"
      light
      min={0}
      max={1}
      step={0.1}
      bind:value={inverseFilter.coefficient}
    /> -->
</div>

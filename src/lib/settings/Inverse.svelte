<script lang="ts">
  import { Checkbox } from "carbon-components-svelte";
  import Slider from "~/ui/Slider.svelte";
  import { inverseFilter, resetInverse } from "./model.svelte";
  import Reset from "./_Reset.svelte";

  let checked = $state(true);

  $effect(() => {
    if (checked) {
      inverseFilter.coefficient[1] = inverseFilter.coefficient[0];
      inverseFilter.coefficient[2] = inverseFilter.coefficient[0];
    }
  });
</script>

<div class="settings-group">
  <div>
    <Checkbox labelText="Linked Coefficient" bind:checked />
    {#if checked}
      <Slider
        labelText="Coefficient"
        min={0}
        max={1}
        step={0.1}
        bind:value={inverseFilter.coefficient[0]}
      />
    {:else}
      <Slider
        variant="R"
        labelText="Coefficient R"
        min={0}
        max={2}
        step={0.01}
        bind:value={inverseFilter.coefficient[0]}
      />
      <Slider
        variant="G"
        labelText="Coefficient G"
        min={0}
        max={2}
        step={0.01}
        bind:value={inverseFilter.coefficient[1]}
      />
      <Slider
        variant="B"
        labelText="Coefficient B"
        min={0}
        max={2}
        step={0.01}
        bind:value={inverseFilter.coefficient[2]}
      />
    {/if}
  </div>
  <Reset reset={resetInverse} />
</div>

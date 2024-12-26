<script lang="ts">
  import { Checkbox } from "carbon-components-svelte";
  import Slider from "~/ui/Slider.svelte";
  import Reset from "./_Reset.svelte";
  import { inverse } from "./model.svelte";

</script>

<div class="settings-group">
  <div>
    <Checkbox labelText="Linked Coefficient" bind:checked={$inverse.isLinkedCoefficient} />
    {#if $inverse.isLinkedCoefficient}
      <Slider
        labelText="Coefficient"
        min={0}
        max={100}
        step={1}
        bind:value={$inverse.coefficient[0]}
      />
    {:else}
      <Slider
        variant="R"
        labelText="Coefficient R"
        min={0}
        max={100}
        step={1}
        bind:value={$inverse.coefficient[0]}
      />
      <Slider
        variant="G"
        labelText="Coefficient G"
        min={0}
        max={100}
        step={1}
        bind:value={$inverse.coefficient[1]}
      />
      <Slider
        variant="B"
        labelText="Coefficient B"
        min={0}
        max={100}
        step={1}
        bind:value={$inverse.coefficient[2]}
      />
    {/if}
  </div>
  <Reset reset={inverse.reset} />
</div>

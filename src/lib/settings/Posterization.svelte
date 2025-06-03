<script lang="ts">
  import {
    Checkbox,
    RadioButton,
    RadioButtonGroup,
  } from "carbon-components-svelte";
  import Slider from "~/ui/Slider.svelte";
  import { Variant } from "~/filters/simpleDither";
  import { posterization } from "./model.svelte";
  import Reset from "~/ui/Reset.svelte";
</script>

<div class="settings-group">
  <div>
    <Checkbox class="pt-3" labelText="Linked level" bind:checked={$posterization.isLinkedLevel} />

    {#if $posterization.isLinkedLevel}
      <Slider
        labelText="Level"
        min={0}
        max={20}
        step={0.1}
        bind:value={$posterization.levels[0]}
      />
    {:else}
      <Slider
        labelText="Level R"
        min={0}
        max={20}
        step={0.1}
        bind:value={$posterization.levels[0]}
      />
      <Slider
        labelText="Level G"
        min={0}
        max={20}
        step={0.1}
        bind:value={$posterization.levels[1]}
      />
      <Slider
        labelText="Level B"
        min={0}
        max={20}
        step={0.1}
        bind:value={$posterization.levels[2]}
      />
    {/if}
  </div>
  <!-- <Reset reset={inverse.reset} /> -->
</div>

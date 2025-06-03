<script lang="ts">
  import {
    Checkbox,
    RadioButton,
    RadioButtonGroup,
  } from "carbon-components-svelte";
  import Slider from "~/ui/Slider.svelte";
  import { Variant } from "~/filters/simpleDither";
  import { simpleDither } from "./model.svelte";
  import Reset from "~/ui/Reset.svelte";
</script>

<div class="settings-group">
  <div>
    <RadioButtonGroup
      legendText="Variant"
      name="plan"
      bind:selected={$simpleDither.variant}
    >
      <RadioButton labelText="Disable" value={Variant.disable} />
      <RadioButton labelText="4x4" value={Variant.grid4x4} />
      <RadioButton labelText="8x8" value={Variant.grid8x8} />
      <RadioButton labelText="16x16" value={Variant.grid16x16} />
    </RadioButtonGroup>

    <Checkbox
      class="pt-3"
      labelText="Linked level"
      bind:checked={$simpleDither.isLinkedLevel}
    />

    {#if $simpleDither.isLinkedLevel}
      <Slider
        labelText="Level"
        min={0.1}
        max={10.0}
        step={0.1}
        bind:value={$simpleDither.levels[0]}
      />
    {:else}
      <Slider
        labelText="Level R"
        min={0.1}
        max={10.0}
        step={0.1}
        bind:value={$simpleDither.levels[0]}
      />
      <Slider
        labelText="Level G"
        min={0.1}
        max={10.0}
        step={0.1}
        bind:value={$simpleDither.levels[1]}
      />
      <Slider
        labelText="Level B"
        min={0.1}
        max={10.0}
        step={0.1}
        bind:value={$simpleDither.levels[2]}
      />
    {/if}
    <!-- <Slider
      labelText="Equalizing"
      min={-1.0}
      max={1.0}
      step={0.1}
      bind:value={$simpleDither.equalizing}
    /> -->
  </div>
  <!-- <Reset reset={inverse.reset} /> -->
</div>

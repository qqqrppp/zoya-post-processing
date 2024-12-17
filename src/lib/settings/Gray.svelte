<script lang="ts">
  import {
    Checkbox,
    RadioButton,
    RadioButtonGroup,
  } from "carbon-components-svelte";
  import Slider from "~/ui/Slider.svelte";
  import { Variant } from "~/filters/gray";
  import { grayFilter, resetGray } from "./model.svelte";
  import Reset from "./_Reset.svelte";

  let checked = $state(true);

  $effect(() => {
    if (checked) {
      grayFilter.coefficient[1] = grayFilter.coefficient[0];
      grayFilter.coefficient[2] = grayFilter.coefficient[0];
    }
  });
</script>

<div class="settings-group">
  <RadioButtonGroup
    legendText="Variant"
    name="plan"
    bind:selected={grayFilter.variant}
  >
    <RadioButton labelText="Lightness" value={Variant.lightness} />
    <RadioButton labelText="Average" value={Variant.average} />
    <RadioButton labelText="Luminosity" value={Variant.luminosity} />
  </RadioButtonGroup>
  <div>
    <Checkbox labelText="Linked Coefficient" bind:checked />
    {#if checked}
      <Slider
        labelText="Coefficient"
        min={0}
        max={5}
        step={0.1}
        bind:value={grayFilter.coefficient[0]}
      />
    {:else}
      <Slider
        variant="R"
        labelText="Coefficient R"
        min={0}
        max={5}
        step={0.1}
        bind:value={grayFilter.coefficient[0]}
      />
      <Slider
        variant="G"
        labelText="Coefficient G"
        min={0}
        max={5}
        step={0.1}
        bind:value={grayFilter.coefficient[1]}
      />
      <Slider
        variant="B"
        labelText="Coefficient B"
        min={0}
        max={5}
        step={0.1}
        bind:value={grayFilter.coefficient[2]}
      />
    {/if}
  </div>
  <div>
    {#if grayFilter.variant == 2}
      <Slider
        variant="R"
        labelText="Color Factor R"
        min={0}
        max={1}
        step={0.1}
        bind:value={grayFilter.colorFactor[0]}
      />
      <Slider
        variant="G"
        labelText="Color Factor G"
        min={0}
        max={1}
        step={0.1}
        bind:value={grayFilter.colorFactor[1]}
      />
      <Slider
        variant="B"
        labelText="Color Factor B"
        min={0}
        max={1}
        step={0.1}
        bind:value={grayFilter.colorFactor[2]}
      />
    {/if}
  </div>
  <Reset reset={resetGray} />
</div>

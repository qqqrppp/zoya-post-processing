<script lang="ts">
  import {
    Checkbox,
    RadioButton,
    RadioButtonGroup,
  } from "carbon-components-svelte";
  import Slider from "@/ui/Slider.svelte";
  import { grayFilter } from "./model.svelte";
  import { Variant } from "@/filters/gray";

  let checked = $state(false);
  let linkedCoefficient = $state(1);

  $effect(() => {
    grayFilter.coefficient[0] = $state.snapshot(linkedCoefficient);
    grayFilter.coefficient[1] = $state.snapshot(linkedCoefficient);
    grayFilter.coefficient[2] = $state.snapshot(linkedCoefficient);
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
        bind:value={grayFilter.coefficient[0]}
      />
      <Slider
        variant="G"
        labelText="Coefficient G"
        light
        min={0}
        max={1}
        step={0.1}
        bind:value={grayFilter.coefficient[1]}
      />
      <Slider
        variant="B"
        labelText="Coefficient B"
        light
        min={0}
        max={1}
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
        light
        min={0}
        max={1}
        step={0.1}
        bind:value={grayFilter.colorFactor[0]}
      />
      <Slider
        variant="G"
        labelText="Color Factor G"
        light
        min={0}
        max={1}
        step={0.1}
        bind:value={grayFilter.colorFactor[1]}
      />
      <Slider
        variant="B"
        labelText="Color Factor B"
        light
        min={0}
        max={1}
        step={0.1}
        bind:value={grayFilter.colorFactor[2]}
      />
    {/if}
  </div>
</div>

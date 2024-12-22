<script lang="ts">
  import Slider from "~/ui/Slider.svelte";
  import { matrixFilter, resetMatrix } from "./model.svelte";
  import { NumberInput, TextInput, Checkbox, RadioButton, RadioButtonGroup } from "carbon-components-svelte";
  import Reset from "./_Reset.svelte";

  let checked = $state(true);

  $effect(() => {
    if (checked) {
      matrixFilter.size[1] = matrixFilter.size[0];
    }
  });

  const Variant = {
    gauss: 0,
    embossing: 1,
    edge: 2,
    sharpness: 3,
  };
  let variant = $state(Variant.embossing)

  $effect(() => {
    switch(variant) {
      case Variant.embossing:
        matrixFilter.matrix = [
          -2.0, -1.0, 0.0,
          -1.0,  1.0, 1.0,
          0.0 ,  1.0, 2.0
        ];
        return;
      case Variant.gauss:
        matrixFilter.matrix = [
          0.0625, 0.125, 0.0625,
          0.125 , 0.5  , 0.125 ,
          0.0625, 0.125, 0.0625
        ];
        return;
      case Variant.edge:
        matrixFilter.matrix = [
          -1, -1, -1,
          -1,  6, -1,
          -1, -1, -1
        ];
        return;
      case Variant.sharpness:
        matrixFilter.matrix = [
          0.0 , -1.0,  0.0,
          -1.0,    3, -1.0,
          0.0 , -1.0,  0.0
        ];
        return;
    }
  })
</script>

<div class="settings-group">
  <Checkbox labelText="Linked size" bind:checked />
  {#if checked}
    <Slider
      labelText="Size"
      min={0}
      max={32}
      step={1}
      bind:value={matrixFilter.size[0]}
    />
  {:else}
    <Slider
      labelText="Size X"
      min={0}
      max={32}
      step={1}
      bind:value={matrixFilter.size[0]}
    />
    <Slider
      labelText="Size Y"
      min={0}
      max={32}
      step={1}
      bind:value={matrixFilter.size[1]}
    />
  {/if}
  
  <div class="flex">
    {#each ['Red', 'Green', 'Blue'] as name, key}
      <RadioButtonGroup
        orientation="vertical"
        legendText={`Use ${name}`}
        bind:selected={matrixFilter.useColors[key]}
      >
        <RadioButton labelText="convolution" value={2} />
        <RadioButton labelText="sample" value={1} />
        <RadioButton labelText="ignore" value={0} />
      </RadioButtonGroup>
    {/each}
  </div>

  <RadioButtonGroup
    legendText="Preset"
    bind:selected={variant}
  >
    <RadioButton labelText="Emboss" value={Variant.embossing} />
    <RadioButton labelText="Gauss" value={Variant.gauss} />
    <RadioButton labelText="Edge" value={Variant.edge} />
    <RadioButton labelText="Sharp" value={Variant.sharpness} />
  </RadioButtonGroup>

  <div class="matrix-grid">
    {#each [0,1,2,3,4,5,6,7,8] as item}
      <input 
        type="number"
        step={0.1}
        bind:value={matrixFilter.matrix[item]}
      />
    {/each}
  </div>

  <Reset reset={resetMatrix} />
</div>


<style>
  .matrix-grid {
    display: grid;
    width: 100%;
    grid-template-columns: repeat(3, 33%);
    grid-template-rows: repeat(3, 1fr);
  }

  input {
    background: var(--cds-ui-01, #f4f4f4);
    padding: 2px 4px;
    border: none;
    padding: none;
    outline: none;
  }

  input:focus {
    outline: 2px solid var(--cds-focus, #0f62fe);
    outline-offset: -2px;
  }
</style>
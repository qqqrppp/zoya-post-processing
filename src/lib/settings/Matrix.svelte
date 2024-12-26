<script lang="ts">
  import Slider from "~/ui/Slider.svelte";
  import { matrix } from "./model.svelte";
  import { NumberInput, TextInput, Checkbox, RadioButton, RadioButtonGroup } from "carbon-components-svelte";
  import Reset from "./_Reset.svelte";

  const variants = {
    custom: 0,
    gauss: 1,
    embossing: 2,
    edge: 3,
    sharpness: 4,
  };
  
  let variant = $state(variants.custom)

  $effect(() => {
    switch(variant) {
      case variants.embossing:
        $matrix.matrix = [
          -2.0, -1.0, 0.0,
          -1.0,  1.0, 1.0,
          0.0 ,  1.0, 2.0
        ];
        return;
      case variants.gauss:
        $matrix.matrix = [
          0.0625, 0.125, 0.0625,
          0.125 , 0.25  , 0.125 ,
          0.0625, 0.125, 0.0625
        ];
        return;
      case variants.edge:
        $matrix.matrix = [
          -1, -1, -1,
          -1,  8, -1,
          -1, -1, -1
        ];
        return;
      case variants.sharpness:
        $matrix.matrix = [
          0.0 , -1.0,  0.0,
          -1.0,    5, -1.0,
          0.0 , -1.0,  0.0
        ];
        return;
    }
  })

  function reset() {
    console.log('reset')
    variant = variants.custom;
    matrix.reset();
  }
</script>

<div class="settings-group">
  <Checkbox labelText="Linked size" bind:checked={$matrix.isLinkedSize} />
  {#if $matrix.isLinkedSize}
    <Slider
      labelText="Size"
      min={0}
      max={32}
      step={1}
      bind:value={$matrix.size[0]}
    />
  {:else}
    <Slider
      labelText="Size X"
      min={0}
      max={32}
      step={1}
      bind:value={$matrix.size[0]}
    />
    <Slider
      labelText="Size Y"
      min={0}
      max={32}
      step={1}
      bind:value={$matrix.size[1]}
    />
  {/if}
  
  <div class="flex">
    {#each ['Red', 'Green', 'Blue'] as name, key}
      <RadioButtonGroup
        orientation="vertical"
        legendText={`Use ${name}`}
        bind:selected={$matrix.useColors[key]}
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
    <RadioButton labelText="Emboss" value={variants.embossing} />
    <RadioButton labelText="Gauss" value={variants.gauss} />
    <RadioButton labelText="Edge" value={variants.edge} />
    <RadioButton labelText="Sharp" value={variants.sharpness} />
  </RadioButtonGroup>

  <div class="matrix-grid">
    {#each [0,1,2,3,4,5,6,7,8] as item}
      <input 
        type="number"
        step={0.1}
        bind:value={$matrix.matrix[item]}
      />
    {/each}
  </div>

  <Reset reset={reset} />
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
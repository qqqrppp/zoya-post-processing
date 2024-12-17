<script lang="ts">
  import Slider from "~/ui/Slider.svelte";
  import { matrixFilter, resetMatrix } from "./model.svelte";
  import { NumberInput, TextInput, Checkbox } from "carbon-components-svelte";
  import Reset from "./_Reset.svelte";

  let checked = $state(true);

  $effect(() => {
    if (checked) {
      matrixFilter.size[1] = matrixFilter.size[0];
    }
  });
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
  

  <Slider
    variant="R"
    labelText="Coeff R"
    min={-10}
    max={10}
    step={0.1}
    bind:value={matrixFilter.coefficient[0]}
  />
  <Slider
    variant="G"
    labelText="Coeff G"
    min={-10}
    max={10}
    step={0.1}
    bind:value={matrixFilter.coefficient[1]}
  />
  <Slider
    variant="B"
    labelText="Coeff B"
    min={-10}
    max={10}
    step={0.1}
    bind:value={matrixFilter.coefficient[2]}
  />


  <div class="matrix-grid">
    <NumberInput type="number" size="sm" hideLabel hideSteppers bind:value={matrixFilter.matrix[0]} />
    <NumberInput type="number" size="sm" hideLabel hideSteppers bind:value={matrixFilter.matrix[1]} />
    <NumberInput type="number" size="sm" hideLabel hideSteppers bind:value={matrixFilter.matrix[2]} />
    <NumberInput type="number" size="sm" hideLabel hideSteppers bind:value={matrixFilter.matrix[3]} />
    <NumberInput type="number" size="sm" hideLabel hideSteppers bind:value={matrixFilter.matrix[4]} />
    <NumberInput type="number" size="sm" hideLabel hideSteppers bind:value={matrixFilter.matrix[5]} />
    <NumberInput type="number" size="sm" hideLabel hideSteppers bind:value={matrixFilter.matrix[6]} />
    <NumberInput type="number" size="sm" hideLabel hideSteppers bind:value={matrixFilter.matrix[7]} />
    <NumberInput type="number" size="sm" hideLabel hideSteppers bind:value={matrixFilter.matrix[8]} />
  </div>

  <Reset reset={resetMatrix} />
</div>


<style>
  .matrix-grid {
    display: grid;
    grid-template-columns: repeat(3, 100px);
    grid-template-rows: repeat(3, 1fr);
  }
</style>
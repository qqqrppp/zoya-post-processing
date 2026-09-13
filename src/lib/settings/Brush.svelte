<script lang="ts">
  import {
    RadioButton,
    RadioButtonGroup,
  } from "carbon-components-svelte";
  import Slider from "~/ui/Slider.svelte";
  import Reset from "~/ui/Reset.svelte";
  import { BrushVariant } from "~/filters";
  import { brush, history } from "./model.svelte";
</script>

<div class="settings-group">
  <div>
    <RadioButtonGroup
      legendText="Variant"
      name="brush-variant"
      bind:selected={$brush.variant}
    >
      <RadioButton labelText="Classic" value={BrushVariant.classic} />
      <RadioButton labelText="Generalized" value={BrushVariant.generalized} />
      <RadioButton labelText="Anisotropic" value={BrushVariant.anisotropic} />
    </RadioButtonGroup>

    <div style="margin-top: 1rem;">
      <Slider
        labelText="Brush size (radius)"
        min={0}
        max={10}
        step={1}
        bind:value={$brush.radius}
      />
    </div>

    {#if $brush.variant !== BrushVariant.classic}
      <div style="margin-top: 1rem;">
        <Slider
          labelText="Brush hardness"
          min={2.0}
          max={16.0}
          step={0.5}
          bind:value={$brush.hardness}
        />
      </div>
    {/if}

    {#if $brush.variant === BrushVariant.anisotropic}
      <div style="margin-top: 1rem;">
        <Slider
          labelText="Brush stretching (flow)"
          min={0.0}
          max={2.0}
          step={0.1}
          bind:value={$brush.stretching}
        />
      </div>
    {/if}

    <div style="margin-top: 1rem;">
      <Slider
        labelText="Strength (opacity)"
        min={0.0}
        max={1.0}
        step={0.05}
        bind:value={$brush.opacity}
      />
    </div>
  </div>

  <Reset reset={() => history.reset(brush.name)} />
</div>

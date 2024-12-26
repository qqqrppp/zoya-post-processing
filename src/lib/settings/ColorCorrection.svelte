<script lang="ts">
  import Slider from "~/ui/Slider.svelte";
  import Reset from "./_Reset.svelte";
  import { color } from "./model.svelte";
</script>

<div class="settings-group">
  <div>
    <Slider
      variant="R"
      labelText="Correction R"
      min={-100}
      max={100}
      step={1}
      bind:value={$color.color[0]}
    />
    <Slider
      variant="G"
      labelText="Correction G"
      min={-100}
      max={100}
      step={1}
      bind:value={$color.color[1]}
    />
    <Slider
      variant="B"
      labelText="Correction B"
      min={-100}
      max={100}
      step={1}
      bind:value={$color.color[2]}
    />
  </div>
  <Reset reset={color.reset} />
</div>

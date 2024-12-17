<script lang="ts">
  import Slider from "~/ui/Slider.svelte";
  import { pixelateFilter, resetPixelate } from "./model.svelte";
  import Reset from "./_Reset.svelte";

</script>

<div class="settings-group">
  <Slider
    labelText="Pixel size"
    min={0}
    max={256}
    step={4}
    multiplayer={4}
    bind:value={pixelateFilter.pixelSize}
  />
  <Reset reset={resetPixelate} />
</div>

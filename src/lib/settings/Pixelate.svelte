<script lang="ts">
  import Slider from "~/ui/Slider.svelte";
  import Reset from "./_Reset.svelte";
  import { pixelate } from "./model.svelte";

</script>

<div class="settings-group">
  <Slider
    labelText="Pixel size"
    min={0}
    max={256}
    step={1}
    multiplayer={4}
    bind:value={$pixelate.pixelSize}
  />
  <Reset reset={pixelate.reset} />
</div>

<script lang="ts">
  import Slider from "@/ui/Slider.svelte";
  import { pixelateFilter } from "./model.svelte"

</script>
<div class="settings-group">
  <Slider
    labelText="Pixel size"
    light
    min={0}
    max={256}
    step={2}
    bind:value={pixelateFilter.pixelSize}
  />
</div>

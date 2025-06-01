<script lang="ts">
  import { Button } from "carbon-components-svelte";
  import Slider from "~/ui/Slider.svelte";
  import Reset from "~/ui/Reset.svelte";

  import Undo from "carbon-icons-svelte/lib/Undo.svelte";

  import { pixelate, history } from "./model.svelte";
</script>

<div class="settings-group">
  <Slider
    labelText="Pixel size"
    min={0}
    max={1024}
    step={1}
    bind:value={$pixelate.pixelSize}
  />

  <!-- <Button size="small" kind="ghost" iconDescription="reset" icon={Undo} onclick={pixelate.back} /> -->
  <Reset reset={() => history.reset(pixelate.name)} />
</div>

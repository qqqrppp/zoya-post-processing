<script lang="ts">
  import { Button } from "carbon-components-svelte";
  import TrashCan from "carbon-icons-svelte/lib/TrashCan.svelte";

  import Slider from "@/ui/Slider.svelte";
  import { blurFilter } from "./model.svelte";
</script>

<div class="settings-group">
  <Slider
    labelText="Filter size"
    light
    min={0}
    max={96}
    step={1}
    bind:value={blurFilter.filterSize}
  />
  <Slider
    labelText="Iterations"
    light
    min={0}
    max={10}
    step={1}
    bind:value={blurFilter.iterations}
  />

<Button kind="danger-tertiary" iconDescription="Delete" icon={TrashCan} />
</div>

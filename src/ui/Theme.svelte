<script>
  import { Select, SelectItem } from "carbon-components-svelte";

  let theme = $state("g100"); // "white" | "g10" | "g80" | "g90" | "g100"

  $effect(() => {
    document?.documentElement.setAttribute("theme", theme);
  });
</script>

<div class="theme-togler">
  <Select
    light={false}
    size="xl"
    hideLabel
    bind:selected={theme}
    --cds-field-01="#161616"
    --cds-text-01="#fff"
    --cds-hover-ui="#262626"
    --cds-ui-05="#fff"
    --cds-ui-04="#393939"
  >
    <SelectItem value="white" text="White" />
    <SelectItem value="g10" text="Gray 10" />
    <SelectItem value="g80" text="Gray 80" />
    <SelectItem value="g90" text="Gray 90" />
    <SelectItem value="g100" text="Dark" />
  </Select>
</div>

<style>
  .theme-togler {
    min-width: 100px;
  }
</style>

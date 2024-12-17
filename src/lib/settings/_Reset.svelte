<script lang="ts">
  import { Button } from "carbon-components-svelte";
  import Reset from "carbon-icons-svelte/lib/Reset.svelte";

  const { reset } = $props()
</script>

<div class="flex justify-end">
    <Button size="small" kind="ghost" iconDescription="reset" icon={Reset} onclick={reset} />
</div>
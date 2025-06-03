<script lang="ts">
    import { Button } from "carbon-components-svelte";
      import Download from "carbon-icons-svelte/lib/Download.svelte";
  
    const { download } = $props()
  </script>
  
  <div class="flex justify-end">
      <Button size="field" kind="ghost" iconDescription="reset" icon={Download} onclick={download} />
  </div>
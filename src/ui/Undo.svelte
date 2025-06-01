<script lang="ts">
    import { Button } from "carbon-components-svelte";
    import Undo from "carbon-icons-svelte/lib/Undo.svelte";
  
    const { undo } = $props()
  </script>
  
  <div class="flex justify-start">
      <Button size="small" kind="ghost" iconDescription="reset" icon={Undo} onclick={undo} />
  </div>
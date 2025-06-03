<script lang="ts">
  import Undo from "~/ui/Undo.svelte";
  import CanvasGpu from "./CanvasGpu.svelte";
  import { FileUploaderDropContainer } from "carbon-components-svelte";
  import { history } from "./settings/model.svelte";
  import Reset from "~/ui/Reset.svelte";

  let files = $state<File[]>([]);
</script>

<div class="w-full">
  {#if !!files.length}
    <CanvasGpu file={files[0]} />
  {:else}
    <div class="flex h-full w-full justify-center items-center">
      <div>
        <FileUploaderDropContainer
          labelText="Drag and drop files here or click to upload"
          accept={[".jpg", ".jpeg", ".png"]}
          validateFiles={(files) => {
            // ограничение брать из gpu выкидывать алерт
            // return files.filter((file) => file.size > 8_192);
            return files;
          }}
          bind:files
        />
      </div>
    </div>
  {/if}
</div>

<style>
  .wrapper {
    display: flex;
    flex-flow: column;
    width: 100%;
    justify-content: space-between;
    align-items: center;
  }
</style>

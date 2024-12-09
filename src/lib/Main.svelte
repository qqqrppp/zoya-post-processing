<script lang="ts">
  import CanvasGpu from "./CanvasGpu.svelte";
  import { FileUploaderDropContainer } from "carbon-components-svelte";

  let files: File[] = [];
</script>

<div class="wrapper">
  <div class="container">
    {#if !!files.length}
      <CanvasGpu file={files[0]} />
    {:else}
      <FileUploaderDropContainer
        labelText="Drag and drop files here or click to upload"
        accept={[".jpg", ".jpeg", ".png"]}
        validateFiles={(files) => {
          // ограничение брать из gpu выкидывать алерт
          return files.filter((file) => file.size > 8_192);
        }}
        bind:files
      />
    {/if}
  </div>
</div>

<style>
  .wrapper {
    display: flex;
    flex-flow: column;
    width: 100%;
    justify-content: center;
    align-items: center;
  }
</style>

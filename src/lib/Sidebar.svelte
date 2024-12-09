<script lang="ts">
  import { Tile, Accordion, AccordionItem } from "carbon-components-svelte";

  import SidebarItem from "./SidebarItem.svelte";

  import GraySettings from "./settings/Gray.svelte";
  import PixelateSettings from "./settings/Pixelate.svelte";
  import InverseSettings from "./settings/Inverse.svelte";
  import BlurSettings from "./settings/Blur.svelte";
  
  import Fade from "carbon-icons-svelte/lib/Fade.svelte";
  import Color from "carbon-icons-svelte/lib/ColorPalette.svelte";
  import SaveSeries from "carbon-icons-svelte/lib/WatsonHealthSaveSeries.svelte";
  import Contrast from "carbon-icons-svelte/lib/Contrast.svelte";

  let selected = $state("preset");
  let items = $state([
    {
      icon: SaveSeries,
      name: "preset",
      isSelected: false,
    },
    {
      icon: Contrast,
      name: "contrast",
      isSelected: false,
    },
    {
      icon: Color,
      name: "color",
      isSelected: false,
    },
    {
      icon: Fade,
      name: "effect",
      isSelected: false,
    },
  ]);
</script>

<nav class="sidebar">
  <ul class="sidebar-mini">
    {#each items as item}
      <SidebarItem
        icon={item.icon}
        title={item.name}
        isSelected={item.name == selected}
        onclick={() => (selected = item.name)}
      />
    {/each}
  </ul>
  <Tile>
    <div class="sidebar-main"></div>

    <Accordion>
      {#if selected == "color"}
        <AccordionItem title="Grayscale">
          <GraySettings />
        </AccordionItem>
        <AccordionItem title="Inverse">
          <InverseSettings />
        </AccordionItem>
      {/if}

      {#if selected == "effect"}
        <AccordionItem title="Pixelate">
          <PixelateSettings />
        </AccordionItem>

        <AccordionItem title="Blur">
          <BlurSettings />
        </AccordionItem>
      {/if}
    </Accordion>
  </Tile>
</nav>

<style>
  .sidebar {
    display: flex;
    flex-flow: row;
    /* margin-top: var(--cds-spacing-09, 3rem);
    height: calc(100vh - 48px); */
    /* width: 30rem; */
  }

  .sidebar-mini {
    height: 100%;
    background-color: var(--cds-ui-background, #fff);
  }

  .sidebar-main {
    min-width: 23rem;
  }
</style>

<script lang="ts">
  import { Tile, AccordionItem } from "carbon-components-svelte";
  import Accordion from "~/ui/Accordion.svelte"
  import { grayFilter, inverseFilter } from './settings/model.svelte'
  $inspect(grayFilter, inverseFilter).with((type, value) => {
    // console.log(123) TODO сделать историю команд
  })

  import SidebarItem from "./SidebarItem.svelte";

  import GraySettings from "./settings/Gray.svelte";
  import PixelateSettings from "./settings/Pixelate.svelte";
  import InverseSettings from "./settings/Inverse.svelte";
  import BlurSettings from "./settings/Blur.svelte";
  import ColorCorrectionSettings from "./settings/ColorCorrection.svelte";
  import ContrastSettings from "./settings/Contrast.svelte";
  import MatrixSettings from "./settings/Matrix.svelte";

  



  import Fade from "carbon-icons-svelte/lib/Fade.svelte";
  import Color from "carbon-icons-svelte/lib/ColorPalette.svelte";
  import SaveSeries from "carbon-icons-svelte/lib/WatsonHealthSaveSeries.svelte";
  import Contrast from "carbon-icons-svelte/lib/Contrast.svelte";

  let selected = $state("effect");
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
  <!-- <div > -->

    <Tile>
      <div class="sidebar-main">
        <Accordion>
          {#if selected == "color"}
            <AccordionItem title="Color correction">
              <ColorCorrectionSettings />
            </AccordionItem>
            <AccordionItem title="Contrast">
              <ContrastSettings />
            </AccordionItem>
            <AccordionItem title="Grayscale">
              <GraySettings />
            </AccordionItem>
            <AccordionItem title="Inverse">
              <InverseSettings />
            </AccordionItem>
          {/if}
  
          {#if selected == "effect"}
            <AccordionItem title="Matrix">
              <MatrixSettings />
            </AccordionItem>

            <AccordionItem title="Pixelate">
              <PixelateSettings />
            </AccordionItem>
  
            <AccordionItem title="Blur">
              <BlurSettings />
            </AccordionItem>
          {/if}
        </Accordion>
      </div>
    </Tile>
  <!-- </div> -->
</nav>

<style>
  .sidebar {
    display: flex;
    flex-flow: row;
    /* margin-top: var(--cds-spacing-09, 3rem);
    height: calc(100vh - 48px); */
    /* min-width: 30rem; */
    /* overflow-y: auto;
    height: 100%; */
  }

  .sidebar :global(.bx--tile) {
    height: 100%;
    overflow-y: auto;
    max-width: 26rem;
    min-width: 26rem;

  }

  /* .sidebar-container {
    height: 100%;
    overflow: auto;
  } */

  .sidebar-mini {
    height: 100%;
    background-color: var(--cds-ui-background, #fff);
  }

  .sidebar-main {

    /* min-width: 24rem; */
  }
</style>

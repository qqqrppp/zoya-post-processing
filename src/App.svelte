<script>
  import "./app.css";
  import Sidebar from "./lib/Sidebar.svelte";
  import {
    Header,
    HeaderUtilities,
    SkipToContent,
  } from "carbon-components-svelte";
  import Main from "./lib/Main.svelte";
  import Theme from "./ui/Theme.svelte";

  let isSideNavOpen = $state(true);
</script>

<Header company="Zoya" platformName="Post Processing" bind:isSideNavOpen>
  <svelte:fragment slot="skip-to-content">
    <SkipToContent />
  </svelte:fragment>
  <HeaderUtilities>
    <Theme />
  </HeaderUtilities>
</Header>
<content class="content-container">
  <Sidebar />
  <Main />
</content>

<style>
  .content-container {
    margin-top: var(--cds-spacing-09, 3rem);
    height: calc(100vh - 48px);
    display: flex;
  }
</style>

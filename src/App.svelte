<script>
  import Sidebar from "./lib/Sidebar.svelte";
  import {
    Header,
    HeaderUtilities,
    SkipToContent,
  } from "carbon-components-svelte";
  import Main from "./lib/Main.svelte";
  import Theme from "./ui/Theme.svelte";

  import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

  injectSpeedInsights();
</script>

<Header company="Zoya" platformName="Post Processing">
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

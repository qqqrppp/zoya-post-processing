<script>
  import { Slider } from "carbon-components-svelte";

  let { variant = "", value = $bindable(), ...props } = $props();

  let color = $derived.by(() => {
    switch (variant) {
      case "R":
        return "var(--cds-support-01)";
      case "G":
        return "var(--cds-support-02)";
      case "B":
        return "var(--cds-support-04)";
      default:
        return "";
    }
  });
</script>

<div class="slider-wrapper">
  <Slider
    fullWidth
    light
    {...props}
    bind:value
    --cds-ui-05={color}
    --cds-interactive-04={color}
  />
</div>

<style>
  .slider-wrapper :global(.bx--label) {
    margin-bottom: 0;
  }
</style>

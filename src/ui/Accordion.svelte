<script lang="ts">
    import { Accordion } from "carbon-components-svelte";

    let { children, ...props} = $props();
</script>

<div class="accordion-container">
    <Accordion {...props} >
        {@render children()}
    </Accordion>
</div>

<style>
    .accordion-container :global(.bx--accordion__content) {
        padding-right: 1rem;
    }
</style>

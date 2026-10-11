<script lang="ts">
    import {
        Button,
        RadioButton,
        RadioButtonGroup,
    } from "carbon-components-svelte";
    import Slider from "~/ui/Slider.svelte";
    import Reset from "~/ui/Reset.svelte";
    import { PaletteVariant, MAX_PALETTE_COLORS } from "~/filters";
    import {
        palettePresets,
        type PalettePreset,
    } from "~/filters/palettePresets";
    import { extractPalette, ExtractMethod } from "~/filters/extractPalette";
    import { palette, history, sourceImage } from "./model.svelte";
    import { Tile, AccordionItem } from "carbon-components-svelte";

    let extractCount = $state(8);
    let extractMethod = $state(ExtractMethod.kmeans);

    const extractFromImage = () => {
        if (!$sourceImage) return;

        const colors = extractPalette(
            $sourceImage,
            extractCount,
            extractMethod,
        );
        if (colors.length) {
            $palette.colors = colors;
        }
    };

    const applyPreset = (preset: PalettePreset) => {
        $palette.colors = [...preset.colors].slice(0, MAX_PALETTE_COLORS);
    };

    const isActive = (preset: PalettePreset, colors: string[]) =>
        preset.colors.length === colors.length &&
        preset.colors.every(
            (c, i) => c.toLowerCase() === colors[i]?.toLowerCase(),
        );

    const addColor = () => {
        if ($palette.colors.length >= MAX_PALETTE_COLORS) return;
        $palette.colors = [...$palette.colors, "#000000"];
    };

    const removeColor = (index: number) => {
        $palette.colors = $palette.colors.filter((_, i) => i !== index);
    };
</script>

<div class="settings-group">
    <div>
        <AccordionItem title="Color distance">
            <RadioButtonGroup
                orientation="vertical"
                legendText="Color distance"
                name="palette-variant"
                bind:selected={$palette.variant}
            >
                <RadioButton labelText="RGB" value={PaletteVariant.rgb} />
                <RadioButton
                    labelText="Redmean (weighted RGB)"
                    value={PaletteVariant.redmean}
                />
                <RadioButton labelText="CIE Lab" value={PaletteVariant.lab} />
                <RadioButton
                    labelText="Oklab (Perceptual)"
                    value={PaletteVariant.oklab}
                />
                <RadioButton
                    labelText="Oklab (Lightness weight)"
                    value={PaletteVariant.oklabWeighted}
                />
            </RadioButtonGroup>

            {#if $palette.variant === PaletteVariant.oklabWeighted}
                <div style="margin-top: 1rem;">
                    <Slider
                        labelText="Lightness weight (0 = only color, 1 = Oklab)"
                        min={0.0}
                        max={3.0}
                        step={0.05}
                        bind:value={$palette.lightnessWeight}
                    />
                </div>
            {/if}

            <div style="margin-top: 1rem;">
                <Slider
                    labelText="Strength"
                    min={0.0}
                    max={1.0}
                    step={0.05}
                    bind:value={$palette.strength}
                />
            </div>
        </AccordionItem>
        <AccordionItem title="From image">
            <RadioButtonGroup
                orientation="vertical"
                legendText="Method"
                name="palette-extract-method"
                bind:selected={extractMethod}
            >
                <RadioButton
                    labelText="K-means (average colors)"
                    value={ExtractMethod.kmeans}
                />
                <RadioButton
                    labelText="K-means (real pixels)"
                    value={ExtractMethod.kmeansSnapped}
                />
                <RadioButton
                    labelText="Vivid (keep accents)"
                    value={ExtractMethod.vivid}
                />
                <RadioButton
                    labelText="Median cut"
                    value={ExtractMethod.medianCut}
                />
                <RadioButton
                    labelText="Most popular"
                    value={ExtractMethod.popular}
                />
            </RadioButtonGroup>
            <Slider
                labelText="Number of colors"
                min={2}
                max={MAX_PALETTE_COLORS}
                step={1}
                bind:value={extractCount}
            />
            <Button
                class="min-w-full"
                kind="tertiary"
                size="default"
                disabled={!$sourceImage}
                on:click={extractFromImage}
            >
                Extract palette from image
            </Button>
        </AccordionItem>

        <div class="presets">
            <span class="presets-label">Presets</span>
            {#each palettePresets as preset}
                <button
                    type="button"
                    class="preset"
                    class:active={isActive(preset, $palette.colors)}
                    onclick={() => applyPreset(preset)}
                >
                    <span class="preset-name">{preset.name}</span>
                    <span class="swatches">
                        {#each preset.colors as color}
                            <span class="swatch" style:background-color={color}
                            ></span>
                        {/each}
                    </span>
                </button>
            {/each}
        </div>

        <div class="colors">
            {#each $palette.colors as _, i}
                <div class="color-item">
                    <input type="color" bind:value={$palette.colors[i]} />
                    <Button
                        kind="ghost"
                        size="small"
                        on:click={() => removeColor(i)}
                    >
                        Remove
                    </Button>
                </div>
            {/each}
        </div>

        <div style="margin-top: 1rem;">
            <Button
                kind="tertiary"
                size="small"
                disabled={$palette.colors.length >= MAX_PALETTE_COLORS}
                on:click={addColor}
            >
                Add color ({$palette.colors.length}/{MAX_PALETTE_COLORS})
            </Button>
        </div>
    </div>

    <Reset reset={() => history.reset(palette.name)} />
</div>

<style>
    .presets {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        margin-top: 1rem;
    }

    .presets-label {
        font-size: 0.75rem;
        color: var(--cds-text-02, #525252);
    }

    .preset {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding: 0.5rem;
        text-align: left;
        cursor: pointer;
        color: inherit;
        background: transparent;
        border: 1px solid var(--cds-ui-03, #e0e0e0);
    }

    .preset:hover {
        background: var(--cds-hover-ui, #e5e5e5);
    }

    .preset.active {
        border-color: var(--cds-interactive-01, #0f62fe);
    }

    .swatches {
        display: flex;
        height: 0.75rem;
    }

    .swatch {
        flex: 1;
    }

    .colors {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 1rem;
    }

    .color-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .color-item input[type="color"] {
        width: 3rem;
        height: 2rem;
        padding: 0;
        border: none;
        background: none;
        cursor: pointer;
    }
</style>

<script lang="ts">
    import { onDestroy } from "svelte";
    import { AccordionItem, Button, Checkbox } from "carbon-components-svelte";
    import { sourceImage, originalImage, cropRect } from "./model.svelte";
    import {
        resizeBitmap,
        cropBitmap,
        flipBitmap,
        type CropRect,
    } from "~/filters/geometry";

    // Гарантированный минимум WebGPU для maxTextureDimension2D
    const MAX_SIDE = 8192;

    const ratios = [
        { name: "1:1", value: 1 },
        { name: "4:3", value: 4 / 3 },
        { name: "3:2", value: 3 / 2 },
        { name: "16:9", value: 16 / 9 },
    ];

    let width = $state(0);
    let height = $state(0);
    let keepAspect = $state(true);
    let busy = $state(false);
    let aspect = 1;

    // При смене рабочей картинки подтягиваем размеры и сбрасываем рамку на всё изображение
    $effect(() => {
        const image = $sourceImage;

        if (!image) {
            cropRect.set(null);
            return;
        }

        width = image.width;
        height = image.height;
        aspect = image.width / image.height;
        cropRect.set({ x: 0, y: 0, w: image.width, h: image.height });
    });

    // Рамка существует только пока открыта эта вкладка
    onDestroy(() => cropRect.set(null));

    const clampInt = (value: number, min: number, max: number) => {
        const v = Number.isFinite(value) ? Math.round(value) : min;
        return Math.min(Math.max(v, min), Math.max(min, max));
    };

    const clampSide = (value: number) => clampInt(value, 1, MAX_SIDE);

    const onWidth = (event: Event & { currentTarget: HTMLInputElement }) => {
        width = clampSide(event.currentTarget.valueAsNumber);
        if (keepAspect) height = clampSide(width / aspect);
        event.currentTarget.value = String(width);
    };

    const onHeight = (event: Event & { currentTarget: HTMLInputElement }) => {
        height = clampSide(event.currentTarget.valueAsNumber);
        if (keepAspect) width = clampSide(height * aspect);
        event.currentTarget.value = String(height);
    };

    const setCrop = (key: keyof CropRect) => (
        event: Event & { currentTarget: HTMLInputElement },
    ) => {
        const image = $sourceImage;
        const current = $cropRect;
        if (!image || !current) return;

        const next = { ...current, [key]: event.currentTarget.valueAsNumber };
        const x = clampInt(next.x, 0, image.width - 1);
        const y = clampInt(next.y, 0, image.height - 1);
        const w = clampInt(next.w, 1, image.width - x);
        const h = clampInt(next.h, 1, image.height - y);

        const result = { x, y, w, h };
        cropRect.set(result);
        event.currentTarget.value = String(result[key]);
    };

    const resetFrame = () => {
        const image = $sourceImage;
        if (image) {
            cropRect.set({ x: 0, y: 0, w: image.width, h: image.height });
        }
    };

    // Самая большая рамка нужного соотношения сторон по центру изображения
    const setRatio = (ratio: number) => {
        const image = $sourceImage;
        if (!image) return;

        let w = image.width;
        let h = Math.round(w / ratio);
        if (h > image.height) {
            h = image.height;
            w = Math.round(h * ratio);
        }

        cropRect.set({
            x: Math.round((image.width - w) / 2),
            y: Math.round((image.height - h) / 2),
            w,
            h,
        });
    };

    const run = async (op: (image: ImageBitmap) => Promise<ImageBitmap>) => {
        const image = $sourceImage;
        if (!image || busy) return;

        busy = true;
        try {
            sourceImage.set(await op(image));
        } finally {
            busy = false;
        }
    };

    const applyResize = () => {
        const image = $sourceImage;
        if (!image || (image.width === width && image.height === height)) return;

        run((img) => resizeBitmap(img, width, height));
    };

    const applyCrop = () => {
        const frame = $cropRect;
        const image = $sourceImage;
        if (!frame || !image) return;
        if (frame.w === image.width && frame.h === image.height) return;

        run((img) => cropBitmap(img, frame));
    };

    const flip = (axis: "x" | "y") => run((img) => flipBitmap(img, axis));

    const restore = () => {
        const original = $originalImage;
        if (original && original !== $sourceImage) {
            sourceImage.set(original);
        }
    };
</script>

<div class="settings-group">
    <div>
        <AccordionItem title="Size" open>
            <div class="fields">
                <label>
                    <span>Width, px</span>
                    <input
                        type="number"
                        min="1"
                        max={MAX_SIDE}
                        value={width}
                        disabled={!$sourceImage}
                        onchange={onWidth}
                    />
                </label>
                <label>
                    <span>Height, px</span>
                    <input
                        type="number"
                        min="1"
                        max={MAX_SIDE}
                        value={height}
                        disabled={!$sourceImage}
                        onchange={onHeight}
                    />
                </label>
            </div>
            <Checkbox labelText="Keep aspect ratio" bind:checked={keepAspect} />
            <div class="actions">
                <Button
                    kind="tertiary"
                    size="small"
                    disabled={!$sourceImage || busy}
                    on:click={applyResize}
                >
                    Apply size
                </Button>
            </div>
        </AccordionItem>

        <AccordionItem title="Crop" open>
            {#if $cropRect}
                <div class="fields">
                    <label>
                        <span>X</span>
                        <input
                            type="number"
                            value={$cropRect.x}
                            onchange={setCrop("x")}
                        />
                    </label>
                    <label>
                        <span>Y</span>
                        <input
                            type="number"
                            value={$cropRect.y}
                            onchange={setCrop("y")}
                        />
                    </label>
                    <label>
                        <span>Width</span>
                        <input
                            type="number"
                            value={$cropRect.w}
                            onchange={setCrop("w")}
                        />
                    </label>
                    <label>
                        <span>Height</span>
                        <input
                            type="number"
                            value={$cropRect.h}
                            onchange={setCrop("h")}
                        />
                    </label>
                </div>
            {/if}

            <div class="actions">
                {#each ratios as ratio}
                    <Button
                        kind="ghost"
                        size="small"
                        disabled={!$sourceImage}
                        on:click={() => setRatio(ratio.value)}
                    >
                        {ratio.name}
                    </Button>
                {/each}
                <Button
                    kind="ghost"
                    size="small"
                    disabled={!$sourceImage}
                    on:click={resetFrame}
                >
                    Whole image
                </Button>
            </div>
            <div class="actions">
                <Button
                    kind="tertiary"
                    size="small"
                    disabled={!$sourceImage || busy}
                    on:click={applyCrop}
                >
                    Apply crop
                </Button>
            </div>
        </AccordionItem>

        <AccordionItem title="Flip" open>
            <div class="actions">
                <Button
                    kind="tertiary"
                    size="small"
                    disabled={!$sourceImage || busy}
                    on:click={() => flip("x")}
                >
                    Horizontal
                </Button>
                <Button
                    kind="tertiary"
                    size="small"
                    disabled={!$sourceImage || busy}
                    on:click={() => flip("y")}
                >
                    Vertical
                </Button>
            </div>
        </AccordionItem>

        <div class="actions" style="margin-top: 1rem;">
            <Button
                kind="danger-tertiary"
                size="small"
                disabled={!$originalImage || $originalImage === $sourceImage || busy}
                on:click={restore}
            >
                Restore original
            </Button>
        </div>
    </div>
</div>

<style>
    .fields {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
    }

    label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.75rem;
        color: var(--cds-text-02, #525252);
    }

    input[type="number"] {
        width: 100%;
        padding: 0.5rem;
        color: var(--cds-text-01, #161616);
        background: var(--cds-ui-01, #f4f4f4);
        border: none;
        border-bottom: 1px solid var(--cds-ui-04, #8d8d8d);
    }

    .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }
</style>

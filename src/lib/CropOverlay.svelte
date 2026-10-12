<script lang="ts">
  import { cropRect } from "./settings/model.svelte";

  type Mode = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

  type Props = {
    scale: number;
    // Смещение центра картинки в NDC (-1..1), как в шейдере fullscreenTexturedQuad
    offset: { x: number; y: number };
    image: { width: number; height: number };
    // Ширина canvas в физических пикселях (canvas.width)
    canvasWidth: number;
    onwheel?: (event: WheelEvent) => void;
  };

  let { scale, offset, image, canvasWidth, onwheel }: Props = $props();

  // CSS-размер оверлея совпадает с CSS-размером canvas
  let cw = $state(0);
  let ch = $state(0);

  // CSS-пикселей экрана на один пиксель изображения
  const k = $derived(cw > 0 && canvasWidth > 0 ? (scale * cw) / canvasWidth : 0);
  const imgLeft = $derived(cw / 2 + (offset.x * cw) / 2 - (image.width * k) / 2);
  const imgTop = $derived(ch / 2 - (offset.y * ch) / 2 - (image.height * k) / 2);

  const frame = $derived(
    $cropRect && k > 0
      ? {
          left: imgLeft + $cropRect.x * k,
          top: imgTop + $cropRect.y * k,
          width: $cropRect.w * k,
          height: $cropRect.h * k,
        }
      : null,
  );

  const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), Math.max(min, max));

  let drag: {
    mode: Mode;
    startX: number;
    startY: number;
    rect: { x: number; y: number; w: number; h: number };
  } | null = null;

  const start = (mode: Mode) => (event: PointerEvent) => {
    if (!$cropRect) return;

    // Не даём событию дойти до перетаскивания картинки и до рамки-родителя
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

    drag = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      rect: { ...$cropRect },
    };
  };

  const move = (event: PointerEvent) => {
    if (!drag || k === 0) return;

    const dx = Math.round((event.clientX - drag.startX) / k);
    const dy = Math.round((event.clientY - drag.startY) / k);
    const s = drag.rect;
    const m = drag.mode;
    let { x, y, w, h } = s;

    if (m === "move") {
      x = clamp(s.x + dx, 0, image.width - s.w);
      y = clamp(s.y + dy, 0, image.height - s.h);
    } else {
      if (m.includes("w")) {
        x = clamp(s.x + dx, 0, s.x + s.w - 1);
        w = s.x + s.w - x;
      }
      if (m.includes("e")) {
        w = clamp(s.w + dx, 1, image.width - s.x);
      }
      if (m.includes("n")) {
        y = clamp(s.y + dy, 0, s.y + s.h - 1);
        h = s.y + s.h - y;
      }
      if (m.includes("s")) {
        h = clamp(s.h + dy, 1, image.height - s.y);
      }
    }

    $cropRect = { x, y, w, h };
  };

  const end = () => {
    drag = null;
  };

  const handles: Mode[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
</script>

<div class="overlay" bind:clientWidth={cw} bind:clientHeight={ch}>
  {#if frame}
    <div
      class="frame"
      style:left="{frame.left}px"
      style:top="{frame.top}px"
      style:width="{frame.width}px"
      style:height="{frame.height}px"
      role="presentation"
      onpointerdown={start("move")}
      onpointermove={move}
      onpointerup={end}
      onpointercancel={end}
      {onwheel}
    >
      {#each handles as mode}
        <div
          class="handle {mode}"
          role="presentation"
          onpointerdown={start(mode)}
          onpointermove={move}
          onpointerup={end}
          onpointercancel={end}
        ></div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .overlay {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .frame {
    position: absolute;
    box-sizing: border-box;
    border: 1px solid #fff;
    /* затемняет всё вне рамки */
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
    pointer-events: auto;
    cursor: move;
    touch-action: none;
  }

  .handle {
    position: absolute;
    width: 12px;
    height: 12px;
    box-sizing: border-box;
    background: #0f62fe;
    border: 1px solid #fff;
    transform: translate(-50%, -50%);
    touch-action: none;
  }

  .nw { left: 0; top: 0; cursor: nwse-resize; }
  .n { left: 50%; top: 0; cursor: ns-resize; }
  .ne { left: 100%; top: 0; cursor: nesw-resize; }
  .e { left: 100%; top: 50%; cursor: ew-resize; }
  .se { left: 100%; top: 100%; cursor: nwse-resize; }
  .s { left: 50%; top: 100%; cursor: ns-resize; }
  .sw { left: 0; top: 100%; cursor: nesw-resize; }
  .w { left: 0; top: 50%; cursor: ew-resize; }
</style>

// Геометрические операции над ImageBitmap. Выполняются на CPU через OffscreenCanvas,
// потому что меняют размер изображения, а все GPU-текстуры в Core создаются под фиксированный размер.

export type CropRect = { x: number; y: number; w: number; h: number };

const draw = (
    width: number,
    height: number,
    paint: (ctx: OffscreenCanvasRenderingContext2D) => void,
): Promise<ImageBitmap> => {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;
    paint(ctx);
    return createImageBitmap(canvas);
};

export const resizeBitmap = (src: ImageBitmap, width: number, height: number) => {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));

    return draw(w, h, (ctx) => {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(src, 0, 0, w, h);
    });
};

export const cropBitmap = (src: ImageBitmap, rect: CropRect) => {
    const x = Math.min(Math.max(0, Math.round(rect.x)), src.width - 1);
    const y = Math.min(Math.max(0, Math.round(rect.y)), src.height - 1);
    const w = Math.min(Math.max(1, Math.round(rect.w)), src.width - x);
    const h = Math.min(Math.max(1, Math.round(rect.h)), src.height - y);

    return draw(w, h, (ctx) => {
        ctx.drawImage(src, x, y, w, h, 0, 0, w, h);
    });
};

export const flipBitmap = (src: ImageBitmap, axis: 'x' | 'y') =>
    draw(src.width, src.height, (ctx) => {
        if (axis === 'x') {
            ctx.translate(src.width, 0);
            ctx.scale(-1, 1);
        } else {
            ctx.translate(0, src.height);
            ctx.scale(1, -1);
        }
        ctx.drawImage(src, 0, 0);
    });

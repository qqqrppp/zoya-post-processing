import { BaseComputeFilter } from './baseComputeFilter';
import paletteWGSL from './shaders/palette.wgsl?raw';

export const MAX_PALETTE_COLORS = 16;

export enum Variant {
    rgb = 0,
    oklab = 1,
    redmean = 2,
    lab = 3,
    oklabWeighted = 4,
}

export type PaletteSettings = {
    name: string,
    variant: Variant,
    strength: number,  // 0.0 .. 1.0
    lightnessWeight: number, // 0.0 .. 3.0, только для oklabWeighted (1.0 = обычный Oklab)
    colors: string[],  // hex-строки "#rrggbb", не более MAX_PALETTE_COLORS
}

const hexToRgb = (hex: string): [number, number, number] => {
    const value = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);

    return [
        ((value >> 16) & 255) / 255,
        ((value >> 8) & 255) / 255,
        (value & 255) / 255,
    ];
}

export class Palette extends BaseComputeFilter<PaletteSettings> {
    private paramsBuffer!: GPUBuffer;

    protected get wgslCode() {
        return paletteWGSL;
    }

    protected createResources() {
        this.paramsBuffer = this.device.createBuffer({
            // 4 float (count, variant, strength, lightnessWeight) + MAX * vec4f
            size: (4 + MAX_PALETTE_COLORS * 4) * 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        });

        this.constantsBindGroup = this.createConstantsBindGroup([
            {
                binding: 0,
                resource: {
                    buffer: this.paramsBuffer,
                }
            },
        ]);
    }

    protected updateBuffers(settings: PaletteSettings) {
        const colors = settings.colors.slice(0, MAX_PALETTE_COLORS);
        const data = new Float32Array(4 + MAX_PALETTE_COLORS * 4);

        data[0] = colors.length;
        data[1] = settings.variant;
        data[2] = settings.strength;
        data[3] = settings.lightnessWeight;

        colors.forEach((hex, i) => {
            data.set(hexToRgb(hex), 4 + i * 4);
        });

        this.device.queue.writeBuffer(this.paramsBuffer, 0, data);
    }

    protected shouldSkip(settings: PaletteSettings): boolean {
        return settings.colors.length === 0 || settings.strength === 0;
    }
}

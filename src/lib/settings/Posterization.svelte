<script lang="ts">
  import {
    Checkbox,
    RadioButton,
    RadioButtonGroup,
  } from "carbon-components-svelte";
  import Slider from "~/ui/Slider.svelte";
  import Reset from "~/ui/Reset.svelte";
  import { PosterizationVariant, PosterizationPalette } from "~/filters";
  import { posterization, history } from "./model.svelte";

  // Автоматическая инициализация диапазонов уровней при переключении режимов.
  // Превращает уровни 4.0 (из RGB) в корректные дробные значения для дизеринга/прозрачности, и наоборот.
  $effect(() => {
    if ($posterization.variant === PosterizationVariant.palette) {
      if ($posterization.levels[0] > 1.0) {
        $posterization.levels[0] = 0.15; // 15% дизеринг по умолчанию
      }
      if ($posterization.levels[1] > 1.0) {
        $posterization.levels[1] = 1.0;  // 100% прозрачность по умолчанию
      }
    } else {
      if ($posterization.levels[0] < 1.0) {
        $posterization.levels[0] = 4.0;  // 4 шага постеризации по умолчанию
      }
      if ($posterization.levels[1] < 1.0) {
        $posterization.levels[1] = 4.0;  // 4 шага постеризации по умолчанию
      }
    }
  });
</script>

<div class="settings-group">
  <div>
    <RadioButtonGroup
      legendText="Variant"
      name="posterization-variant"
      bind:selected={$posterization.variant}
    >
      <RadioButton labelText="Standard" value={PosterizationVariant.standard} />
      <RadioButton labelText="HSV Style" value={PosterizationVariant.hsv} />
      <RadioButton labelText="Palette" value={PosterizationVariant.palette} />
    </RadioButtonGroup>

    {#if $posterization.variant !== PosterizationVariant.palette}
      <div class="pt-3">
        <Checkbox labelText="Linked level" bind:checked={$posterization.isLinkedLevel} />
      </div>

      <div style="margin-top: 1rem;">
        {#if $posterization.isLinkedLevel}
          <Slider
            labelText={$posterization.variant === PosterizationVariant.hsv ? "Colors (Hue)" : "Level"}
            min={1}
            max={64}
            step={1}
            bind:value={$posterization.levels[0]}
          />
        {:else}
          <Slider
            labelText={$posterization.variant === PosterizationVariant.hsv ? "Hue (H) steps" : "Level R"}
            min={1}
            max={64}
            step={1}
            bind:value={$posterization.levels[0]}
          />
          <Slider
            labelText={$posterization.variant === PosterizationVariant.hsv ? "Saturation (S) steps" : "Level G"}
            min={1}
            max={64}
            step={1}
            bind:value={$posterization.levels[1]}
          />
          <Slider
            labelText={$posterization.variant === PosterizationVariant.hsv ? "Value (V) steps" : "Level B"}
            min={1}
            max={64}
            step={1}
            bind:value={$posterization.levels[2]}
          />
        {/if}
      </div>
    {:else}
      <div style="margin-top: 1rem;">
        <RadioButtonGroup
          orientation="vertical"
          legendText="Retro Palette"
          name="posterization-palette"
          bind:selected={$posterization.palette}
        >
          <RadioButton labelText="GameBoy Green" value={PosterizationPalette.gameboy} />
          <RadioButton labelText="CGA Cyan/Magenta" value={PosterizationPalette.cga} />
          <RadioButton labelText="Cyberpunk Neon" value={PosterizationPalette.cyberpunk} />
          <RadioButton labelText="Sunset Gold" value={PosterizationPalette.sunset} />
          <RadioButton labelText="Monochrome Gray" value={PosterizationPalette.gray} />
          <RadioButton labelText="NES 8-bit" value={PosterizationPalette.nes} />
        </RadioButtonGroup>
      </div>

      <div style="margin-top: 1rem;">
        <Slider
          labelText="Dither strength"
          min={0.0}
          max={0.5}
          step={0.01}
          bind:value={$posterization.levels[0]}
        />
      </div>

      <div style="margin-top: 1rem;">
        <Slider
          labelText="Opacity"
          min={0.0}
          max={1.0}
          step={0.05}
          bind:value={$posterization.levels[1]}
        />
      </div>
    {/if}
  </div>

  <Reset reset={() => history.reset(posterization.name)} />
</div>

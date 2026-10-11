import { MAX_PALETTE_COLORS } from './palette';

export type PalettePreset = {
    name: string,
    colors: string[], // hex "#rrggbb", не более MAX_PALETTE_COLORS
}

export const palettePresets: PalettePreset[] = [
    {
        name: 'Black & White',
        colors: ['#000000', '#ffffff'],
    },
    {
        name: 'Game Boy',
        colors: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
    },
    {
        name: 'CGA (palette 1)',
        colors: ['#000000', '#55ffff', '#ff55ff', '#ffffff'],
    },
    {
        name: 'CGA (palette 0)',
        colors: ['#000000', '#55ff55', '#ff5555', '#ffff55'],
    },
    {
        name: 'Sepia',
        colors: ['#2b1d0e', '#5c4023', '#9a7449', '#cfae7f', '#f1e2c0'],
    },
    {
        name: 'Synthwave',
        colors: ['#0d0221', '#2b0f54', '#ab1f65', '#ff4f69', '#ff8142', '#ffda45', '#3fd0ff'],
    },
    {
        name: 'PICO-8',
        colors: [
            '#000000', '#1d2b53', '#7e2553', '#008751',
            '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
            '#ff004d', '#ffa300', '#ffec27', '#00e436',
            '#29adff', '#83769c', '#ff77a8', '#ffccaa',
        ],
    },
    {
        name: 'Nord',
        colors: [
            '#2e3440', '#3b4252', '#434c5e', '#4c566a',
            '#d8dee9', '#e5e9f0', '#eceff4', '#8fbcbb',
            '#88c0d0', '#81a1c1', '#5e81ac', '#bf616a',
            '#d08770', '#ebcb8b', '#a3be8c', '#b48ead',
        ],
    },
    {
        name: 'Solarized',
        colors: [
            '#002b36', '#073642', '#586e75', '#657b83',
            '#839496', '#93a1a1', '#eee8d5', '#fdf6e3',
            '#b58900', '#cb4b16', '#dc322f', '#d33682',
            '#6c71c4', '#268bd2', '#2aa198', '#859900',
        ],
    },
    {
        name: 'Commodore 64',
        colors: [
            '#000000', '#ffffff', '#68372b', '#70a4b2',
            '#6f3d86', '#588d43', '#352879', '#b8c76f',
            '#6f4f25', '#433900', '#9a6759', '#444444',
            '#6c6c6c', '#9ad284', '#6c5eb5', '#959595',
        ],
    },
    {
        name: 'ZX Spectrum',
        colors: [
            '#000000', '#0000d7', '#d70000', '#d700d7',
            '#00d700', '#00d7d7', '#d7d700', '#d7d7d7',
            '#0000ff', '#ff0000', '#ff00ff', '#00ff00',
            '#00ffff', '#ffff00', '#ffffff',
        ],
    },
    {
        name: 'EGA (16 colors)',
        colors: [
            '#000000', '#0000aa', '#00aa00', '#00aaaa',
            '#aa0000', '#aa00aa', '#aa5500', '#aaaaaa',
            '#555555', '#5555ff', '#55ff55', '#55ffff',
            '#ff5555', '#ff55ff', '#ffff55', '#ffffff',
        ],
    },
    {
        name: 'Sweetie 16',
        colors: [
            '#1a1c2c', '#5d275d', '#b13e53', '#ef7d57',
            '#ffcd75', '#a7f070', '#38b764', '#257179',
            '#29366f', '#3b5dc9', '#41a6f6', '#73eff7',
            '#f4f4f4', '#94b0c2', '#566c86', '#333c57',
        ],
    },
    {
        name: 'Arne 16',
        colors: [
            '#000000', '#493c2b', '#be2633', '#e06f8b',
            '#9d9d9d', '#a46422', '#eb8931', '#f7e26b',
            '#ffffff', '#1b2632', '#2f484e', '#44891a',
            '#a3ce27', '#005784', '#31a2f2', '#b2dcef',
        ],
    },
    {
        name: 'Gruvbox Dark',
        colors: [
            '#282828', '#cc241d', '#98971a', '#d79921',
            '#458588', '#b16286', '#689d6a', '#a89984',
            '#928374', '#fb4934', '#b8bb26', '#fabd2f',
            '#83a598', '#d3869b', '#8ec07c', '#ebdbb2',
        ],
    },
    {
        name: 'Dracula',
        colors: [
            '#282a36', '#44475a', '#f8f8f2', '#6272a4',
            '#8be9fd', '#50fa7b', '#ffb86c', '#ff79c6',
            '#bd93f9', '#ff5555', '#f1fa8c',
        ],
    },
    {
        name: 'Monokai',
        colors: [
            '#272822', '#f8f8f2', '#f92672', '#fd971f',
            '#e6db74', '#a6e22e', '#66d9ef', '#ae81ff', '#75715e',
        ],
    },
];

if (import.meta.env.DEV) {
    for (const preset of palettePresets) {
        if (preset.colors.length > MAX_PALETTE_COLORS) {
            console.warn(`Palette preset "${preset.name}" has more than ${MAX_PALETTE_COLORS} colors`);
        }
    }
}

import path from "node:path";
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { optimizeCss } from "carbon-preprocess-svelte";
import pluginPurgeCss from "vite-plugin-purgecss-updated-v5";

// https://vite.dev/config/
/** @type {import('vite').UserConfig} */
export default defineConfig({
  resolve: {
    alias: {
      "~": path.resolve("./src"),
    },
  },
  plugins: [
    svelte(), 
    optimizeCss(),
    pluginPurgeCss()
  ],
})

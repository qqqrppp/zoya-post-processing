import { defineConfig } from 'vite'
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { optimizeCss, optimizeImports } from "carbon-preprocess-svelte";
import path from "path";

// https://vite.dev/config/

/** @type {import('vite').UserConfig} */
export default defineConfig({
  // css: {
  //   preprocessorOptions: {
  //     scss: {
  //       includePaths: ['node_modules'],
  //     },
  //   },
  // },
  resolve: {
    alias: {
      "~": path.resolve("./src"),
    },
  },
  plugins: [
    svelte({
      preprocess: [
        // vitePreprocess(),
        // optimizeImports()
      ]
    }), 
    // optimizeCss()
  ],
})

import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import sveltePreprocess from "svelte-preprocess";

export default defineConfig({
  plugins: [
    svelte({
      preprocess: sveltePreprocess({}),
      exclude: /\.component\.svelte$/,
      emitCss: false,
    }),
    svelte({
      preprocess: sveltePreprocess(),
      include: /\.component\.svelte$/,
      compilerOptions: {
        customElement: true,
      },
      emitCss: false,
    }),
  ],
  build: {
    sourcemap: true,
    target: "modules",
    lib: {
      entry: "src/main.ts",
      name: "@tiledb-inc/viz-ui",
      fileName: "components",
    },
  },
});
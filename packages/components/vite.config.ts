import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { transform } from 'esbuild';
import dts from 'vite-plugin-dts';
import { sveltePreprocess } from 'svelte-preprocess';

const bundleComponents = process.env.BUNDLE_COMPONENTS ?? true;

// https://vitejs.dev/config/
export default defineConfig({
  // root: './src',
  build: {
    outDir: './lib',
    emptyOutDir: true,
    minify: true,
    lib: {
      entry: './src/index.ts',
      fileName: 'index',
      formats: ['es']
    },
  },
  plugins: [
    svelte({
      exclude: /\.wc\.svelte$/ as any,
      compilerOptions: {
        customElement: true
      },
      preprocess: sveltePreprocess({
        scss: {
            prependData: `@use './src/assets/_design-tokens.scss';`
        }
      }),
      onwarn: (warning, handler) => {
        const { code } = warning;
        if (code!== "css_unused_selector") {
          handler(warning);
        }
      }
    }),
    dts({ insertTypesEntry: true, copyDtsFiles: true, rollupTypes: true })
  ]
});

// Workaround for https://github.com/vitejs/vite/issues/6555
function minifyEs() {
  return {
    name: 'minifyEs',
    renderChunk: {
      order: 'post' as const,
      async handler(code, chunk, outputOptions) {
        if (
          outputOptions.format === 'es' &&
          (!bundleComponents || chunk.fileName.endsWith('.js'))
        ) {
          return await transform(code, { minify: true });
        }
        return code;
      }
    }
  };
}

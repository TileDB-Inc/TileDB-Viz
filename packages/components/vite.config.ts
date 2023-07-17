import { defineConfig, LibraryFormats } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { transform } from 'esbuild';
import dts from 'vite-plugin-dts';

const bundleComponents = process.env.BUNDLE_COMPONENTS ?? true;

const PACKAGE_NAME = `viz-components`

// https://vitejs.dev/config/
export default defineConfig({
  // root: './src',
  build: {
    outDir: './dist',
    emptyOutDir: true,
    lib: {
      entry: './src/index.ts',
      formats: bundleComponents ? ['es', 'esm', 'umd'] as LibraryFormats[] : ['es'],
      name: PACKAGE_NAME,
      fileName: (format) => ({
        es: `${PACKAGE_NAME}.js`,
        esm: `${PACKAGE_NAME}.min.js`,
        umd: `${PACKAGE_NAME}.umd.js`,
      })[format]
    },
    rollupOptions: {
      output: bundleComponents ? {} : {
        inlineDynamicImports: false,
        chunkFileNames: "[name].js",
        manualChunks: { 'svelte': ["svelte"] }
      }
    }
  },
  plugins: [
    dts({ insertTypesEntry: true, copyDtsFiles: true, outDir: './dist' }),
    svelte({
      exclude: /\.wc\.svelte$/ as any,
      compilerOptions: {
        customElement: true
      }
    }),
    minifyEs()
  ]
});

// Workaround for https://github.com/vitejs/vite/issues/6555
function minifyEs() {
  return {
    name: 'minifyEs',
    renderChunk: {
      order: 'post' as const,
      async handler(code, chunk, outputOptions) {
        if (outputOptions.format === 'es' && (!bundleComponents || chunk.fileName.endsWith('.min.js'))) {
          return await transform(code, { minify: true });
        }
        return code;
      },
    }
  };
}

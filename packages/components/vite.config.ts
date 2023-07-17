import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { transform } from 'esbuild';
// import pkg from './package.json';


// import dts from 'vite-plugin-dts';

// export default defineConfig({
//   plugins: [
//     dts({ insertTypesEntry: true }),

const bundleComponents = process.env.BUNDLE_COMPONENTS ?? true;

const PACKAGE_NAME = `viz-components`

// https://vitejs.dev/config/
export default defineConfig({
  root: './packages/lib/',
  build: {
    outDir: '../../dist/lib',
    emptyOutDir: true,
    lib: {
      entry: './index.ts',
      formats: bundleComponents ? ['es', 'esm', 'umd'] as any : ['es'],
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
    svelte({
      exclude: /\.wc\.svelte$/ as any,
      compilerOptions: {
        customElement: true
      }
    }),
    svelte({
      include: /\.wc\.svelte$/ as any,
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

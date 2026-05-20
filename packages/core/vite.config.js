import { defineConfig } from "vite";
import pkg from "./package.json";
import rootPkg from "./../../package.json";
import dts from 'vite-plugin-dts';

export default defineConfig({
  base: '',
  build: {
    outDir: 'lib',
    assetsDir: '',
    emptyOutDir: true,
    lib: {
      entry: {
        'index': 'src/index.ts'
      },
      formats: ['es']
    },
    minify: true,
    rollupOptions: {
      external: [...Object.keys(pkg.dependencies), ...Object.keys(rootPkg.dependencies)].filter((value) => value !== "@tiledb-inc/wkx"),
    }
  },
  worker: {
    format: 'es',
    rollupOptions: {
      external: [...Object.keys(pkg.dependencies), ...Object.keys(rootPkg.dependencies)].filter((value) => value !== "@tiledb-inc/wkx"),
    }
  },
  plugins: [
    dts({ rollupTypes: true }), 
    {
      name: "webpack5ify-webworker",
      renderChunk: {
        order: 'post',
        async handler(code) {
          return code.replaceAll('.href', '');
        }
      }
    }
  ]
});

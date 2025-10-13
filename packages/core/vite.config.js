import { defineConfig } from "vite";
import pkg from "./package.json";
import rootPkg from "./../../package.json";
import dts from 'vite-plugin-dts';

export default defineConfig({
  base: '',
  build: {
    outDir: 'lib',
    emptyOutDir: true,
    lib: {
      entry: {
        'index': 'src/index.ts'
      },
      formats: ['es']
    },
    minify: true,
    rollupOptions: {
      external: ["node:child_process", ...Object.keys(pkg.dependencies), ...Object.keys(rootPkg.dependencies)]
    }
  },
  worker: {
    format: 'es',
    rollupOptions: {
      external: ["node:child_process"]
    }
  },
  plugins: [dts({ rollupTypes: true })]
});

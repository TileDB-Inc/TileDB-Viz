import { defineConfig } from 'vite';
import pkg from "./package.json";
import rootPkg from "./../../package.json";
import react from '@vitejs/plugin-react';
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [react(), dts({ rollupTypes: true})],
  build: {
    outDir: 'lib',
    lib: {
      entry: 'src/index.ts',
      fileName: 'index',
      formats: ['es']
    },
    minify: true,
    rollupOptions: {
      external: [...Object.keys(pkg.dependencies), ...Object.keys(rootPkg.dependencies)],
    }
  }
});
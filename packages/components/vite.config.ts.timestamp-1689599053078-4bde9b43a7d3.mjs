// vite.config.ts
import { defineConfig } from "file:///home/shiro/dev/Go/src/github.com/TileDB-Inc/TileDB-Viz/.yarn/__virtual__/vite-virtual-3d1dc8a303/0/cache/vite-npm-4.4.4-619d53b320-51c208e536.zip/node_modules/vite/dist/node/index.js";
import { svelte } from "file:///home/shiro/dev/Go/src/github.com/TileDB-Inc/TileDB-Viz/.yarn/__virtual__/@sveltejs-vite-plugin-svelte-virtual-44d9fa66c4/0/cache/@sveltejs-vite-plugin-svelte-npm-2.4.2-01220d9c9f-7da34ec671.zip/node_modules/@sveltejs/vite-plugin-svelte/src/index.js";
import { transform } from "esbuild";

// package.json
var package_default = {
  name: "@tiledb-inc/viz-components",
  version: "0.0.1",
  description: "A base template for building a shareable web components library with Vite + Svelte",
  type: "module",
  module: "dist/lib/my-library.js",
  main: "dist/lib/my-library.umd.js",
  scripts: {
    start: "npm run dev -s",
    dev: "vite --config vite.demo.config.ts",
    build: "vite build",
    "build:demo": "vite build --config vite.demo.config.ts",
    preview: "vite preview --config vite.demo.config.ts",
    check: "svelte-check --tsconfig ./tsconfig.json",
    prepublishOnly: "npm run build -s"
  },
  devDependencies: {
    "@sveltejs/vite-plugin-svelte": "^2.0.2",
    "@tsconfig/svelte": "^3.0.0",
    svelte: "^3.52.0",
    "svelte-check": "^3.0.3",
    "svelte-preprocess": "^5.0.1",
    tslib: "^2.4.0",
    typescript: "^4.6.4",
    vite: "^4.0.4"
  },
  files: [
    "dist/lib"
  ]
};

// vite.config.ts
var bundleComponents = process.env.BUNDLE_COMPONENTS ?? true;
var vite_config_default = defineConfig({
  root: "./packages/lib/",
  build: {
    outDir: "../../dist/lib",
    emptyOutDir: true,
    lib: {
      entry: "./index.ts",
      formats: bundleComponents ? ["es", "esm", "umd"] : ["es"],
      name: package_default.name.replace(/-./g, (char) => char[1].toUpperCase()),
      fileName: (format) => ({
        es: `${package_default.name}.js`,
        esm: `${package_default.name}.min.js`,
        umd: `${package_default.name}.umd.js`
      })[format]
    },
    rollupOptions: {
      output: bundleComponents ? {} : {
        inlineDynamicImports: false,
        chunkFileNames: "[name].js",
        manualChunks: { "svelte": ["svelte"] }
      }
    }
  },
  plugins: [
    svelte({
      exclude: /\.wc\.svelte$/,
      compilerOptions: {
        customElement: true
      }
    }),
    svelte({
      include: /\.wc\.svelte$/
    }),
    minifyEs()
  ]
});
function minifyEs() {
  return {
    name: "minifyEs",
    renderChunk: {
      order: "post",
      async handler(code, chunk, outputOptions) {
        if (outputOptions.format === "es" && (!bundleComponents || chunk.fileName.endsWith(".min.js"))) {
          return await transform(code, { minify: true });
        }
        return code;
      }
    }
  };
}
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAicGFja2FnZS5qc29uIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL2hvbWUvc2hpcm8vZGV2L0dvL3NyYy9naXRodWIuY29tL1RpbGVEQi1JbmMvVGlsZURCLVZpei9wYWNrYWdlcy9jb21wb25lbnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9zaGlyby9kZXYvR28vc3JjL2dpdGh1Yi5jb20vVGlsZURCLUluYy9UaWxlREItVml6L3BhY2thZ2VzL2NvbXBvbmVudHMvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvc2hpcm8vZGV2L0dvL3NyYy9naXRodWIuY29tL1RpbGVEQi1JbmMvVGlsZURCLVZpei9wYWNrYWdlcy9jb21wb25lbnRzL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCB7IHN2ZWx0ZSB9IGZyb20gJ0BzdmVsdGVqcy92aXRlLXBsdWdpbi1zdmVsdGUnXG5pbXBvcnQgeyB0cmFuc2Zvcm0gfSBmcm9tICdlc2J1aWxkJztcbmltcG9ydCBwa2cgZnJvbSAnLi9wYWNrYWdlLmpzb24nO1xuXG5jb25zdCBidW5kbGVDb21wb25lbnRzID0gcHJvY2Vzcy5lbnYuQlVORExFX0NPTVBPTkVOVFMgPz8gdHJ1ZTtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHJvb3Q6ICcuL3BhY2thZ2VzL2xpYi8nLFxuICBidWlsZDoge1xuICAgIG91dERpcjogJy4uLy4uL2Rpc3QvbGliJyxcbiAgICBlbXB0eU91dERpcjogdHJ1ZSxcbiAgICBsaWI6IHtcbiAgICAgIGVudHJ5OiAnLi9pbmRleC50cycsXG4gICAgICBmb3JtYXRzOiBidW5kbGVDb21wb25lbnRzID8gWydlcycsICdlc20nLCAndW1kJ10gYXMgYW55IDogWydlcyddLFxuICAgICAgbmFtZTogcGtnLm5hbWUucmVwbGFjZSgvLS4vZywgKGNoYXIpID0+IGNoYXJbMV0udG9VcHBlckNhc2UoKSksXG4gICAgICBmaWxlTmFtZTogKGZvcm1hdCkgPT4gKHtcbiAgICAgICAgZXM6IGAke3BrZy5uYW1lfS5qc2AsXG4gICAgICAgIGVzbTogYCR7cGtnLm5hbWV9Lm1pbi5qc2AsXG4gICAgICAgIHVtZDogYCR7cGtnLm5hbWV9LnVtZC5qc2AsXG4gICAgICB9KVtmb3JtYXRdXG4gICAgfSxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IGJ1bmRsZUNvbXBvbmVudHMgPyB7fSA6IHtcbiAgICAgICAgaW5saW5lRHluYW1pY0ltcG9ydHM6IGZhbHNlLFxuICAgICAgICBjaHVua0ZpbGVOYW1lczogXCJbbmFtZV0uanNcIixcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7ICdzdmVsdGUnOiBbXCJzdmVsdGVcIl0gfVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgcGx1Z2luczogW1xuICAgIHN2ZWx0ZSh7XG4gICAgICBleGNsdWRlOiAvXFwud2NcXC5zdmVsdGUkLyBhcyBhbnksXG4gICAgICBjb21waWxlck9wdGlvbnM6IHtcbiAgICAgICAgY3VzdG9tRWxlbWVudDogZmFsc2VcbiAgICAgIH1cbiAgICB9KSxcbiAgICBzdmVsdGUoe1xuICAgICAgaW5jbHVkZTogL1xcLndjXFwuc3ZlbHRlJC8gYXMgYW55LFxuICAgIH0pLFxuICAgIG1pbmlmeUVzKClcbiAgXVxufSk7XG5cbi8vIFdvcmthcm91bmQgZm9yIGh0dHBzOi8vZ2l0aHViLmNvbS92aXRlanMvdml0ZS9pc3N1ZXMvNjU1NVxuZnVuY3Rpb24gbWluaWZ5RXMoKSB7XG4gIHJldHVybiB7XG4gICAgbmFtZTogJ21pbmlmeUVzJyxcbiAgICByZW5kZXJDaHVuazoge1xuICAgICAgb3JkZXI6ICdwb3N0JyBhcyBjb25zdCxcbiAgICAgIGFzeW5jIGhhbmRsZXIoY29kZSwgY2h1bmssIG91dHB1dE9wdGlvbnMpIHtcbiAgICAgICAgaWYgKG91dHB1dE9wdGlvbnMuZm9ybWF0ID09PSAnZXMnICYmICghYnVuZGxlQ29tcG9uZW50cyB8fCBjaHVuay5maWxlTmFtZS5lbmRzV2l0aCgnLm1pbi5qcycpKSkge1xuICAgICAgICAgIHJldHVybiBhd2FpdCB0cmFuc2Zvcm0oY29kZSwgeyBtaW5pZnk6IHRydWUgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvZGU7XG4gICAgICB9LFxuICAgIH1cbiAgfTtcbn1cbiIsICJ7XG4gIFwibmFtZVwiOiBcIkB0aWxlZGItaW5jL3Zpei1jb21wb25lbnRzXCIsXG4gIFwidmVyc2lvblwiOiBcIjAuMC4xXCIsXG4gIFwiZGVzY3JpcHRpb25cIjogXCJBIGJhc2UgdGVtcGxhdGUgZm9yIGJ1aWxkaW5nIGEgc2hhcmVhYmxlIHdlYiBjb21wb25lbnRzIGxpYnJhcnkgd2l0aCBWaXRlICsgU3ZlbHRlXCIsXG4gIFwidHlwZVwiOiBcIm1vZHVsZVwiLFxuICBcIm1vZHVsZVwiOiBcImRpc3QvbGliL215LWxpYnJhcnkuanNcIixcbiAgXCJtYWluXCI6IFwiZGlzdC9saWIvbXktbGlicmFyeS51bWQuanNcIixcbiAgXCJzY3JpcHRzXCI6IHtcbiAgICBcInN0YXJ0XCI6IFwibnBtIHJ1biBkZXYgLXNcIixcbiAgICBcImRldlwiOiBcInZpdGUgLS1jb25maWcgdml0ZS5kZW1vLmNvbmZpZy50c1wiLFxuICAgIFwiYnVpbGRcIjogXCJ2aXRlIGJ1aWxkXCIsXG4gICAgXCJidWlsZDpkZW1vXCI6IFwidml0ZSBidWlsZCAtLWNvbmZpZyB2aXRlLmRlbW8uY29uZmlnLnRzXCIsXG4gICAgXCJwcmV2aWV3XCI6IFwidml0ZSBwcmV2aWV3IC0tY29uZmlnIHZpdGUuZGVtby5jb25maWcudHNcIixcbiAgICBcImNoZWNrXCI6IFwic3ZlbHRlLWNoZWNrIC0tdHNjb25maWcgLi90c2NvbmZpZy5qc29uXCIsXG4gICAgXCJwcmVwdWJsaXNoT25seVwiOiBcIm5wbSBydW4gYnVpbGQgLXNcIlxuICB9LFxuICBcImRldkRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJAc3ZlbHRlanMvdml0ZS1wbHVnaW4tc3ZlbHRlXCI6IFwiXjIuMC4yXCIsXG4gICAgXCJAdHNjb25maWcvc3ZlbHRlXCI6IFwiXjMuMC4wXCIsXG4gICAgXCJzdmVsdGVcIjogXCJeMy41Mi4wXCIsXG4gICAgXCJzdmVsdGUtY2hlY2tcIjogXCJeMy4wLjNcIixcbiAgICBcInN2ZWx0ZS1wcmVwcm9jZXNzXCI6IFwiXjUuMC4xXCIsXG4gICAgXCJ0c2xpYlwiOiBcIl4yLjQuMFwiLFxuICAgIFwidHlwZXNjcmlwdFwiOiBcIl40LjYuNFwiLFxuICAgIFwidml0ZVwiOiBcIl40LjAuNFwiXG4gIH0sXG4gIFwiZmlsZXNcIjogW1xuICAgIFwiZGlzdC9saWJcIlxuICBdXG59XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW1aLFNBQVMsb0JBQW9CO0FBQ2hiLFNBQVMsY0FBYztBQUN2QixTQUFTLGlCQUFpQjs7O0FDRjFCO0FBQUEsRUFDRSxNQUFRO0FBQUEsRUFDUixTQUFXO0FBQUEsRUFDWCxhQUFlO0FBQUEsRUFDZixNQUFRO0FBQUEsRUFDUixRQUFVO0FBQUEsRUFDVixNQUFRO0FBQUEsRUFDUixTQUFXO0FBQUEsSUFDVCxPQUFTO0FBQUEsSUFDVCxLQUFPO0FBQUEsSUFDUCxPQUFTO0FBQUEsSUFDVCxjQUFjO0FBQUEsSUFDZCxTQUFXO0FBQUEsSUFDWCxPQUFTO0FBQUEsSUFDVCxnQkFBa0I7QUFBQSxFQUNwQjtBQUFBLEVBQ0EsaUJBQW1CO0FBQUEsSUFDakIsZ0NBQWdDO0FBQUEsSUFDaEMsb0JBQW9CO0FBQUEsSUFDcEIsUUFBVTtBQUFBLElBQ1YsZ0JBQWdCO0FBQUEsSUFDaEIscUJBQXFCO0FBQUEsSUFDckIsT0FBUztBQUFBLElBQ1QsWUFBYztBQUFBLElBQ2QsTUFBUTtBQUFBLEVBQ1Y7QUFBQSxFQUNBLE9BQVM7QUFBQSxJQUNQO0FBQUEsRUFDRjtBQUNGOzs7QUR4QkEsSUFBTSxtQkFBbUIsUUFBUSxJQUFJLHFCQUFxQjtBQUcxRCxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixNQUFNO0FBQUEsRUFDTixPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixhQUFhO0FBQUEsSUFDYixLQUFLO0FBQUEsTUFDSCxPQUFPO0FBQUEsTUFDUCxTQUFTLG1CQUFtQixDQUFDLE1BQU0sT0FBTyxLQUFLLElBQVcsQ0FBQyxJQUFJO0FBQUEsTUFDL0QsTUFBTSxnQkFBSSxLQUFLLFFBQVEsT0FBTyxDQUFDLFNBQVMsS0FBSyxDQUFDLEVBQUUsWUFBWSxDQUFDO0FBQUEsTUFDN0QsVUFBVSxDQUFDLFlBQVk7QUFBQSxRQUNyQixJQUFJLEdBQUcsZ0JBQUksSUFBSTtBQUFBLFFBQ2YsS0FBSyxHQUFHLGdCQUFJLElBQUk7QUFBQSxRQUNoQixLQUFLLEdBQUcsZ0JBQUksSUFBSTtBQUFBLE1BQ2xCLEdBQUcsTUFBTTtBQUFBLElBQ1g7QUFBQSxJQUNBLGVBQWU7QUFBQSxNQUNiLFFBQVEsbUJBQW1CLENBQUMsSUFBSTtBQUFBLFFBQzlCLHNCQUFzQjtBQUFBLFFBQ3RCLGdCQUFnQjtBQUFBLFFBQ2hCLGNBQWMsRUFBRSxVQUFVLENBQUMsUUFBUSxFQUFFO0FBQUEsTUFDdkM7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsU0FBUztBQUFBLE1BQ1QsaUJBQWlCO0FBQUEsUUFDZixlQUFlO0FBQUEsTUFDakI7QUFBQSxJQUNGLENBQUM7QUFBQSxJQUNELE9BQU87QUFBQSxNQUNMLFNBQVM7QUFBQSxJQUNYLENBQUM7QUFBQSxJQUNELFNBQVM7QUFBQSxFQUNYO0FBQ0YsQ0FBQztBQUdELFNBQVMsV0FBVztBQUNsQixTQUFPO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixhQUFhO0FBQUEsTUFDWCxPQUFPO0FBQUEsTUFDUCxNQUFNLFFBQVEsTUFBTSxPQUFPLGVBQWU7QUFDeEMsWUFBSSxjQUFjLFdBQVcsU0FBUyxDQUFDLG9CQUFvQixNQUFNLFNBQVMsU0FBUyxTQUFTLElBQUk7QUFDOUYsaUJBQU8sTUFBTSxVQUFVLE1BQU0sRUFBRSxRQUFRLEtBQUssQ0FBQztBQUFBLFFBQy9DO0FBQ0EsZUFBTztBQUFBLE1BQ1Q7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGOyIsCiAgIm5hbWVzIjogW10KfQo=

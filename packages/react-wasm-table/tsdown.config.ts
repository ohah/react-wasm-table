import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    wasm: "./src/entries/wasm.ts",
    sorting: "./src/entries/sorting.ts",
    filtering: "./src/entries/filtering.ts",
    grouping: "./src/entries/grouping.ts",
    selection: "./src/entries/selection.ts",
    clipboard: "./src/entries/clipboard.ts",
    renderers: "./src/entries/renderers.ts",
  },
  format: "es",
  outDir: "dist",
  platform: "browser",
  external: ["react", "react-dom"],
  dts: true,
  clean: true,
  failOnWarn: false,
});

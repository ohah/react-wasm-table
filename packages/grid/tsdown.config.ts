import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { index: "./src/index.ts" },
  format: "es",
  outDir: "dist",
  platform: "browser",
  external: ["react", "react-dom"],
  dts: true,
  clean: true,
  failOnWarn: false,
});

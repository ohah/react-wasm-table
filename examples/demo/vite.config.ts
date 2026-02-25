import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  resolve: {
    conditions: ["development"],
  },
  optimizeDeps: {
    exclude: ["@ohah/react-wasm-table"],
  },
});

import { $ } from "bun";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

async function dev() {
  console.log("Starting development environment...");

  // Build WASM first
  console.log("Building WASM...");
  await $`bun run build:wasm`.cwd(ROOT);

  // Start demo dev server
  console.log("Starting demo dev server...");
  await $`bun run dev:demo`.cwd(ROOT);
}

dev().catch((err) => {
  console.error("Dev failed:", err);
  process.exit(1);
});

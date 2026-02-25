import { $ } from "bun";
import { cp, rm, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const WASM_CRATE = resolve(ROOT, "crates/wasm");
const PKG_OUTPUT = resolve(WASM_CRATE, "pkg");
const TARGET_DIR = resolve(ROOT, "packages/grid/wasm");
const DEMO_PUBLIC = resolve(ROOT, "examples/demo/public");

async function buildWasm() {
  console.log("Building WASM...");

  // Run wasm-pack build
  await $`wasm-pack build --target web --out-dir pkg ${WASM_CRATE}`.cwd(ROOT);

  console.log("WASM build complete.");

  // Clean target directory
  if (existsSync(TARGET_DIR)) {
    await rm(TARGET_DIR, { recursive: true });
  }
  await mkdir(TARGET_DIR, { recursive: true });

  // Copy pkg contents to target
  await cp(PKG_OUTPUT, TARGET_DIR, { recursive: true });

  // Clean up .gitignore from pkg output (wasm-pack generates one)
  const gitignorePath = resolve(TARGET_DIR, ".gitignore");
  if (existsSync(gitignorePath)) {
    await rm(gitignorePath);
  }

  console.log(`WASM files copied to ${TARGET_DIR}`);

  // Also copy .wasm binary to demo public/ for Vite dev & build
  await mkdir(DEMO_PUBLIC, { recursive: true });
  const wasmBinary = resolve(TARGET_DIR, "react_wasm_table_wasm_bg.wasm");
  if (existsSync(wasmBinary)) {
    await cp(wasmBinary, resolve(DEMO_PUBLIC, "react_wasm_table_wasm_bg.wasm"));
    console.log(`WASM binary copied to ${DEMO_PUBLIC}`);
  }
}

buildWasm().catch((err) => {
  console.error("WASM build failed:", err);
  process.exit(1);
});

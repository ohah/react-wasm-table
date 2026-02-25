import type { WasmTableEngine } from "./types";

let wasmModule: typeof import("../wasm/react_wasm_table_wasm") | null = null;
let initPromise: Promise<void> | null = null;

// Allow users to set a custom URL for the .wasm binary before calling initWasm().
// Useful when the bundler can't resolve the file automatically.
let customWasmUrl: string | URL | undefined;

/** Override the URL from which the .wasm binary is fetched. */
export function setWasmUrl(url: string | URL): void {
  customWasmUrl = url;
}

/** Initialize the WASM module. Only loads once. */
export async function initWasm(): Promise<void> {
  if (wasmModule) return;

  if (!initPromise) {
    initPromise = (async () => {
      const wasm = await import("../wasm/react_wasm_table_wasm");

      // Try multiple strategies to locate the .wasm binary:
      // 1. User-provided URL via setWasmUrl()
      // 2. Bundler-resolved URL via new URL() + import.meta.url
      // 3. Fallback: let wasm-pack glue resolve it (default behaviour)
      const url =
        customWasmUrl ?? new URL("../wasm/react_wasm_table_wasm_bg.wasm", import.meta.url);

      await wasm.default(url);
      wasmModule = wasm;
    })();
  }

  return initPromise;
}

/** Create a new TableEngine instance. Must call initWasm() first. */
export function createTableEngine(): WasmTableEngine {
  if (!wasmModule) {
    throw new Error("WASM module not initialized. Call initWasm() first.");
  }
  return new wasmModule.TableEngine() as unknown as WasmTableEngine;
}

/** Check if the WASM module is loaded. */
export function isWasmReady(): boolean {
  return wasmModule !== null;
}

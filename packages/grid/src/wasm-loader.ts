import type { WasmTableEngine } from "./types";

let wasmModule: typeof import("../wasm/react_wasm_table_wasm") | null = null;
let initPromise: Promise<void> | null = null;

/** Initialize the WASM module. Only loads once. */
export async function initWasm(): Promise<void> {
  if (wasmModule) return;

  if (!initPromise) {
    initPromise = (async () => {
      const wasm = await import("../wasm/react_wasm_table_wasm");
      await wasm.default();
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

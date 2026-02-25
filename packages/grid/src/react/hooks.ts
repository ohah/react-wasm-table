import { useContext } from "react";
import { GridContext, WasmContext } from "./context";
import type { GridContextValue, WasmContextValue } from "./context";

/** Access the grid context. Throws if used outside <Grid>. */
export function useGrid(): GridContextValue {
  const ctx = useContext(GridContext);
  if (!ctx) {
    throw new Error("useGrid must be used within a <Grid> component");
  }
  return ctx;
}

/** Access the column registry from grid context. */
export function useColumnRegistry() {
  return useGrid().columnRegistry;
}

/** Access the WASM engine context. Throws if used outside <Grid>. */
export function useWasm(): WasmContextValue {
  const ctx = useContext(WasmContext);
  if (!ctx) {
    throw new Error("useWasm must be used within a <Grid> component");
  }
  return ctx;
}

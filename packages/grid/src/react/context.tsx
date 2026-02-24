import { createContext } from "react";
import type { ColumnRegistry } from "../adapter/column-registry";
import type { WasmTableEngine } from "../types";

/** Grid-level context shared between Grid and Column components. */
export interface GridContextValue {
  /** Column registry for declarative column registration. */
  columnRegistry: ColumnRegistry;
}

/** WASM engine context for accessing the table engine. */
export interface WasmContextValue {
  /** The WASM table engine instance (null while loading). */
  engine: WasmTableEngine | null;
  /** Whether the WASM module is ready. */
  isReady: boolean;
}

export const GridContext = createContext<GridContextValue | null>(null);
export const WasmContext = createContext<WasmContextValue | null>(null);

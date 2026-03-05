import { createContext } from "react";
import type { ColumnRegistry } from "../adapter/column-registry";

/** Grid-level context shared between Grid and Column components. */
export interface GridContextValue {
  /** Column registry for declarative column registration. */
  columnRegistry: ColumnRegistry;
}

export const GridContext = createContext<GridContextValue | null>(null);

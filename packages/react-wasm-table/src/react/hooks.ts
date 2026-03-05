import { useContext } from "react";
import { GridContext } from "./context";
import type { GridContextValue } from "./context";

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

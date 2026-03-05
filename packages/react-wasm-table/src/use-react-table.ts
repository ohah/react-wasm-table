import type { UseGridTableOptions } from "./use-grid-table";
import { useGridTable } from "./use-grid-table";
import type { GridInstance } from "./grid-instance";

/** Alias for UseGridTableOptions (TanStack-compatible naming). */
export type UseReactTableOptions<TData> = UseGridTableOptions<TData>;

/**
 * TanStack-compatible alias for useGridTable.
 * Returns a GridInstance (aliased as TableInstance) with full state management.
 */
export function useReactTable<TData>(options: UseReactTableOptions<TData>): GridInstance<TData> {
  return useGridTable(options);
}

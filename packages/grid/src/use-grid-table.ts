import { useState, useMemo, useCallback } from "react";
import type { GridColumnDef, SortingState, SortingUpdater } from "./tanstack-types";
import type { GridInstance, GridState } from "./grid-instance";
import { buildGridInstance } from "./grid-instance";

/** Options for useGridTable. */
export interface UseGridTableOptions<TData> {
  /** Row data. */
  data: TData[];
  /** Column definitions (TanStack-compatible). */
  columns: GridColumnDef<TData>[];

  // Controlled state
  /** Controlled sorting state. */
  state?: Partial<GridState>;
  /** Callback when sorting changes (controlled mode). */
  onSortingChange?: (updater: SortingUpdater) => void;
  /** Initial state (for uncontrolled mode). */
  initialState?: Partial<GridState>;
}

/**
 * TanStack-compatible hook for creating a grid instance.
 * Manages sorting state (controlled or uncontrolled) and builds a GridInstance.
 *
 * @example
 * ```tsx
 * // Uncontrolled
 * const table = useGridTable({ data, columns });
 *
 * // Controlled sorting
 * const [sorting, setSorting] = useState<SortingState>([]);
 * const table = useGridTable({
 *   data, columns,
 *   state: { sorting },
 *   onSortingChange: setSorting,
 * });
 * ```
 */
export function useGridTable<TData>(
  options: UseGridTableOptions<TData>,
): GridInstance<TData> {
  const {
    data,
    columns,
    state: controlledState,
    onSortingChange: controlledOnSortingChange,
    initialState,
  } = options;

  // Internal state for uncontrolled mode
  const [internalSorting, setInternalSorting] = useState<SortingState>(
    initialState?.sorting ?? [],
  );

  // Resolve controlled vs uncontrolled
  const sorting = controlledState?.sorting ?? internalSorting;
  const onSortingChange = useCallback(
    (updater: SortingUpdater) => {
      const next =
        typeof updater === "function" ? updater(sorting) : updater;
      if (controlledOnSortingChange) {
        controlledOnSortingChange(next);
      } else {
        setInternalSorting(next);
      }
    },
    [sorting, controlledOnSortingChange],
  );

  const state: GridState = useMemo(() => ({ sorting }), [sorting]);

  const instance = useMemo(
    () =>
      buildGridInstance({
        columns,
        state,
        onSortingChange,
      }),
    [columns, state, onSortingChange],
  );

  return instance;
}

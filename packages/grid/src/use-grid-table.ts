import { useState, useMemo, useCallback } from "react";
import type {
  GridColumnDef,
  SortingState,
  SortingUpdater,
  ColumnFiltersState,
  ColumnFiltersUpdater,
} from "./tanstack-types";
import type { GridInstance, GridState } from "./grid-instance";
import { buildGridInstance } from "./grid-instance";
import type { RowModelFactory } from "./row-model";

/** Options for useGridTable. */
export interface UseGridTableOptions<TData> {
  /** Row data. */
  data: TData[];
  /** Column definitions (TanStack-compatible). */
  columns: GridColumnDef<TData>[];

  // Controlled state
  /** Controlled state (sorting, columnFilters, globalFilter). */
  state?: Partial<GridState>;
  /** Callback when sorting changes (controlled mode). */
  onSortingChange?: (updater: SortingUpdater) => void;
  /** Callback when column filters change (controlled mode). */
  onColumnFiltersChange?: (updater: ColumnFiltersUpdater) => void;
  /** Callback when global filter changes (controlled mode). */
  onGlobalFilterChange?: (value: string) => void;
  /** Initial state (for uncontrolled mode). */
  initialState?: Partial<GridState>;

  // Row model factories (tree-shakeable markers)
  getCoreRowModel?: RowModelFactory<TData>;
  getSortedRowModel?: RowModelFactory<TData>;
  getFilteredRowModel?: RowModelFactory<TData>;
}

/**
 * TanStack-compatible hook for creating a grid instance.
 * Manages sorting + filter state (controlled or uncontrolled) and builds a GridInstance.
 */
export function useGridTable<TData>(options: UseGridTableOptions<TData>): GridInstance<TData> {
  const {
    data,
    columns,
    state: controlledState,
    onSortingChange: controlledOnSortingChange,
    onColumnFiltersChange: controlledOnColumnFiltersChange,
    onGlobalFilterChange: controlledOnGlobalFilterChange,
    initialState,
  } = options;

  // Internal state for uncontrolled mode
  const [internalSorting, setInternalSorting] = useState<SortingState>(initialState?.sorting ?? []);
  const [internalColumnFilters, setInternalColumnFilters] = useState<ColumnFiltersState>(
    initialState?.columnFilters ?? [],
  );
  const [internalGlobalFilter, setInternalGlobalFilter] = useState<string>(
    initialState?.globalFilter ?? "",
  );

  // Resolve controlled vs uncontrolled — sorting
  const sorting = controlledState?.sorting ?? internalSorting;
  const onSortingChange = useCallback(
    (updater: SortingUpdater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      if (controlledOnSortingChange) {
        controlledOnSortingChange(next);
      } else {
        setInternalSorting(next);
      }
    },
    [sorting, controlledOnSortingChange],
  );

  // Resolve controlled vs uncontrolled — column filters
  const columnFilters = controlledState?.columnFilters ?? internalColumnFilters;
  const onColumnFiltersChange = useCallback(
    (updater: ColumnFiltersUpdater) => {
      const next = typeof updater === "function" ? updater(columnFilters) : updater;
      if (controlledOnColumnFiltersChange) {
        controlledOnColumnFiltersChange(next);
      } else {
        setInternalColumnFilters(next);
      }
    },
    [columnFilters, controlledOnColumnFiltersChange],
  );

  // Resolve controlled vs uncontrolled — global filter
  const globalFilter = controlledState?.globalFilter ?? internalGlobalFilter;
  const onGlobalFilterChange = useCallback(
    (value: string) => {
      if (controlledOnGlobalFilterChange) {
        controlledOnGlobalFilterChange(value);
      } else {
        setInternalGlobalFilter(value);
      }
    },
    [controlledOnGlobalFilterChange],
  );

  const state: GridState = useMemo(
    () => ({ sorting, columnFilters, globalFilter }),
    [sorting, columnFilters, globalFilter],
  );

  const instance = useMemo(
    () =>
      buildGridInstance({
        data,
        columns,
        state,
        onSortingChange,
        onColumnFiltersChange,
        onGlobalFilterChange,
      }),
    [data, columns, state, onSortingChange, onColumnFiltersChange, onGlobalFilterChange],
  );

  return instance;
}

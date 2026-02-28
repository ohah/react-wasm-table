import { useState, useMemo, useCallback } from "react";
import type {
  GridColumnDef,
  SortingState,
  SortingUpdater,
  ColumnFiltersState,
  ColumnFiltersUpdater,
  ColumnVisibilityState,
  ColumnVisibilityUpdater,
  ColumnSizingState,
  ColumnSizingUpdater,
  ColumnSizingInfoState,
  ColumnSizingInfoUpdater,
  ColumnPinningState,
  ColumnPinningUpdater,
  RowPinningState,
  RowPinningUpdater,
  ExpandedState,
  ExpandedUpdater,
} from "./tanstack-types";
import type { GridInstance, GridState, ViewIndicesRef } from "./grid-instance";
import { buildGridInstance } from "./grid-instance";
import type { RowModelFactory } from "./row-model";

const DEFAULT_COLUMN_SIZING_INFO: ColumnSizingInfoState = {
  startOffset: null,
  startSize: null,
  deltaOffset: 0,
  deltaPercentage: 0,
  isResizingColumn: false,
  columnSizingStart: [],
};

/** Options for useGridTable. */
export interface UseGridTableOptions<TData> {
  /** Row data. */
  data: TData[];
  /** Column definitions (TanStack-compatible). */
  columns: GridColumnDef<TData>[];

  // Controlled state
  /** Controlled state (sorting, columnFilters, globalFilter, columnVisibility, columnSizing, columnSizingInfo, columnPinning). */
  state?: Partial<GridState>;
  /** Callback when sorting changes (controlled mode). */
  onSortingChange?: (updater: SortingUpdater) => void;
  /** Callback when column filters change (controlled mode). */
  onColumnFiltersChange?: (updater: ColumnFiltersUpdater) => void;
  /** Callback when global filter changes (controlled mode). */
  onGlobalFilterChange?: (value: string) => void;
  /** Callback when column visibility changes (controlled mode). */
  onColumnVisibilityChange?: (updater: ColumnVisibilityUpdater) => void;
  /** Callback when column sizing changes (controlled mode). */
  onColumnSizingChange?: (updater: ColumnSizingUpdater) => void;
  /** Callback when column sizing info changes (controlled mode). */
  onColumnSizingInfoChange?: (updater: ColumnSizingInfoUpdater) => void;
  /** Callback when column pinning changes (controlled mode). */
  onColumnPinningChange?: (updater: ColumnPinningUpdater) => void;
  /** Callback when row pinning changes (controlled mode). */
  onRowPinningChange?: (updater: RowPinningUpdater) => void;
  /** Callback when expanded state changes (controlled mode). */
  onExpandedChange?: (updater: ExpandedUpdater) => void;
  /** Initial state (for uncontrolled mode). */
  initialState?: Partial<GridState>;

  // Tree data
  /** Function to extract sub-rows for tree data. */
  getSubRows?: (row: TData) => TData[] | undefined;

  // Row model factories (tree-shakeable markers)
  getCoreRowModel?: RowModelFactory<TData>;
  getSortedRowModel?: RowModelFactory<TData>;
  getFilteredRowModel?: RowModelFactory<TData>;
  getExpandedRowModel?: RowModelFactory<TData>;

  /** Mutable ref holding WASM-computed view indices. Grid writes, GridInstance reads lazily. */
  viewIndicesRef?: ViewIndicesRef;
}

/**
 * TanStack-compatible hook for creating a grid instance.
 * Manages sorting + filter + visibility + sizing + pinning state (controlled or uncontrolled) and builds a GridInstance.
 */
export function useGridTable<TData>(options: UseGridTableOptions<TData>): GridInstance<TData> {
  const {
    data,
    columns,
    state: controlledState,
    viewIndicesRef,
    onSortingChange: controlledOnSortingChange,
    onColumnFiltersChange: controlledOnColumnFiltersChange,
    onGlobalFilterChange: controlledOnGlobalFilterChange,
    onColumnVisibilityChange: controlledOnColumnVisibilityChange,
    onColumnSizingChange: controlledOnColumnSizingChange,
    onColumnSizingInfoChange: controlledOnColumnSizingInfoChange,
    onColumnPinningChange: controlledOnColumnPinningChange,
    onRowPinningChange: controlledOnRowPinningChange,
    onExpandedChange: controlledOnExpandedChange,
    getSubRows,
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
  const [internalColumnVisibility, setInternalColumnVisibility] = useState<ColumnVisibilityState>(
    initialState?.columnVisibility ?? {},
  );
  const [internalColumnSizing, setInternalColumnSizing] = useState<ColumnSizingState>(
    initialState?.columnSizing ?? {},
  );
  const [internalColumnSizingInfo, setInternalColumnSizingInfo] = useState<ColumnSizingInfoState>(
    initialState?.columnSizingInfo ?? DEFAULT_COLUMN_SIZING_INFO,
  );
  const [internalColumnPinning, setInternalColumnPinning] = useState<ColumnPinningState>(
    initialState?.columnPinning ?? { left: [], right: [] },
  );
  const [internalRowPinning, setInternalRowPinning] = useState<RowPinningState>(
    initialState?.rowPinning ?? { top: [], bottom: [] },
  );
  const [internalExpanded, setInternalExpanded] = useState<ExpandedState>(
    initialState?.expanded ?? {},
  );

  // Resolve controlled vs uncontrolled — sorting
  const sorting = controlledState?.sorting ?? internalSorting;
  const onSortingChange = useCallback(
    (updater: SortingUpdater) => {
      if (controlledOnSortingChange) {
        controlledOnSortingChange(updater);
      } else {
        const next = typeof updater === "function" ? updater(sorting) : updater;
        setInternalSorting(next);
      }
    },
    [sorting, controlledOnSortingChange],
  );

  // Resolve controlled vs uncontrolled — column filters
  const columnFilters = controlledState?.columnFilters ?? internalColumnFilters;
  const onColumnFiltersChange = useCallback(
    (updater: ColumnFiltersUpdater) => {
      if (controlledOnColumnFiltersChange) {
        controlledOnColumnFiltersChange(updater);
      } else {
        const next = typeof updater === "function" ? updater(columnFilters) : updater;
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

  // Resolve controlled vs uncontrolled — column visibility
  const columnVisibility = controlledState?.columnVisibility ?? internalColumnVisibility;
  const onColumnVisibilityChange = useCallback(
    (updater: ColumnVisibilityUpdater) => {
      if (controlledOnColumnVisibilityChange) {
        controlledOnColumnVisibilityChange(updater);
      } else {
        const next = typeof updater === "function" ? updater(columnVisibility) : updater;
        setInternalColumnVisibility(next);
      }
    },
    [columnVisibility, controlledOnColumnVisibilityChange],
  );

  // Resolve controlled vs uncontrolled — column sizing
  const columnSizing = controlledState?.columnSizing ?? internalColumnSizing;
  const onColumnSizingChange = useCallback(
    (updater: ColumnSizingUpdater) => {
      if (controlledOnColumnSizingChange) {
        controlledOnColumnSizingChange(updater);
      } else {
        const next = typeof updater === "function" ? updater(columnSizing) : updater;
        setInternalColumnSizing(next);
      }
    },
    [columnSizing, controlledOnColumnSizingChange],
  );

  // Resolve controlled vs uncontrolled — column sizing info
  const columnSizingInfo = controlledState?.columnSizingInfo ?? internalColumnSizingInfo;
  const onColumnSizingInfoChange = useCallback(
    (updater: ColumnSizingInfoUpdater) => {
      if (controlledOnColumnSizingInfoChange) {
        controlledOnColumnSizingInfoChange(updater);
      } else {
        const next = typeof updater === "function" ? updater(columnSizingInfo) : updater;
        setInternalColumnSizingInfo(next);
      }
    },
    [columnSizingInfo, controlledOnColumnSizingInfoChange],
  );

  // Resolve controlled vs uncontrolled — column pinning
  const columnPinning = controlledState?.columnPinning ?? internalColumnPinning;
  const onColumnPinningChange = useCallback(
    (updater: ColumnPinningUpdater) => {
      if (controlledOnColumnPinningChange) {
        controlledOnColumnPinningChange(updater);
      } else {
        const next = typeof updater === "function" ? updater(columnPinning) : updater;
        setInternalColumnPinning(next);
      }
    },
    [columnPinning, controlledOnColumnPinningChange],
  );

  // Resolve controlled vs uncontrolled — row pinning
  const rowPinning = controlledState?.rowPinning ?? internalRowPinning;
  const onRowPinningChange = useCallback(
    (updater: RowPinningUpdater) => {
      if (controlledOnRowPinningChange) {
        controlledOnRowPinningChange(updater);
      } else {
        const next = typeof updater === "function" ? updater(rowPinning) : updater;
        setInternalRowPinning(next);
      }
    },
    [rowPinning, controlledOnRowPinningChange],
  );

  // Resolve controlled vs uncontrolled — expanded
  const expanded = controlledState?.expanded ?? internalExpanded;
  const onExpandedChange = useCallback(
    (updater: ExpandedUpdater) => {
      if (controlledOnExpandedChange) {
        controlledOnExpandedChange(updater);
      } else {
        const next = typeof updater === "function" ? updater(expanded) : updater;
        setInternalExpanded(next);
      }
    },
    [expanded, controlledOnExpandedChange],
  );

  const state: GridState = useMemo(
    () => ({
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      columnSizing,
      columnSizingInfo,
      columnPinning,
      rowPinning,
      expanded,
    }),
    [
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      columnSizing,
      columnSizingInfo,
      columnPinning,
      rowPinning,
      expanded,
    ],
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
        onColumnVisibilityChange,
        onColumnSizingChange,
        onColumnSizingInfoChange,
        onColumnPinningChange,
        onRowPinningChange,
        onExpandedChange,
        getSubRows,
        viewIndicesRef,
      }),
    [
      data,
      columns,
      state,
      onSortingChange,
      onColumnFiltersChange,
      onGlobalFilterChange,
      onColumnVisibilityChange,
      onColumnSizingChange,
      onColumnSizingInfoChange,
      onColumnPinningChange,
      onRowPinningChange,
      onExpandedChange,
      getSubRows,
    ],
  );

  return instance;
}

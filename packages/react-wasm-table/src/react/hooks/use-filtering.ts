import { useState, useCallback, useEffect } from "react";
import type { WasmTableEngine } from "../../types";
import type { ColumnFiltersState, ColumnFilter, ColumnFiltersUpdater } from "../../tanstack-types";
import type { ColumnRegistry } from "../../adapter/column-registry";

export interface UseFilteringParams {
  engine: WasmTableEngine | null;
  columnRegistry: ColumnRegistry;
  columnFiltersProp?: ColumnFiltersState;
  globalFilterProp?: string;
  onColumnFiltersChange?: (updater: ColumnFiltersUpdater) => void;
  onGlobalFilterChange?: (value: string) => void;
  initialColumnFilters?: ColumnFiltersState;
  initialGlobalFilter?: string;
  invalidate: () => void;
}

function toWasmFilters(filters: ColumnFiltersState, columnRegistry: ColumnRegistry) {
  const columns = columnRegistry.getAll();
  return filters
    .map((f: ColumnFilter) => {
      const colIdx = columns.findIndex((c) => c.id === f.id);
      if (colIdx === -1) return null;
      return {
        columnIndex: colIdx,
        op: f.op ?? "eq",
        value: f.value,
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);
}

export function useFiltering({
  engine,
  columnRegistry,
  columnFiltersProp,
  globalFilterProp,
  onColumnFiltersChange,
  onGlobalFilterChange,
  initialColumnFilters,
  initialGlobalFilter,
  invalidate,
}: UseFilteringParams) {
  const [internalColumnFilters, setInternalColumnFilters] = useState<ColumnFiltersState>(
    initialColumnFilters ?? [],
  );
  const [internalGlobalFilter, setInternalGlobalFilter] = useState<string>(
    initialGlobalFilter ?? "",
  );

  const columnFilters = columnFiltersProp ?? internalColumnFilters;
  const globalFilter = globalFilterProp ?? internalGlobalFilter;

  // Sync controlled columnFilters prop → WASM engine
  useEffect(() => {
    if (!engine || columnFiltersProp === undefined) return;
    engine.setColumnarFilters(toWasmFilters(columnFiltersProp, columnRegistry));
    invalidate();
  }, [engine, columnFiltersProp, columnRegistry, invalidate]);

  // Sync controlled globalFilter prop → WASM engine
  useEffect(() => {
    if (!engine || globalFilterProp === undefined) return;
    engine.setGlobalFilter(globalFilterProp || null);
    invalidate();
  }, [engine, globalFilterProp, invalidate]);

  const setColumnFilters = useCallback(
    (filters: ColumnFiltersState) => {
      if (!engine) return;

      if (onColumnFiltersChange) {
        onColumnFiltersChange(filters);
      } else {
        setInternalColumnFilters(filters);
        // Uncontrolled: sync to engine directly (no effect will fire)
        engine.setColumnarFilters(toWasmFilters(filters, columnRegistry));
        invalidate();
      }
    },
    [engine, columnRegistry, onColumnFiltersChange, invalidate],
  );

  const setGlobalFilter = useCallback(
    (value: string) => {
      if (!engine) return;

      if (onGlobalFilterChange) {
        onGlobalFilterChange(value);
      } else {
        setInternalGlobalFilter(value);
        // Uncontrolled: sync to engine directly (no effect will fire)
        engine.setGlobalFilter(value || null);
        invalidate();
      }
    },
    [engine, onGlobalFilterChange, invalidate],
  );

  return { columnFilters, globalFilter, setColumnFilters, setGlobalFilter };
}

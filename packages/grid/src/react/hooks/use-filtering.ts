import { useState, useCallback } from "react";
import type { WasmTableEngine } from "../../types";
import type { ColumnFiltersState, ColumnFilter } from "../../tanstack-types";
import type { ColumnRegistry } from "../../adapter/column-registry";

export interface UseFilteringParams {
  engine: WasmTableEngine | null;
  columnRegistry: ColumnRegistry;
  columnFiltersProp?: ColumnFiltersState;
  globalFilterProp?: string;
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
  onGlobalFilterChange?: (value: string) => void;
  initialColumnFilters?: ColumnFiltersState;
  initialGlobalFilter?: string;
  invalidate: () => void;
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

  const setColumnFilters = useCallback(
    (filters: ColumnFiltersState) => {
      if (!engine) return;

      if (onColumnFiltersChange) {
        onColumnFiltersChange(filters);
      } else {
        setInternalColumnFilters(filters);
      }

      // Convert column IDs to column indices for WASM
      const columns = columnRegistry.getAll();
      const wasmFilters = filters
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

      engine.setColumnarFilters(wasmFilters);
      invalidate();
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
      }

      engine.setGlobalFilter(value || null);
      invalidate();
    },
    [engine, onGlobalFilterChange, invalidate],
  );

  return { columnFilters, globalFilter, setColumnFilters, setGlobalFilter };
}

import { useState, useCallback } from "react";
import type { WasmTableEngine } from "../../types";
import type { SortingState } from "../../tanstack-types";
import type { ColumnRegistry } from "../../adapter/column-registry";

export interface UseSortingParams {
  engine: WasmTableEngine | null;
  columnRegistry: ColumnRegistry;
  sortingProp?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  initialSorting?: SortingState;
  invalidate: () => void;
}

export function useSorting({
  engine,
  columnRegistry,
  sortingProp,
  onSortingChange,
  initialSorting,
  invalidate,
}: UseSortingParams) {
  const [internalSorting, setInternalSorting] = useState<SortingState>(initialSorting ?? []);
  const sorting = sortingProp ?? internalSorting;

  const handleHeaderClick = useCallback(
    (colIndex: number) => {
      if (!engine) return;
      const columns = columnRegistry.getAll();
      const col = columns[colIndex];
      if (!col?.sortable) return;

      const existing = sorting.find((s) => s.id === col.id);
      let next: SortingState;
      if (!existing) {
        next = [{ id: col.id, desc: false }];
      } else if (!existing.desc) {
        next = [{ id: col.id, desc: true }];
      } else {
        next = [];
      }
      if (onSortingChange) {
        onSortingChange(next);
      } else {
        setInternalSorting(next);
      }
      // Apply to WASM engine
      if (next.length > 0) {
        engine.setColumnarSort(
          next.map((s) => ({
            columnIndex: columns.findIndex((c) => c.id === s.id),
            direction: s.desc ? "desc" : "asc",
          })),
        );
      } else {
        engine.setColumnarSort([]);
      }
      invalidate();
    },
    [engine, columnRegistry, sorting, onSortingChange, invalidate],
  );

  return { sorting, handleHeaderClick };
}

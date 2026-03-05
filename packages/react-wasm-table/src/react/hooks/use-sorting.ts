import { useState, useCallback } from "react";
import type { WasmTableEngine } from "../../types";
import type { SortingState, SortingUpdater } from "../../tanstack-types";
import type { ColumnRegistry } from "../../adapter/column-registry";

export interface UseSortingParams {
  engine: WasmTableEngine | null;
  columnRegistry: ColumnRegistry;
  sortingProp?: SortingState;
  onSortingChange?: (updater: SortingUpdater) => void;
  onBeforeSortChange?: (next: SortingState) => boolean | void;
  initialSorting?: SortingState;
  invalidate: () => void;
}

export function useSorting({
  engine,
  columnRegistry,
  sortingProp,
  onSortingChange,
  onBeforeSortChange,
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
      if (onBeforeSortChange?.(next) === false) return;
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
    [engine, columnRegistry, sorting, onSortingChange, onBeforeSortChange, invalidate],
  );

  return { sorting, handleHeaderClick };
}

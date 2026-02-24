import { useCallback } from "react";
import type { SortConfig, SortDirection } from "../types";

interface UseSortingOptions {
  sortConfigs: SortConfig[];
  onSortChange: (configs: SortConfig[]) => void;
}

export function useSorting({ sortConfigs, onSortChange }: UseSortingOptions) {
  const toggleSort = useCallback(
    (columnIndex: number) => {
      const existing = sortConfigs.find((s) => s.columnIndex === columnIndex);

      if (!existing) {
        // Add new ascending sort
        onSortChange([...sortConfigs, { columnIndex, direction: "asc" as SortDirection }]);
      } else if (existing.direction === "asc") {
        // Switch to descending
        onSortChange(
          sortConfigs.map((s) =>
            s.columnIndex === columnIndex ? { ...s, direction: "desc" as SortDirection } : s,
          ),
        );
      } else {
        // Remove sort
        onSortChange(sortConfigs.filter((s) => s.columnIndex !== columnIndex));
      }
    },
    [sortConfigs, onSortChange],
  );

  const getSortDirection = useCallback(
    (columnIndex: number): SortDirection | null => {
      const config = sortConfigs.find((s) => s.columnIndex === columnIndex);
      return config?.direction ?? null;
    },
    [sortConfigs],
  );

  return {
    toggleSort,
    getSortDirection,
  };
}

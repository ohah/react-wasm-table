import type { GridColumnDef, ExpandedState, ExpandedUpdater } from "./tanstack-types";

// ── Row ─────────────────────────────────────────────────────────────

/** Represents a single row with access to its data. */
export interface Row<TData> {
  /** Unique row identifier (string of the original index). */
  id: string;
  /** Index in the current view (after filter/sort). */
  index: number;
  /** Reference to the original data object. */
  original: TData;
  /** Get a single column's value by column ID. */
  getValue(columnId: string): unknown;
  /** Get all cell values as a record keyed by column ID. */
  getAllCellValues(): Record<string, unknown>;
  // ── Tree fields ──
  /** Child rows (empty if leaf). */
  subRows: Row<TData>[];
  /** Nesting depth (0 = root). */
  depth: number;
  /** Parent row ID (undefined for root rows). */
  parentId?: string;
  /** Whether this row has children and can be expanded. */
  getCanExpand: () => boolean;
  /** Whether this row is currently expanded. */
  getIsExpanded: () => boolean;
  /** Toggle the expanded state of this row. */
  toggleExpanded: () => void;
  /** Get all leaf rows (recursively, rows with no subRows). */
  getLeafRows: () => Row<TData>[];
}

// ── RowModel ────────────────────────────────────────────────────────

/** A collection of rows representing a view of the data. */
export interface RowModel<TData> {
  /** Lazily-built array of Row objects. */
  rows: Row<TData>[];
  /** Total number of rows in this model. */
  rowCount: number;
  /** Get a single row by its view index (O(1), created on demand). */
  getRow(index: number): Row<TData>;
}

// ── Factory marker types (tree-shakeable) ───────────────────────────

export interface RowModelFactory<TData> {
  _type: string;
  _phantom?: TData;
}

/** Marker factory for the core (unfiltered, unsorted) row model. */
export function getCoreRowModel<TData>(): RowModelFactory<TData> {
  return { _type: "core" };
}

/** Marker factory for the sorted row model. */
export function getSortedRowModel<TData>(): RowModelFactory<TData> {
  return { _type: "sorted" };
}

/** Marker factory for the filtered row model. */
export function getFilteredRowModel<TData>(): RowModelFactory<TData> {
  return { _type: "filtered" };
}

// ── Builders ────────────────────────────────────────────────────────

/** Options for tree-aware row building. */
export interface BuildRowOptions<TData> {
  subRows?: Row<TData>[];
  depth?: number;
  parentId?: string;
  expanded?: ExpandedState;
  onExpandedChange?: (updater: ExpandedUpdater) => void;
}

/** Build a single Row object from data. */
export function buildRow<TData>(
  data: TData[],
  originalIndex: number,
  viewIndex: number,
  columns: GridColumnDef<TData, any>[],
  options?: BuildRowOptions<TData>,
): Row<TData> {
  const original = data[originalIndex]!;
  const accessorMap = buildAccessorMap(columns);
  const subRows = options?.subRows ?? [];
  const depth = options?.depth ?? 0;
  const parentId = options?.parentId;
  const expanded = options?.expanded;
  const onExpandedChange = options?.onExpandedChange;
  const rowId = String(originalIndex);

  const row: Row<TData> = {
    id: rowId,
    index: viewIndex,
    original,
    getValue(columnId: string): unknown {
      const accessor = accessorMap.get(columnId);
      if (!accessor) return undefined;
      return accessor(original, originalIndex);
    },
    getAllCellValues(): Record<string, unknown> {
      const result: Record<string, unknown> = {};
      for (const [id, accessor] of accessorMap) {
        result[id] = accessor(original, originalIndex);
      }
      return result;
    },
    subRows,
    depth,
    parentId,
    getCanExpand: () => subRows.length > 0,
    getIsExpanded: () => {
      if (!expanded) return false;
      if (expanded === true) return true;
      return expanded[rowId] === true;
    },
    toggleExpanded: () => {
      if (!onExpandedChange) return;
      onExpandedChange((prev) => {
        if (prev === true) {
          // "all expanded" → toggle this one off: build record with all expandable = true, this one = false
          // Simplified: just set this one to false
          return { [rowId]: false };
        }
        const record = { ...prev };
        record[rowId] = !record[rowId];
        return record;
      });
    },
    getLeafRows: () => collectLeafRows(subRows),
  };

  return row;
}

/** Build a RowModel from data + optional index indirection. */
export function buildRowModel<TData>(
  data: TData[],
  indices: Uint32Array | number[] | null,
  columns: GridColumnDef<TData, any>[],
): RowModel<TData> {
  const effectiveIndices = indices ?? Array.from({ length: data.length }, (_, i) => i);
  const rowCount = effectiveIndices.length;

  let cachedRows: Row<TData>[] | null = null;

  return {
    get rows(): Row<TData>[] {
      if (!cachedRows) {
        cachedRows = Array.from({ length: rowCount }, (_, viewIndex) =>
          buildRow(data, effectiveIndices[viewIndex]!, viewIndex, columns),
        );
      }
      return cachedRows;
    },
    rowCount,
    getRow(index: number): Row<TData> {
      if (index < 0 || index >= rowCount) {
        throw new RangeError(`Row index ${index} out of range [0, ${rowCount})`);
      }
      return buildRow(data, effectiveIndices[index]!, index, columns);
    },
  };
}

// ── Expanded Row Model ──────────────────────────────────────────────

/** Marker factory for the expanded row model. */
export function getExpandedRowModel<TData>(): RowModelFactory<TData> {
  return { _type: "expanded" };
}

/** Build an expanded row model from tree data. */
export function buildExpandedRowModel<TData>(
  data: TData[],
  columns: GridColumnDef<TData, any>[],
  getSubRows: (row: TData) => TData[] | undefined,
  expanded: ExpandedState,
  onExpandedChange?: (updater: ExpandedUpdater) => void,
): RowModel<TData> {
  let viewIndex = 0;

  function buildTreeRows(
    items: TData[],
    allData: TData[],
    depth: number,
    parentId?: string,
  ): Row<TData>[] {
    const rows: Row<TData>[] = [];
    for (const item of items) {
      const originalIndex = allData.indexOf(item);
      const idx = originalIndex >= 0 ? originalIndex : allData.length;
      // If item is not in top-level data, push it and use that index
      if (originalIndex < 0) {
        allData.push(item);
      }
      const actualIndex = originalIndex >= 0 ? originalIndex : allData.length - 1;

      const subRowData = getSubRows(item);
      const subRows = subRowData && subRowData.length > 0
        ? buildTreeRows(subRowData, allData, depth + 1, String(actualIndex))
        : [];

      const row = buildRow(allData, actualIndex, viewIndex, columns, {
        subRows,
        depth,
        parentId,
        expanded,
        onExpandedChange,
      });
      rows.push(row);
      viewIndex++;
    }
    return rows;
  }

  // We need a mutable copy of data array to track sub-row indices
  const allData = [...data];
  viewIndex = 0;
  const treeRows = buildTreeRows(data, allData, 0);

  // Flatten based on expanded state
  const flatRows: Row<TData>[] = [];
  function flattenExpanded(rows: Row<TData>[]) {
    for (const row of rows) {
      flatRows.push(row);
      if (row.getIsExpanded() && row.subRows.length > 0) {
        flattenExpanded(row.subRows);
      }
    }
  }
  flattenExpanded(treeRows);

  // Reassign view indices
  for (let i = 0; i < flatRows.length; i++) {
    (flatRows[i] as { index: number }).index = i;
  }

  return {
    rows: flatRows,
    rowCount: flatRows.length,
    getRow(index: number): Row<TData> {
      if (index < 0 || index >= flatRows.length) {
        throw new RangeError(`Row index ${index} out of range [0, ${flatRows.length})`);
      }
      return flatRows[index]!;
    },
  };
}

// ── Internal helpers ────────────────────────────────────────────────

function collectLeafRows<TData>(rows: Row<TData>[]): Row<TData>[] {
  const leaves: Row<TData>[] = [];
  for (const row of rows) {
    if (row.subRows.length === 0) {
      leaves.push(row);
    } else {
      leaves.push(...collectLeafRows(row.subRows));
    }
  }
  return leaves;
}

type AccessorFn<TData> = (row: TData, index: number) => unknown;

function buildAccessorMap<TData>(
  columns: GridColumnDef<TData, any>[],
): Map<string, AccessorFn<TData>> {
  const map = new Map<string, AccessorFn<TData>>();
  for (const col of columns) {
    const id = getColId(col);
    if ("accessorKey" in col && col.accessorKey) {
      const key = col.accessorKey as string;
      map.set(id, (row) => (row as Record<string, unknown>)[key]);
    } else if ("accessorFn" in col && col.accessorFn) {
      map.set(id, col.accessorFn as AccessorFn<TData>);
    }
    // Group columns: recurse
    if ("columns" in col && col.columns) {
      for (const [childId, childAccessor] of buildAccessorMap(col.columns)) {
        map.set(childId, childAccessor);
      }
    }
  }
  return map;
}

function getColId<TData>(col: GridColumnDef<TData, any>): string {
  if ("id" in col && col.id) return col.id;
  if ("accessorKey" in col && col.accessorKey) return col.accessorKey as string;
  return "";
}

import type { GridColumnDef } from "./tanstack-types";

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

/** Build a single Row object from data. */
export function buildRow<TData>(
  data: TData[],
  originalIndex: number,
  viewIndex: number,
  columns: GridColumnDef<TData, any>[],
): Row<TData> {
  const original = data[originalIndex]!;
  const accessorMap = buildAccessorMap(columns);

  return {
    id: String(originalIndex),
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
  };
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

// ── Internal helpers ────────────────────────────────────────────────

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

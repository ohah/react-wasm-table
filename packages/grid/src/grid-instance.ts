import type {
  GridColumnDef,
  SortingState,
  SortingUpdater,
  CellContext,
  HeaderContext,
} from "./tanstack-types";
import { getLeafColumns } from "./resolve-columns";

// ── GridColumn ──────────────────────────────────────────────────────

/** Represents a resolved column with runtime methods (TanStack-compatible). */
export interface GridColumn<TData = unknown, TValue = unknown> {
  /** Column ID. */
  id: string;
  /** The original column definition. */
  columnDef: GridColumnDef<TData, TValue>;
  /** Nesting depth (0 = root). */
  depth: number;
  /** Parent column (for groups). */
  parent?: GridColumn<TData>;
  /** Sub-columns (for groups). */
  columns: GridColumn<TData>[];

  /** Get the column's current size. */
  getSize: () => number;
  /** Can this column be sorted? */
  getCanSort: () => boolean;
  /** Current sort direction, or false if not sorted. */
  getIsSorted: () => false | "asc" | "desc";
  /** Toggle sorting. */
  toggleSorting: (desc?: boolean) => void;
  /** Returns an event handler for toggling sort on click. */
  getToggleSortingHandler: () => (event: unknown) => void;
}

// ── GridHeader ──────────────────────────────────────────────────────

/** Represents a header cell in a header group row. */
export interface GridHeader<TData = unknown, TValue = unknown> {
  id: string;
  column: GridColumn<TData, TValue>;
  colSpan: number;
  rowSpan: number;
  depth: number;
  isPlaceholder: boolean;
  subHeaders: GridHeader<TData>[];
  getContext: () => HeaderContext<TData, TValue>;
}

/** A row of headers (one per depth level). */
export interface GridHeaderGroup<TData = unknown> {
  id: string;
  depth: number;
  headers: GridHeader<TData>[];
}

// ── GridState ───────────────────────────────────────────────────────

/** The grid's internal state. */
export interface GridState {
  sorting: SortingState;
}

// ── GridInstance ─────────────────────────────────────────────────────

/** The main grid instance returned by useGridTable. */
export interface GridInstance<TData = unknown> {
  /** Get the current grid state. */
  getState: () => GridState;
  /** Get all columns (including groups). */
  getAllColumns: () => GridColumn<TData>[];
  /** Get only leaf columns (no groups). */
  getAllLeafColumns: () => GridColumn<TData>[];
  /** Get a specific column by ID. */
  getColumn: (id: string) => GridColumn<TData> | undefined;

  /** Set the sorting state. */
  setSorting: (updater: SortingUpdater) => void;
  /** Reset sorting to initial state. */
  resetSorting: () => void;
}

// ── Builder ─────────────────────────────────────────────────────────

interface BuildOptions<TData> {
  columns: GridColumnDef<TData>[];
  state: GridState;
  onSortingChange: (updater: SortingUpdater) => void;
}

/** Build GridColumn instances from column definitions. */
function buildGridColumns<TData>(
  defs: GridColumnDef<TData>[],
  state: GridState,
  onSortingChange: (updater: SortingUpdater) => void,
  depth: number = 0,
  parent?: GridColumn<TData>,
): GridColumn<TData>[] {
  return defs.map((def) => {
    const id = getColumnId(def);

    const column: GridColumn<TData> = {
      id,
      columnDef: def,
      depth,
      parent,
      columns: [],
      getSize: () => ("size" in def && def.size ? def.size : 150),
      getCanSort: () => {
        if ("enableSorting" in def) return def.enableSorting !== false;
        return false;
      },
      getIsSorted: () => {
        const sort = state.sorting.find((s) => s.id === id);
        if (!sort) return false;
        return sort.desc ? "desc" : "asc";
      },
      toggleSorting: (desc?: boolean) => {
        onSortingChange((prev) => {
          const existing = prev.find((s) => s.id === id);
          if (desc !== undefined) {
            return [{ id, desc }];
          }
          if (!existing) {
            return [{ id, desc: false }];
          }
          if (!existing.desc) {
            return [{ id, desc: true }];
          }
          // Remove sort
          return [];
        });
      },
      getToggleSortingHandler: () => {
        return () => column.toggleSorting();
      },
    };

    // Recurse for group columns
    if ("columns" in def && def.columns) {
      column.columns = buildGridColumns(def.columns, state, onSortingChange, depth + 1, column);
    }

    return column;
  });
}

/** Build a GridInstance from options. */
export function buildGridInstance<TData>(options: BuildOptions<TData>): GridInstance<TData> {
  const { columns: defs, state, onSortingChange } = options;

  const allColumns = buildGridColumns(defs, state, onSortingChange);

  const leafColumns: GridColumn<TData>[] = [];
  function collectLeaves(cols: GridColumn<TData>[]) {
    for (const col of cols) {
      if (col.columns.length > 0) {
        collectLeaves(col.columns);
      } else {
        leafColumns.push(col);
      }
    }
  }
  collectLeaves(allColumns);

  const columnMap = new Map<string, GridColumn<TData>>();
  function indexColumns(cols: GridColumn<TData>[]) {
    for (const col of cols) {
      columnMap.set(col.id, col);
      if (col.columns.length > 0) indexColumns(col.columns);
    }
  }
  indexColumns(allColumns);

  return {
    getState: () => state,
    getAllColumns: () => allColumns,
    getAllLeafColumns: () => leafColumns,
    getColumn: (id) => columnMap.get(id),
    setSorting: onSortingChange,
    resetSorting: () => onSortingChange([]),
  };
}

/** Extract or derive column ID from a definition. */
function getColumnId<TData>(def: GridColumnDef<TData>): string {
  if ("id" in def && def.id) return def.id;
  if ("accessorKey" in def && def.accessorKey) return def.accessorKey as string;
  return `col_${Math.random().toString(36).slice(2, 8)}`;
}

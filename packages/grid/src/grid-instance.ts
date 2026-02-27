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
  ColumnPinningPosition,
  CellContext,
  HeaderContext,
} from "./tanstack-types";
import { getLeafColumns } from "./resolve-columns";
import type { Row, RowModel, RowModelFactory } from "./row-model";
import { buildRowModel } from "./row-model";

// ── Default state values ────────────────────────────────────────────

const DEFAULT_COLUMN_SIZING_INFO: ColumnSizingInfoState = {
  startOffset: null,
  startSize: null,
  deltaOffset: 0,
  deltaPercentage: 0,
  isResizingColumn: false,
  columnSizingStart: [],
};

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

  // Sorting
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

  // Filtering (per-column)
  /** Can this column be filtered? */
  getCanFilter: () => boolean;
  /** Is this column currently filtered? */
  getIsFiltered: () => boolean;
  /** Get the current filter value for this column. */
  getFilterValue: () => unknown;
  /** Set filter value for this column. */
  setFilterValue: (value: unknown) => void;
  /** Reset (remove) filter for this column. */
  resetFilterValue: () => void;

  // Visibility
  /** Can this column be hidden? */
  getCanHide: () => boolean;
  /** Is this column currently visible? */
  getIsVisible: () => boolean;
  /** Toggle visibility. */
  toggleVisibility: (isVisible?: boolean) => void;

  // Resizing
  /** Can this column be resized? */
  getCanResize: () => boolean;
  /** Is this column currently being resized? */
  getIsResizing: () => boolean;
  /** Reset column size to definition default. */
  resetSize: () => void;

  // Pinning
  /** Can this column be pinned? */
  getCanPin: () => boolean;
  /** Get the pin position ("left" | "right" | false). */
  getIsPinned: () => ColumnPinningPosition;
  /** Pin this column to a position. */
  pin: (position: "left" | "right") => void;
  /** Unpin this column. */
  unpin: () => void;
  /** Get the index of this column within its pinned group (-1 if not pinned). */
  getPinnedIndex: () => number;
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
  columnFilters: ColumnFiltersState;
  globalFilter: string;
  columnVisibility?: ColumnVisibilityState;
  columnSizing?: ColumnSizingState;
  columnSizingInfo?: ColumnSizingInfoState;
  columnPinning?: ColumnPinningState;
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

  // Sorting
  /** Set the sorting state. */
  setSorting: (updater: SortingUpdater) => void;
  /** Reset sorting to initial state. */
  resetSorting: () => void;

  // Filtering
  /** Set column filters. */
  setColumnFilters: (updater: ColumnFiltersUpdater) => void;
  /** Set global filter string. */
  setGlobalFilter: (value: string) => void;
  /** Reset column filters to empty. */
  resetColumnFilters: () => void;

  // Visibility
  /** Set column visibility state. */
  setColumnVisibility: (updater: ColumnVisibilityUpdater) => void;
  /** Reset column visibility to all-visible. */
  resetColumnVisibility: () => void;
  /** Get visible leaf columns. */
  getVisibleLeafColumns: () => GridColumn<TData>[];

  // Resizing
  /** Set column sizing state. */
  setColumnSizing: (updater: ColumnSizingUpdater) => void;
  /** Reset column sizing to defaults. */
  resetColumnSizing: () => void;
  /** Set column sizing info (drag state). */
  setColumnSizingInfo: (updater: ColumnSizingInfoUpdater) => void;

  // Pinning
  /** Set column pinning state. */
  setColumnPinning: (updater: ColumnPinningUpdater) => void;
  /** Reset column pinning. */
  resetColumnPinning: () => void;
  /** Get left-pinned visible leaf columns. */
  getLeftLeafColumns: () => GridColumn<TData>[];
  /** Get right-pinned visible leaf columns. */
  getRightLeafColumns: () => GridColumn<TData>[];
  /** Get center (unpinned) visible leaf columns. */
  getCenterLeafColumns: () => GridColumn<TData>[];

  // Row model
  /** Get the current view row model (after filter + sort, using viewIndices). */
  getRowModel: () => RowModel<TData>;
  /** Get the core row model (original data order). */
  getCoreRowModel: () => RowModel<TData>;
  /** Get a single row by view index. */
  getRow: (index: number) => Row<TData>;
}

// ── Callbacks ───────────────────────────────────────────────────────

interface BuildColumnCallbacks {
  onSortingChange: (updater: SortingUpdater) => void;
  onColumnFiltersChange: (updater: ColumnFiltersUpdater) => void;
  onColumnVisibilityChange: (updater: ColumnVisibilityUpdater) => void;
  onColumnSizingChange: (updater: ColumnSizingUpdater) => void;
  onColumnSizingInfoChange: (updater: ColumnSizingInfoUpdater) => void;
  onColumnPinningChange: (updater: ColumnPinningUpdater) => void;
}

// ── Builder ─────────────────────────────────────────────────────────

export interface BuildOptions<TData> {
  data: TData[];
  columns: GridColumnDef<TData, any>[];
  state: GridState;
  onSortingChange: (updater: SortingUpdater) => void;
  onColumnFiltersChange: (updater: ColumnFiltersUpdater) => void;
  onGlobalFilterChange: (value: string) => void;
  onColumnVisibilityChange?: (updater: ColumnVisibilityUpdater) => void;
  onColumnSizingChange?: (updater: ColumnSizingUpdater) => void;
  onColumnSizingInfoChange?: (updater: ColumnSizingInfoUpdater) => void;
  onColumnPinningChange?: (updater: ColumnPinningUpdater) => void;
  viewIndices?: Uint32Array | number[] | null;
}

/** Build GridColumn instances from column definitions. */
function buildGridColumns<TData>(
  defs: GridColumnDef<TData, any>[],
  state: GridState,
  callbacks: BuildColumnCallbacks,
  depth: number = 0,
  parent?: GridColumn<TData>,
): GridColumn<TData>[] {
  const visibility = state.columnVisibility ?? {};
  const sizing = state.columnSizing ?? {};
  const sizingInfo = state.columnSizingInfo ?? DEFAULT_COLUMN_SIZING_INFO;
  const pinning = state.columnPinning ?? { left: [], right: [] };

  return defs.map((def) => {
    const id = getColumnId(def);
    const isAccessor = "accessorKey" in def || "accessorFn" in def;

    const column: GridColumn<TData> = {
      id,
      columnDef: def,
      depth,
      parent,
      columns: [],

      // ── Sizing ──
      getSize: () => sizing[id] ?? ("size" in def && def.size ? def.size : 150),

      // ── Sorting ──
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
        callbacks.onSortingChange((prev) => {
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

      // ── Filtering (per-column) ──
      getCanFilter: () => {
        if ("enableColumnFilter" in def) return def.enableColumnFilter !== false;
        return isAccessor;
      },
      getIsFiltered: () => {
        return state.columnFilters.some((f) => f.id === id);
      },
      getFilterValue: () => {
        const filter = state.columnFilters.find((f) => f.id === id);
        return filter?.value;
      },
      setFilterValue: (value: unknown) => {
        callbacks.onColumnFiltersChange((prev) => {
          const idx = prev.findIndex((f) => f.id === id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx]!, value };
            return next;
          }
          return [...prev, { id, value }];
        });
      },
      resetFilterValue: () => {
        callbacks.onColumnFiltersChange((prev) => prev.filter((f) => f.id !== id));
      },

      // ── Visibility ──
      getCanHide: () => {
        if ("enableHiding" in def) return def.enableHiding !== false;
        return true;
      },
      getIsVisible: () => {
        return visibility[id] !== false;
      },
      toggleVisibility: (isVisible?: boolean) => {
        callbacks.onColumnVisibilityChange((prev) => {
          const current = prev[id] !== false;
          const next = isVisible !== undefined ? isVisible : !current;
          return { ...prev, [id]: next };
        });
      },

      // ── Resizing ──
      getCanResize: () => {
        if ("enableResizing" in def) return def.enableResizing !== false;
        return true;
      },
      getIsResizing: () => {
        return sizingInfo.isResizingColumn === id;
      },
      resetSize: () => {
        callbacks.onColumnSizingChange((prev) => {
          const { [id]: _, ...rest } = prev;
          return rest;
        });
      },

      // ── Pinning ──
      getCanPin: () => {
        if ("enablePinning" in def) return def.enablePinning !== false;
        return true;
      },
      getIsPinned: () => {
        if (pinning.left.includes(id)) return "left";
        if (pinning.right.includes(id)) return "right";
        return false;
      },
      pin: (position: "left" | "right") => {
        callbacks.onColumnPinningChange((prev) => {
          const left = prev.left.filter((cid) => cid !== id);
          const right = prev.right.filter((cid) => cid !== id);
          if (position === "left") {
            left.push(id);
          } else {
            right.push(id);
          }
          return { left, right };
        });
      },
      unpin: () => {
        callbacks.onColumnPinningChange((prev) => ({
          left: prev.left.filter((cid) => cid !== id),
          right: prev.right.filter((cid) => cid !== id),
        }));
      },
      getPinnedIndex: () => {
        const leftIdx = pinning.left.indexOf(id);
        if (leftIdx >= 0) return leftIdx;
        const rightIdx = pinning.right.indexOf(id);
        if (rightIdx >= 0) return rightIdx;
        return -1;
      },
    };

    // Recurse for group columns
    if ("columns" in def && def.columns) {
      column.columns = buildGridColumns(def.columns, state, callbacks, depth + 1, column);
    }

    return column;
  });
}

/** Build a GridInstance from options. */
export function buildGridInstance<TData>(options: BuildOptions<TData>): GridInstance<TData> {
  const {
    data,
    columns: defs,
    state,
    onSortingChange,
    onColumnFiltersChange,
    onGlobalFilterChange,
    onColumnVisibilityChange = () => {},
    onColumnSizingChange = () => {},
    onColumnSizingInfoChange = () => {},
    onColumnPinningChange = () => {},
    viewIndices,
  } = options;

  const callbacks: BuildColumnCallbacks = {
    onSortingChange,
    onColumnFiltersChange,
    onColumnVisibilityChange,
    onColumnSizingChange,
    onColumnSizingInfoChange,
    onColumnPinningChange,
  };

  const allColumns = buildGridColumns(defs, state, callbacks);

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

  const visibility = state.columnVisibility ?? {};
  const pinning = state.columnPinning ?? { left: [], right: [] };

  // Row model caches
  let cachedRowModel: RowModel<TData> | null = null;
  let cachedCoreRowModel: RowModel<TData> | null = null;

  return {
    getState: () => state,
    getAllColumns: () => allColumns,
    getAllLeafColumns: () => leafColumns,
    getColumn: (id) => columnMap.get(id),

    // Sorting
    setSorting: onSortingChange,
    resetSorting: () => onSortingChange([]),

    // Filtering
    setColumnFilters: onColumnFiltersChange,
    setGlobalFilter: onGlobalFilterChange,
    resetColumnFilters: () => onColumnFiltersChange([]),

    // Visibility
    setColumnVisibility: onColumnVisibilityChange,
    resetColumnVisibility: () => onColumnVisibilityChange({}),
    getVisibleLeafColumns: () => leafColumns.filter((col) => visibility[col.id] !== false),

    // Resizing
    setColumnSizing: onColumnSizingChange,
    resetColumnSizing: () => onColumnSizingChange({}),
    setColumnSizingInfo: onColumnSizingInfoChange,

    // Pinning
    setColumnPinning: onColumnPinningChange,
    resetColumnPinning: () => onColumnPinningChange({ left: [], right: [] }),
    getLeftLeafColumns: () => {
      const visible = leafColumns.filter((col) => visibility[col.id] !== false);
      return pinning.left
        .map((id) => visible.find((col) => col.id === id))
        .filter((col): col is GridColumn<TData> => col !== undefined);
    },
    getRightLeafColumns: () => {
      const visible = leafColumns.filter((col) => visibility[col.id] !== false);
      return pinning.right
        .map((id) => visible.find((col) => col.id === id))
        .filter((col): col is GridColumn<TData> => col !== undefined);
    },
    getCenterLeafColumns: () => {
      const pinnedIds = new Set([...pinning.left, ...pinning.right]);
      return leafColumns.filter(
        (col) => visibility[col.id] !== false && !pinnedIds.has(col.id),
      );
    },

    // Row model
    getRowModel: () => {
      if (!cachedRowModel) {
        cachedRowModel = buildRowModel(data, viewIndices ?? null, defs);
      }
      return cachedRowModel;
    },
    getCoreRowModel: () => {
      if (!cachedCoreRowModel) {
        cachedCoreRowModel = buildRowModel(data, null, defs);
      }
      return cachedCoreRowModel;
    },
    getRow: (index: number) => {
      const model = buildRowModel(data, viewIndices ?? null, defs);
      return model.getRow(index);
    },
  };
}

/** Extract or derive column ID from a definition. */
function getColumnId<TData>(def: GridColumnDef<TData, any>): string {
  if ("id" in def && def.id) return def.id;
  if ("accessorKey" in def && def.accessorKey) return def.accessorKey as string;
  return `col_${Math.random().toString(36).slice(2, 8)}`;
}

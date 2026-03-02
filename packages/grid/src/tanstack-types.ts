import type { ReactElement, ReactNode } from "react";
import type {
  RenderInstruction,
  BoxModelProps,
  CellEditRenderProps,
  CssDimension,
  CssBorderStyle,
  CssAlignItems,
  CssPosition,
  CssRect,
  CssLengthAuto,
  CssGridLine,
} from "./types";

// ── Sorting state ───────────────────────────────────────────────────

export interface SortingState extends Array<ColumnSort> {}

export interface ColumnSort {
  id: string;
  desc: boolean;
}

export type SortingUpdater = SortingState | ((prev: SortingState) => SortingState);

// ── Filter state ────────────────────────────────────────────────────

export type FilterOp =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "startsWith"
  | "endsWith";

export interface ColumnFilter {
  id: string;
  value: unknown;
  op?: FilterOp;
}

export interface ColumnFiltersState extends Array<ColumnFilter> {}

export type ColumnFiltersUpdater =
  | ColumnFiltersState
  | ((prev: ColumnFiltersState) => ColumnFiltersState);

// ── Column Order state ──────────────────────────────────────────────

export type ColumnOrderState = string[];
export type ColumnOrderUpdater = ColumnOrderState | ((prev: ColumnOrderState) => ColumnOrderState);

// ── Column Visibility state ─────────────────────────────────────────

/** Map of column ID → visible. Missing key = visible (true). */
export type ColumnVisibilityState = Record<string, boolean>;

export type ColumnVisibilityUpdater =
  | ColumnVisibilityState
  | ((prev: ColumnVisibilityState) => ColumnVisibilityState);

// ── Column Sizing state ────────────────────────────────────────────

/** Map of column ID → overridden width in px. */
export type ColumnSizingState = Record<string, number>;

export type ColumnSizingUpdater =
  | ColumnSizingState
  | ((prev: ColumnSizingState) => ColumnSizingState);

/** Transient drag-resize info (modelled after TanStack). */
export interface ColumnSizingInfoState {
  startOffset: number | null;
  startSize: number | null;
  deltaOffset: number;
  deltaPercentage: number;
  isResizingColumn: string | false;
  columnSizingStart: [string, number][];
}

export type ColumnSizingInfoUpdater =
  | ColumnSizingInfoState
  | ((prev: ColumnSizingInfoState) => ColumnSizingInfoState);

// ── Column Pinning state ───────────────────────────────────────────

export interface ColumnPinningState {
  left: string[];
  right: string[];
}

export type ColumnPinningUpdater =
  | ColumnPinningState
  | ((prev: ColumnPinningState) => ColumnPinningState);

export type ColumnPinningPosition = "left" | "right" | false;

// ── Row Pinning state ─────────────────────────────────────────────

/** Row IDs pinned to top / bottom (e.g. summary row, total row). */
export interface RowPinningState {
  top: string[];
  bottom: string[];
}

export type RowPinningUpdater = RowPinningState | ((prev: RowPinningState) => RowPinningState);

// ── Pagination state ──────────────────────────────────────────────

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export type PaginationUpdater = PaginationState | ((prev: PaginationState) => PaginationState);

// ── Grouping state ────────────────────────────────────────────────

/** Column IDs to group by (order = nesting depth). */
export type GroupingState = string[];

export type GroupingUpdater = GroupingState | ((prev: GroupingState) => GroupingState);

// ── Expanded state ─────────────────────────────────────────────────

/** true = all expanded, Record<string, boolean> = per-row. */
export type ExpandedState = true | Record<string, boolean>;
export type ExpandedUpdater = ExpandedState | ((prev: ExpandedState) => ExpandedState);

// ── CellContext / HeaderContext ──────────────────────────────────────

/** Context passed to the `cell` render function. Mirrors TanStack CellContext. */
export interface CellContext<TData, TValue> {
  /** Get the cell's resolved value. */
  getValue: () => TValue;
  /** Get the cell's rendered value (same as getValue for canvas). */
  renderValue: () => TValue | null;
  /** Row information. */
  row: {
    /** Unique row identifier. */
    id: string;
    original: TData;
    index: number;
    getValue: (columnId: string) => unknown;
    /** All cell values keyed by column ID. */
    getAllCellValues?: () => Record<string, unknown>;
  };
  /** Column information. */
  column: {
    id: string;
    // Use `any` for TValue to avoid covariance issues when mixing column types in arrays
    columnDef: GridColumnDef<TData, any>;
  };
  /** The cell instance (available when rendered via Table/flexRender). */
  cell?: unknown;
  /** The table instance (available when rendered via Table/flexRender). */
  table?: unknown;
}

/** Context passed to the `header` render function. */
export interface HeaderContext<TData, TValue = unknown> {
  column: {
    id: string;
    // Use `any` for TValue to avoid covariance issues when mixing column types in arrays
    columnDef: GridColumnDef<TData, any>;
  };
  /** The header instance (available when rendered via Table/flexRender). */
  header?: unknown;
  /** The table instance (available when rendered via Table/flexRender). */
  table?: unknown;
}

// ── Column definition types ─────────────────────────────────────────

/** Base column definition shared by all column types. */
export interface ColumnDefBase<TData, TValue = unknown> {
  /** Header label or render function. */
  header?: string | ((ctx: HeaderContext<TData, TValue>) => string);
  /** Cell render function. Returns RenderInstruction, JSX ReactElement, or string. */
  cell?: string | ((info: CellContext<TData, TValue>) => RenderInstruction | ReactElement | string);
  /** Footer label or render function. */
  footer?: string;

  // Sizing (TanStack-compatible names)
  /** Column width in pixels. Maps to internal `width`. */
  size?: number;
  /** Minimum column width. Maps to internal `minWidth`. */
  minSize?: number;
  /** Maximum column width. Maps to internal `maxSize`. */
  maxSize?: number;

  // Sorting
  /** Enable sorting for this column. Maps to internal `sortable`. */
  enableSorting?: boolean;
  /** Enable selection starting from this column. Maps to internal `selectable`. @default true */
  enableSelection?: boolean;
  /** Custom sort function (future support). */
  sortingFn?: string;

  // Filtering
  /** Enable per-column filtering. @default true for accessor columns */
  enableColumnFilter?: boolean;
  /** Custom filter function name (future support). */
  filterFn?: string;

  // Visibility
  /** Enable hiding for this column. @default true */
  enableHiding?: boolean;

  // Resizing
  /** Enable resizing for this column. @default true */
  enableResizing?: boolean;

  // Pinning
  /** Enable pinning for this column. @default true */
  enablePinning?: boolean;

  // Our extensions (Taffy flexbox)
  /** Content alignment. */
  align?: "left" | "center" | "right";
  /** Flex grow factor. */
  flexGrow?: number;
  /** Flex shrink factor. */
  flexShrink?: number;
  /** Flex basis. */
  flexBasis?: CssDimension;
  /** Editor type for inline editing. */
  editor?: "text" | "number" | "select";
  /** Custom editor render function. Takes precedence over `editor` when both are set. */
  editCell?: (props: CellEditRenderProps) => ReactNode;
  /** Editor options (e.g. dropdown options for select editor). */
  editorOptions?: { options: { label: string; value: unknown }[] };

  // Box model extensions
  /** Padding. */
  padding?: BoxModelProps["padding"];
  paddingTop?: BoxModelProps["paddingTop"];
  paddingRight?: BoxModelProps["paddingRight"];
  paddingBottom?: BoxModelProps["paddingBottom"];
  paddingLeft?: BoxModelProps["paddingLeft"];
  /** Height. */
  height?: CssDimension;
  minHeight?: CssDimension;
  maxHeight?: CssDimension;
  /** Align self. */
  alignSelf?: CssAlignItems;
  /** Position. */
  position?: CssPosition;
  /** Inset. */
  inset?: CssRect<CssLengthAuto>;
  insetTop?: CssLengthAuto;
  insetRight?: CssLengthAuto;
  insetBottom?: CssLengthAuto;
  insetLeft?: CssLengthAuto;
  /** Grid placement. */
  gridRow?: CssGridLine;
  gridColumn?: CssGridLine;
  justifySelf?: CssAlignItems;
  /** Margin. */
  margin?: BoxModelProps["margin"];
  marginTop?: BoxModelProps["marginTop"];
  marginRight?: BoxModelProps["marginRight"];
  marginBottom?: BoxModelProps["marginBottom"];
  marginLeft?: BoxModelProps["marginLeft"];
  /** Border width. */
  borderWidth?: BoxModelProps["borderWidth"];
  borderTopWidth?: BoxModelProps["borderTopWidth"];
  borderRightWidth?: BoxModelProps["borderRightWidth"];
  borderBottomWidth?: BoxModelProps["borderBottomWidth"];
  borderLeftWidth?: BoxModelProps["borderLeftWidth"];
  /** Border color (overrides theme.borderColor for this column). */
  borderColor?: string;
  /** Border style. @default "solid" */
  borderStyle?: CssBorderStyle;
}

/** Column defined by an accessor key (property name). */
export interface AccessorKeyColumnDef<TData, TValue = unknown> extends ColumnDefBase<
  TData,
  TValue
> {
  id?: string;
  accessorKey: (string & {}) | (keyof TData & string);
  accessorFn?: never;
  columns?: never;
}

/** Column defined by an accessor function. */
export interface AccessorFnColumnDef<TData, TValue = unknown> extends ColumnDefBase<TData, TValue> {
  id: string;
  accessorFn: (row: TData, index: number) => TValue;
  accessorKey?: never;
  columns?: never;
}

/** Display-only column (no data accessor). */
export interface DisplayColumnDef<TData, TValue = unknown> extends ColumnDefBase<TData, TValue> {
  id: string;
  accessorKey?: never;
  accessorFn?: never;
  columns?: never;
}

/** Group column (contains sub-columns). */
export interface GroupColumnDef<TData, TValue = unknown> extends ColumnDefBase<TData, TValue> {
  id?: string;
  accessorKey?: never;
  accessorFn?: never;
  columns: GridColumnDef<TData, any>[];
}

/** Union of all column definition types. */
export type GridColumnDef<TData = unknown, TValue = unknown> =
  | AccessorKeyColumnDef<TData, TValue>
  | AccessorFnColumnDef<TData, TValue>
  | DisplayColumnDef<TData, TValue>
  | GroupColumnDef<TData, TValue>;

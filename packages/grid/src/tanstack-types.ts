import type { ReactElement } from "react";
import type {
  RenderInstruction,
  BoxModelProps,
  CssDimension,
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

// ── CellContext / HeaderContext ──────────────────────────────────────

/** Context passed to the `cell` render function. Mirrors TanStack CellContext. */
export interface CellContext<TData, TValue> {
  /** Get the cell's resolved value. */
  getValue: () => TValue;
  /** Get the cell's rendered value (same as getValue for canvas). */
  renderValue: () => TValue | null;
  /** Row information. */
  row: {
    original: TData;
    index: number;
    getValue: (columnId: string) => unknown;
  };
  /** Column information. */
  column: {
    id: string;
    // Use `any` for TValue to avoid covariance issues when mixing column types in arrays
    columnDef: GridColumnDef<TData, any>;
  };
}

/** Context passed to the `header` render function. */
export interface HeaderContext<TData, TValue = unknown> {
  column: {
    id: string;
    // Use `any` for TValue to avoid covariance issues when mixing column types in arrays
    columnDef: GridColumnDef<TData, any>;
  };
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
}

/** Column defined by an accessor key (property name). */
export interface AccessorKeyColumnDef<TData, TValue = unknown> extends ColumnDefBase<
  TData,
  TValue
> {
  id?: string;
  accessorKey: keyof TData & string;
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

// ── CSS value types ──────────────────────────────────────────────────

/** A CSS dimension: pixel number, percentage string, or "auto". */
export type CssDimension = number | `${number}%` | "auto";

/** A CSS length: pixel number or percentage string. */
export type CssLength = number | `${number}%`;

/** A CSS length or "auto". */
export type CssLengthAuto = number | `${number}%` | "auto";

/**
 * CSS rect shorthand (like padding/margin).
 * - Single value: all sides
 * - 2 values: [vertical, horizontal]
 * - 3 values: [top, horizontal, bottom]
 * - 4 values: [top, right, bottom, left]
 */
export type CssRect<T> = T | [T, T] | [T, T, T] | [T, T, T, T];

// ── CSS enum literal types ──────────────────────────────────────────

/** CSS display property (grid excluded — next phase). */
export type CssDisplay = "flex" | "block" | "none";

/** CSS position property. */
export type CssPosition = "relative" | "absolute";

/** CSS box-sizing property. */
export type CssBoxSizing = "border-box" | "content-box";

/** CSS overflow property. */
export type CssOverflow = "visible" | "clip" | "hidden" | "scroll";

/** CSS flex-direction property. */
export type CssFlexDirection = "row" | "column" | "row-reverse" | "column-reverse";

/** CSS flex-wrap property. */
export type CssFlexWrap = "nowrap" | "wrap" | "wrap-reverse";

/** CSS align-items / align-self property. */
export type CssAlignItems =
  | "start"
  | "end"
  | "flex-start"
  | "flex-end"
  | "center"
  | "baseline"
  | "stretch";

/** CSS align-content property. */
export type CssAlignContent =
  | "start"
  | "end"
  | "flex-start"
  | "flex-end"
  | "center"
  | "stretch"
  | "space-between"
  | "space-evenly"
  | "space-around";

/** CSS justify-content property. */
export type CssJustifyContent =
  | "start"
  | "end"
  | "flex-start"
  | "flex-end"
  | "center"
  | "stretch"
  | "space-between"
  | "space-evenly"
  | "space-around";

// ── Box model props ─────────────────────────────────────────────────

/** Common box model properties shared by Grid (container) and Column (child). */
export interface BoxModelProps {
  /** Padding shorthand. */
  padding?: CssRect<CssLength>;
  /** Padding top. */
  paddingTop?: CssLength;
  /** Padding right. */
  paddingRight?: CssLength;
  /** Padding bottom. */
  paddingBottom?: CssLength;
  /** Padding left. */
  paddingLeft?: CssLength;
  /** Margin shorthand. */
  margin?: CssRect<CssLengthAuto>;
  /** Margin top. */
  marginTop?: CssLengthAuto;
  /** Margin right. */
  marginRight?: CssLengthAuto;
  /** Margin bottom. */
  marginBottom?: CssLengthAuto;
  /** Margin left. */
  marginLeft?: CssLengthAuto;
  /** Border width shorthand. */
  borderWidth?: CssRect<CssLength>;
  /** Border top width. */
  borderTopWidth?: CssLength;
  /** Border right width. */
  borderRightWidth?: CssLength;
  /** Border bottom width. */
  borderBottomWidth?: CssLength;
  /** Border left width. */
  borderLeftWidth?: CssLength;
  /** Box sizing model. @default "border-box" */
  boxSizing?: CssBoxSizing;
  /** Aspect ratio (width / height). */
  aspectRatio?: number;
}

// ── Cell coordinates & layout ──────────────────────────────────────────

/** Identifies a cell by row and column index. */
export interface CellCoord {
  row: number;
  col: number;
}

/** Computed layout rectangle for a single cell (from WASM). */
export interface CellLayout {
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
  contentAlign: "left" | "center" | "right";
}

// ── Render instructions ────────────────────────────────────────────────

/** A text cell instruction. */
export interface TextInstruction {
  type: "text";
  value: string;
  style?: Partial<TextStyle>;
}

/** A badge instruction. */
export interface BadgeInstruction {
  type: "badge";
  value: string;
  style?: Partial<BadgeStyle>;
}

/** Union of all render instruction types. */
export type RenderInstruction = TextInstruction | BadgeInstruction;

/** Styling for text cells. */
export interface TextStyle {
  color: string;
  fontWeight: string;
  fontSize: number;
}

/** Styling for badge cells. */
export interface BadgeStyle {
  color: string;
  backgroundColor: string;
  borderRadius: number;
}

// ── Theme ──────────────────────────────────────────────────────────────

/** Grid theme configuration. */
export interface Theme {
  headerBackground: string;
  headerColor: string;
  cellBackground: string;
  cellColor: string;
  borderColor: string;
  selectedBackground: string;
  fontFamily: string;
  fontSize: number;
  headerFontSize: number;
}

/** Default theme values. */
export const DEFAULT_THEME: Theme = {
  headerBackground: "#f5f5f5",
  headerColor: "#333",
  cellBackground: "#fff",
  cellColor: "#333",
  borderColor: "#e0e0e0",
  selectedBackground: "#e3f2fd",
  fontFamily: "system-ui, sans-serif",
  fontSize: 13,
  headerFontSize: 13,
};

// ── Column definition (object-based API) ──────────────────────────────

/** Object-based column definition (react-table style, flex child). */
export interface ColumnDef extends BoxModelProps {
  /** Unique column identifier. */
  id: string;
  /** Fixed width in pixels or CSS dimension. */
  width?: CssDimension;
  /** Minimum width. */
  minWidth?: CssDimension;
  /** Maximum width. */
  maxWidth?: CssDimension;
  /** Flex grow factor. */
  flexGrow?: number;
  /** Flex shrink factor. */
  flexShrink?: number;
  /** Flex basis. */
  flexBasis?: CssDimension;
  /** Height. */
  height?: CssDimension;
  /** Minimum height. */
  minHeight?: CssDimension;
  /** Maximum height. */
  maxHeight?: CssDimension;
  /** Align self (overrides container align-items). */
  alignSelf?: CssAlignItems;
  /** CSS position. */
  position?: CssPosition;
  /** Inset shorthand. */
  inset?: CssRect<CssLengthAuto>;
  /** Inset top. */
  insetTop?: CssLengthAuto;
  /** Inset right. */
  insetRight?: CssLengthAuto;
  /** Inset bottom. */
  insetBottom?: CssLengthAuto;
  /** Inset left. */
  insetLeft?: CssLengthAuto;
  /** Header text. */
  header?: string;
  /** Content alignment. */
  align?: "left" | "center" | "right";
  /** Whether the column is sortable. */
  sortable?: boolean;
  /** Editor type for inline editing. */
  editor?: "text" | "number" | "select";
  /** Render function: receives cell value, returns a render instruction. */
  render?: (value: unknown) => RenderInstruction;
}

// ── Column props (JSX API) ────────────────────────────────────────────

/** Props for the <Column> component (flex child). */
export interface ColumnProps extends BoxModelProps {
  /** Unique column identifier. */
  id: string;
  /** Fixed width in pixels or CSS dimension. */
  width?: CssDimension;
  /** Minimum width. */
  minWidth?: CssDimension;
  /** Maximum width. */
  maxWidth?: CssDimension;
  /** Flex grow factor. */
  flexGrow?: number;
  /** Flex shrink factor. */
  flexShrink?: number;
  /** Flex basis. */
  flexBasis?: CssDimension;
  /** Height. */
  height?: CssDimension;
  /** Minimum height. */
  minHeight?: CssDimension;
  /** Maximum height. */
  maxHeight?: CssDimension;
  /** Align self (overrides container align-items). */
  alignSelf?: CssAlignItems;
  /** CSS position. */
  position?: CssPosition;
  /** Inset shorthand (like margin shorthand). */
  inset?: CssRect<CssLengthAuto>;
  /** Inset top. */
  insetTop?: CssLengthAuto;
  /** Inset right. */
  insetRight?: CssLengthAuto;
  /** Inset bottom. */
  insetBottom?: CssLengthAuto;
  /** Inset left. */
  insetLeft?: CssLengthAuto;
  /** Header text. */
  header?: string;
  /** Content alignment. */
  align?: "left" | "center" | "right";
  /** Whether the column is sortable. */
  sortable?: boolean;
  /** Editor type for inline editing. */
  editor?: "text" | "number" | "select";
  /** Render function: receives cell value, returns a render instruction. */
  children?: (value: unknown) => RenderInstruction;
}

// ── Grid props ─────────────────────────────────────────────────────────

/** Props for the <Grid> component (flex container). */
export interface GridProps extends BoxModelProps {
  /** Row data as array of objects. */
  data: Record<string, unknown>[];
  /** Grid width in pixels. */
  width: number;
  /** Grid height in pixels. */
  height: number;
  /** Row height in pixels. @default 36 */
  rowHeight?: number;
  /** Header height in pixels. @default 40 */
  headerHeight?: number;
  /** Theme overrides. */
  theme?: Partial<Theme>;
  /** Object-based column definitions (react-table style). Takes precedence over children. */
  columns?: ColumnDef[];
  /** Children must be <Column> elements. Ignored when `columns` prop is provided. */
  children?: React.ReactNode;
  /** CSS display. @default "flex" */
  display?: CssDisplay;
  /** Flex direction. @default "row" */
  flexDirection?: CssFlexDirection;
  /** Flex wrap. @default "nowrap" */
  flexWrap?: CssFlexWrap;
  /** Gap between flex items (px or percentage). */
  gap?: CssLength;
  /** Row gap. */
  rowGap?: CssLength;
  /** Column gap. */
  columnGap?: CssLength;
  /** Align items on the cross axis. */
  alignItems?: CssAlignItems;
  /** Align content (multi-line). */
  alignContent?: CssAlignContent;
  /** Justify content on the main axis. */
  justifyContent?: CssJustifyContent;
  /** Overflow X. @default "visible" */
  overflowX?: CssOverflow;
  /** Overflow Y. @default "visible" */
  overflowY?: CssOverflow;
  /** Scrollbar width in pixels. @default 0 */
  scrollbarWidth?: number;
}

// ── WASM engine interface ──────────────────────────────────────────────

/** WASM TableEngine interface (matches wasm-bindgen exports). */
export interface WasmTableEngine {
  // Layout buffer (zero-copy pointer API)
  getLayoutBufferInfo(): Uint32Array;
  getLayoutCellCount(): number;

  // Column metadata
  setColumnarColumns(columns: unknown): void;
  getColumnFloat64Info(colIdx: number): Uint32Array;
  getColumnType(colIdx: number): number;
  getColumnarGeneration(): bigint;

  // TypedArray direct ingestion (no serde for numerics)
  initColumnar(colCount: number, rowCount: number): void;
  ingestFloat64Column(colIdx: number, values: Float64Array): void;
  ingestBoolColumn(colIdx: number, values: Float64Array): void;
  ingestStringColumn(colIdx: number, uniqueStrings: string[], ids: Uint32Array): void;
  finalizeColumnar(): void;

  // Hot path — single WASM call per frame
  updateViewportColumnar(
    scrollTop: number,
    viewport: unknown,
    columns: unknown,
    container?: unknown,
  ): Float64Array;
  setColumnarSort(configs: unknown): void;
  setColumnarScrollConfig(rowHeight: number, viewportHeight: number, overscan: number): void;
  getColumnarViewIndicesInfo(): Uint32Array;
}

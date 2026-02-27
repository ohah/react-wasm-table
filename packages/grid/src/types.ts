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

/** CSS display property. */
export type CssDisplay = "flex" | "grid" | "block" | "none";

/** CSS grid track size (e.g., `200`, `"1fr"`, `"auto"`, `"50%"`, `"minmax(100px, 1fr)"`). */
export type CssGridTrackSize =
  | number
  | `${number}fr`
  | `${number}%`
  | "auto"
  | "min-content"
  | "max-content"
  | `minmax(${string})`
  | `fit-content(${string})`;

/** CSS grid track list: single value, space-separated string, or array. */
export type CssGridTrackList =
  | CssGridTrackSize
  | string
  | (CssGridTrackSize | `repeat(${string})`)[];

/** CSS grid-auto-flow property. */
export type CssGridAutoFlow = "row" | "column" | "row dense" | "column dense";

/** CSS grid placement (e.g., `1`, `"span 2"`, `"auto"`). */
export type CssGridPlacement = number | `span ${number}` | "auto";

/** CSS grid line: single placement or [start, end] pair. */
export type CssGridLine = CssGridPlacement | [CssGridPlacement, CssGridPlacement];

/** CSS position property. */
export type CssPosition = "relative" | "absolute";

/** CSS box-sizing property. */
export type CssBoxSizing = "border-box" | "content-box";

/** CSS overflow property. */
export type CssOverflow = "visible" | "clip" | "hidden" | "scroll" | "auto";

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

/** A cell range defined by start (anchor) and end cells. */
export interface CellRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

/** A normalized (min/max) cell range for iteration. */
export interface NormalizedRange {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
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

// ── After-draw context ──────────────────────────────────────────────────

/** Context passed to onAfterDraw callback (Phase 3 Layer System entry point). */
export interface AfterDrawContext {
  /** Canvas 2D rendering context. */
  ctx: CanvasRenderingContext2D;
  /** Grid width in pixels. */
  width: number;
  /** Grid height in pixels. */
  height: number;
  /** Current vertical scroll offset. */
  scrollTop: number;
  /** Current horizontal scroll offset. */
  scrollLeft: number;
  /** Header row height in pixels. */
  headerHeight: number;
  /** Data row height in pixels. */
  rowHeight: number;
  /** Current column definitions (for position-aware overlays). */
  columns: ColumnProps[];
  /** First visible data row index (after virtual scroll). */
  visibleRowStart: number;
  /** Number of visible data rows in current viewport. */
  visibleRowCount: number;
  /** Total number of data rows. */
  dataRowCount: number;
}

// ── Selection style ─────────────────────────────────────────────────────

/** Selection highlight style. */
export interface SelectionStyle {
  /** Fill color (with alpha). @default theme.selectedBackground + "80" */
  background?: string;
  /** Border color. @default "#1976d2" */
  borderColor?: string;
  /** Border width in px. @default 2 */
  borderWidth?: number;
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

/** A flex container instruction (mini layout within a cell). */
export interface FlexInstruction {
  type: "flex";
  direction?: "row" | "column";
  gap?: number;
  align?: string;
  justify?: string;
  children: RenderInstruction[];
}

/** A stub instruction for not-yet-implemented components. */
export interface StubInstruction {
  type: "stub";
  component: string;
  props?: Record<string, unknown>;
}

/** Union of all render instruction types. */
export type RenderInstruction =
  | TextInstruction
  | BadgeInstruction
  | FlexInstruction
  | StubInstruction;

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
  borderColor: "#000",
  selectedBackground: "#e3f2fd",
  fontFamily: "system-ui, sans-serif",
  fontSize: 13,
  headerFontSize: 13,
};

// ── Column props (internal) ───────────────────────────────────────────

/** Props for the <Column> component (flex/grid child). */
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
  /** Grid row placement. */
  gridRow?: CssGridLine;
  /** Grid column placement. */
  gridColumn?: CssGridLine;
  /** Justify self (overrides container justify-items). */
  justifySelf?: CssAlignItems;
  /** Header text. */
  header?: string;
  /** Content alignment. */
  align?: "left" | "center" | "right";
  /** Whether the column is sortable. */
  sortable?: boolean;
  /** Whether selection can start from this column. @default true */
  selectable?: boolean;
  /** Editor type for inline editing. */
  editor?: "text" | "number" | "select";
  /** Render function: receives cell value, returns a render instruction. */
  children?: (value: unknown) => RenderInstruction;
}

// ── Grid props ─────────────────────────────────────────────────────────

/** Props for the <Grid> component (flex/grid container). */
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
  /** Column definitions (TanStack-compatible). Takes precedence over children. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns?: import("./tanstack-types").GridColumnDef<any, any>[];
  /** Children must be <Column> elements. Ignored when `columns` prop is provided. */
  children?: React.ReactNode;

  // TanStack-compatible state management
  /** Controlled sorting state (TanStack-compatible). */
  sorting?: import("./tanstack-types").SortingState;
  /** Callback when sorting changes (controlled mode). */
  onSortingChange?: (sorting: import("./tanstack-types").SortingState) => void;

  // Selection state management (controlled/uncontrolled)
  /** Controlled selection state. undefined = uncontrolled, null = no selection. */
  selection?: NormalizedRange | null;
  /** Callback when selection changes (controlled mode). */
  onSelectionChange?: (selection: NormalizedRange | null) => void;
  /** Selection highlight style overrides. */
  selectionStyle?: SelectionStyle;
  /** Called after building TSV for copy. Return string to override clipboard content. */
  onCopy?: (tsv: string, range: NormalizedRange) => string | void;
  /** Paste handler stub. Called on Ctrl/Cmd+V with clipboard text and target cell. */
  onPaste?: (text: string, target: CellCoord) => void;

  // Event callbacks (Step 0-3)
  /** Called on cell click. Return `false` to skip editor cancel. */
  onCellClick?: (coord: CellCoord) => void | false;
  /** Called on cell double-click. Return `false` to skip editing. */
  onCellDoubleClick?: (coord: CellCoord) => void | false;
  /** Called on header click. Return `false` to skip sorting. */
  onHeaderClick?: (colIndex: number) => void | false;
  /** Called on key down. Return `false` to skip default handling. */
  onKeyDown?: (event: KeyboardEvent) => void | false;
  /** Called before sorting changes. Return `false` to cancel sort. */
  onBeforeSortChange?: (next: import("./tanstack-types").SortingState) => boolean | void;
  /** Called before selection changes. Return `false` to cancel selection. */
  onBeforeSelectionChange?: (next: NormalizedRange | null) => boolean | void;

  /** Enable cell selection. @default true */
  enableSelection?: boolean;
  /** Initial state for uncontrolled mode. */
  initialState?: {
    sorting?: import("./tanstack-types").SortingState;
    selection?: NormalizedRange | null;
  };
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
  /** Grid template rows (e.g., `"1fr 1fr"`, `["200px", "1fr"]`). */
  gridTemplateRows?: CssGridTrackList;
  /** Grid template columns (e.g., `"1fr 1fr 1fr"`, `[200, "1fr", "1fr"]`). */
  gridTemplateColumns?: CssGridTrackList;
  /** Grid auto rows (e.g., `"1fr"`, `[100, "auto"]`). */
  gridAutoRows?: CssGridTrackSize | CssGridTrackSize[];
  /** Grid auto columns. */
  gridAutoColumns?: CssGridTrackSize | CssGridTrackSize[];
  /** Grid auto flow. @default "row" */
  gridAutoFlow?: CssGridAutoFlow;
  /** Justify items on the inline axis. */
  justifyItems?: CssAlignItems;
  /** Called after each frame draw (viewport space). Phase 3 Layer System entry point. */
  onAfterDraw?: (ctx: AfterDrawContext) => void;

  // Adapter DI (Step 0-5) — optional external manager injection
  /** Optional external EventManager instance. */
  eventManager?: import("./adapter/event-manager").EventManager;
  /** Optional external SelectionManager instance. */
  selectionManager?: import("./adapter/selection-manager").SelectionManager;
  /** Optional external EditorManager instance. */
  editorManager?: import("./adapter/editor-manager").EditorManager;

  /** Ref callback to receive the WASM engine instance (e.g., for debug logging). */
  engineRef?: React.RefObject<WasmTableEngine | null>;
}

// ── WASM engine interface ──────────────────────────────────────────────

/** WASM TableEngine interface (matches wasm-bindgen exports). */
export interface WasmTableEngine {
  // Layout buffer (zero-copy pointer API)
  getLayoutBufferInfo(): Uint32Array;
  getColumnFloat64Info(colIdx: number): Uint32Array;

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

  // Debug logging (only available when WASM built with debug-log feature)
  enableDebugLog?(): void;
  disableDebugLog?(): void;
}

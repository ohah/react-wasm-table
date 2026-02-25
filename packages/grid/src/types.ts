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

/** Object-based column definition (react-table style). */
export interface ColumnDef {
  /** Unique column identifier. */
  id: string;
  /** Fixed width in pixels. */
  width?: number;
  /** Minimum width in pixels. */
  minWidth?: number;
  /** Maximum width in pixels. */
  maxWidth?: number;
  /** Flex grow factor. */
  flexGrow?: number;
  /** Flex shrink factor. */
  flexShrink?: number;
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

/** Props for the <Column> component. */
export interface ColumnProps {
  /** Unique column identifier. */
  id: string;
  /** Fixed width in pixels. */
  width?: number;
  /** Minimum width in pixels. */
  minWidth?: number;
  /** Maximum width in pixels. */
  maxWidth?: number;
  /** Flex grow factor. */
  flexGrow?: number;
  /** Flex shrink factor. */
  flexShrink?: number;
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

/** Props for the <Grid> component. */
export interface GridProps {
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
  updateViewportColumnar(scrollTop: number, viewport: unknown, columns: unknown): Float64Array;
  setColumnarSort(configs: unknown): void;
  setColumnarScrollConfig(rowHeight: number, viewportHeight: number, overscan: number): void;
  getColumnarViewIndicesInfo(): Uint32Array;
}

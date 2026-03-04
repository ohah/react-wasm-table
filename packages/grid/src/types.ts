import type { ReactNode, ChangeEvent, FocusEvent, KeyboardEvent } from "react";
import type { GridInstance } from "./grid-instance";

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

// ── Border style types ──────────────────────────────────────────────

/** CSS border-style values supported by the grid. */
export type CssBorderStyle = "solid" | "none";

/** A single border side configuration. */
export interface CellBorderSide {
  /** Border width in pixels. 0 = no border. */
  width: number;
  /** Border style. */
  style: CssBorderStyle;
  /** Border color (CSS color string). */
  color: string;
}

/** Per-cell border configuration (each side optional). */
export interface CellBorderConfig {
  top?: CellBorderSide;
  right?: CellBorderSide;
  bottom?: CellBorderSide;
  left?: CellBorderSide;
}

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
  /** Border color (CSS color string, overrides theme.borderColor for this element). */
  borderColor?: string;
  /** Border style. @default "solid" */
  borderStyle?: CssBorderStyle;
}

// ── Grid event types ───────────────────────────────────────────────────

/** Base for all grid events — supports preventDefault(). */
export interface GridEventBase {
  preventDefault(): void;
  defaultPrevented: boolean;
}

/** Mouse event enriched with content-space and viewport coordinates. */
export interface GridMouseEvent extends GridEventBase {
  nativeEvent: MouseEvent;
  /** Content-space X (accounts for scrollLeft). */
  contentX: number;
  /** Content-space Y. */
  contentY: number;
  /** Viewport X (from canvas left edge). */
  viewportX: number;
  /** Viewport Y (from canvas top edge). */
  viewportY: number;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

/** Mouse event on a data cell. */
export interface GridCellEvent extends GridMouseEvent {
  cell: CellCoord;
}

/** Mouse event on a header. */
export interface GridHeaderEvent extends GridMouseEvent {
  colIndex: number;
}

/** Keyboard event enriched with key info. */
export interface GridKeyboardEvent extends GridEventBase {
  nativeEvent: KeyboardEvent;
  key: string;
  code: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

/** Scroll event with normalized deltas. */
export interface GridScrollEvent extends GridEventBase {
  deltaY: number;
  deltaX: number;
  /** null for touch-scroll. */
  nativeEvent: WheelEvent | null;
}

/** Hit-test result describing what lies under a point. */
export interface HitTestResult {
  type: "cell" | "header" | "resize-handle" | "empty";
  cell?: CellCoord;
  colIndex?: number;
}

/** Low-level canvas mouse event types. */
export type GridCanvasEventType = "click" | "dblclick" | "mousedown" | "mousemove" | "mouseup";

/** Low-level catch-all canvas event (fires before semantic handlers). */
export interface GridCanvasEvent extends GridMouseEvent {
  type: GridCanvasEventType;
  hitTest: HitTestResult;
}

/** Right-click context menu event with hit-test result (cell, header, or empty). */
export interface GridContextMenuEvent extends GridMouseEvent {
  hitTest: HitTestResult;
  /** Present when Grid received a `table` prop (useGridTable result). Use for getRow(), getValue(), etc. */
  table?: GridInstance;
}

/**
 * HTMLElement-like event handlers for canvas components.
 * Attach these to any canvas component (Text, Link, Chip, etc.) to receive
 * per-component events without relying on Grid-level callbacks.
 */
export interface CanvasEventHandlers {
  onClick?: (event: GridCellEvent) => void;
  onDoubleClick?: (event: GridCellEvent) => void;
  onMouseDown?: (event: GridCellEvent) => void;
  onMouseUp?: (event: GridCellEvent) => void;
  onMouseEnter?: (event: GridCellEvent) => void;
  onMouseLeave?: (event: GridCellEvent) => void;
  /** Fires on touchstart when this component's cell is touched. */
  onTouchStart?: (event: GridCellEvent) => void;
  /** Fires on touchend when this component's cell is tapped. */
  onTouchEnd?: (event: GridCellEvent) => void;
}

/** Touch event types exposed to users. */
export type GridTouchEventType = "touchstart" | "touchmove" | "touchend";

/** Touch point with content-space and viewport coordinates. */
export interface GridTouchPoint {
  /** Content-space X (accounts for scrollLeft). */
  contentX: number;
  /** Content-space Y. */
  contentY: number;
  /** Viewport X (from canvas left edge). */
  viewportX: number;
  /** Viewport Y (from canvas top edge). */
  viewportY: number;
}

/** Touch event enriched with content-space coordinates and hit-test. */
export interface GridTouchEvent extends GridEventBase {
  nativeEvent: TouchEvent;
  type: GridTouchEventType;
  /** Primary touch point in content/viewport coords. */
  touch: GridTouchPoint;
  /** Hit-test result at the touch point. */
  hitTest: HitTestResult;
  /** Number of active touches. */
  touchCount: number;
}

// ── Cell coordinates & layout ──────────────────────────────────────────

/** Check whether a unified row index refers to a header row. */
export function isHeaderRow(row: number, headerRowCount: number): boolean {
  return row < headerRowCount;
}

/** Convert a unified row index to a 0-based data row index. */
export function toDataRow(row: number, headerRowCount: number): number {
  return row - headerRowCount;
}

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

/** Props passed to custom editCell render functions. */
export interface CellEditRenderProps {
  value: unknown;
  onCommit: (newValue: unknown) => void;
  onCancel: () => void;
  onCommitAndNavigate: (newValue: unknown, direction: "next" | "prev") => void;
  layout: CellLayout;
  initialChar: string | null;
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

/** Styling for sparkline (inline mini chart). */
export interface SparklineStyle {
  color: string;
  strokeWidth: number;
  /** "line" = stroke only, "area" = fill under line. @default "line" */
  variant: "line" | "area";
}

/** A sparkline instruction: draws a small line chart from a data array. */
export interface SparklineInstruction {
  type: "sparkline";
  /** Data points (y-values); x is evenly spaced. */
  data: number[];
  style?: Partial<SparklineStyle>;
}

/** Flex container style (Taffy-compatible). Same surface as container layout. */
export interface FlexContainerStyle {
  /** Flex direction. @default "row" */
  flexDirection?: CssFlexDirection;
  /** Flex wrap. @default "nowrap" */
  flexWrap?: CssFlexWrap;
  /** Gap between items (all sides). */
  gap?: CssDimension;
  /** Row gap (flex direction column) or vertical gap. */
  rowGap?: CssDimension;
  /** Column gap (flex direction row) or horizontal gap. */
  columnGap?: CssDimension;
  /** Cross-axis alignment. */
  alignItems?: CssAlignItems;
  /** Alignment of lines in multi-line flex. */
  alignContent?: CssAlignContent;
  /** Main-axis alignment. */
  justifyContent?: CssJustifyContent;
  /** Padding shorthand. */
  padding?: CssRect<CssLength>;
  /** Margin shorthand. */
  margin?: CssRect<CssLengthAuto>;
  /** Border width shorthand. */
  borderWidth?: CssRect<CssLength>;
  /** Box sizing. */
  boxSizing?: CssBoxSizing;
  /** Overflow. */
  overflow?: CssOverflow;
}

/** A flex container instruction (mini layout within a cell). */
export interface FlexInstruction extends FlexContainerStyle {
  type: "flex";
  /** Resolved child instructions. */
  children: RenderInstruction[];
}

/** Box model style for Box instruction (padding, margin, border; no layout). */
export interface BoxModelStyle {
  padding?: CssRect<CssLength>;
  margin?: CssRect<CssLengthAuto>;
  borderWidth?: CssRect<CssLength>;
  borderColor?: string;
  backgroundColor?: string;
  boxSizing?: CssBoxSizing;
}

/** A box container instruction: draws background/border and content area for children. */
export interface BoxInstruction extends BoxModelStyle {
  type: "box";
  /** Resolved child instructions (drawn in content rect, vertical stack). */
  children: RenderInstruction[];
}

/** Stack direction: row = horizontal, column = vertical. */
export type StackDirection = "row" | "column";

/** A stack container instruction: lays out children in a row or column with optional gap. */
export interface StackInstruction {
  type: "stack";
  /** @default "row" */
  direction?: StackDirection;
  /** Gap between children in px. @default 4 */
  gap?: number;
  /** Resolved child instructions. */
  children: RenderInstruction[];
}

/** A stub instruction for not-yet-implemented components. */
export interface StubInstruction {
  type: "stub";
  component: string;
  props?: Record<string, unknown>;
}

/** Optional event handlers attached to any instruction at runtime. */
interface InstructionEventMixin {
  _handlers?: CanvasEventHandlers;
}

/** Union of all render instruction types. Each member may carry `_handlers`. */
export type RenderInstruction =
  | (TextInstruction & InstructionEventMixin)
  | (BadgeInstruction & InstructionEventMixin)
  | (SparklineInstruction & InstructionEventMixin)
  | (FlexInstruction & InstructionEventMixin)
  | (BoxInstruction & InstructionEventMixin)
  | (StackInstruction & InstructionEventMixin)
  | (ColorInstruction & InstructionEventMixin)
  | (TagInstruction & InstructionEventMixin)
  | (ProgressBarInstruction & InstructionEventMixin)
  | (RatingInstruction & InstructionEventMixin)
  | (ChipInstruction & InstructionEventMixin)
  | (LinkInstruction & InstructionEventMixin)
  | (ImageInstruction & InstructionEventMixin)
  | (SwitchInstruction & InstructionEventMixin)
  | (CheckboxInstruction & InstructionEventMixin)
  | (RadioInstruction & InstructionEventMixin)
  | (InputInstruction & InstructionEventMixin)
  | (StubInstruction & InstructionEventMixin);

/** Table cell content: ReactNode or RenderInstruction. Use for Td children so flexRender return type is valid. */
export type TableCellContent = ReactNode | RenderInstruction;

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

/** Styling for color swatch cells. */
export interface ColorStyle {
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
}

/** A color swatch instruction. */
export interface ColorInstruction {
  type: "color";
  value: string;
  style?: Partial<ColorStyle>;
}

/** Styling for tag cells. */
export interface TagStyle {
  color: string;
  borderColor: string;
  borderRadius: number;
  fontSize: number;
}

/** A tag instruction. */
export interface TagInstruction {
  type: "tag";
  value: string;
  style?: Partial<TagStyle>;
}

/** Styling for progress bar cells. */
export interface ProgressBarStyle {
  color: string;
  backgroundColor: string;
  borderRadius: number;
  height: number;
  showLabel: boolean;
  labelColor: string;
  labelFontSize: number;
}

/** A progress bar instruction. */
export interface ProgressBarInstruction {
  type: "progressbar";
  value: number;
  max?: number;
  style?: Partial<ProgressBarStyle>;
}

/** Styling for rating cells. */
export interface RatingStyle {
  max: number;
  color: string;
  emptyColor: string;
  size: number;
}

/** A rating instruction. */
export interface RatingInstruction {
  type: "rating";
  value: number;
  style?: Partial<RatingStyle>;
}

/** Styling for chip cells. */
export interface ChipStyle {
  color: string;
  backgroundColor: string;
  borderRadius: number;
  closable: boolean;
}

/** A chip instruction. */
export interface ChipInstruction {
  type: "chip";
  value: string;
  style?: Partial<ChipStyle>;
}

/** Styling for link cells. */
export interface LinkStyle {
  color: string;
  fontSize: number;
  underline: boolean;
}

/** A link instruction. */
export interface LinkInstruction {
  type: "link";
  value: string;
  href?: string;
  style?: Partial<LinkStyle>;
}

/** Styling for switch (toggle) cells. */
export interface SwitchStyle {
  /** Unchecked track color. @default "#d1d5db" */
  trackColor: string;
  /** Checked track color. @default "#3b82f6" */
  activeTrackColor: string;
  /** Thumb (knob) color. @default "#fff" */
  thumbColor: string;
  /** Track width in px. @default 36 */
  width: number;
  /** Track height in px. @default 20 */
  height: number;
  /** Transition duration in ms. @default 150 */
  transitionDuration: number;
  /** CSS timing function. @default "ease" */
  transitionTimingFunction: "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out";
}

/** A switch (toggle) instruction. */
export interface SwitchInstruction {
  type: "switch";
  checked: boolean;
  disabled?: boolean;
  style?: Partial<SwitchStyle>;
}

/** A checkbox instruction (headless container — children provide visuals). */
export interface CheckboxInstruction {
  type: "checkbox";
  checked: boolean;
  disabled?: boolean;
  children: RenderInstruction[];
}

/** A radio button instruction (headless container — children provide visuals). */
export interface RadioInstruction {
  type: "radio";
  checked: boolean;
  disabled?: boolean;
  children: RenderInstruction[];
}

/** Styling for input cells. */
export interface InputStyle {
  /** Font size in px. @default 13 */
  fontSize: number;
  /** Font family. @default "system-ui, sans-serif" */
  fontFamily: string;
  /** Text color. @default "#333" */
  color: string;
  /** Background color. @default "#fff" */
  backgroundColor: string;
  /** Border color. @default "#d1d5db" */
  borderColor: string;
  /** Border width in px. @default 1 */
  borderWidth: number;
  /** Border radius in px. @default 4 */
  borderRadius: number;
}

/** An input instruction (DOM overlay). */
export interface InputInstruction {
  type: "input";
  /** HTML input type attribute. @default "text" */
  inputType?: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  style?: Partial<InputStyle>;
  _domHandlers?: {
    onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
    onFocus?: (e: FocusEvent<HTMLInputElement>) => void;
    onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
    onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  };
}

/** Descriptor for a DOM overlay element positioned by Taffy layout. */
export interface DomOverlayDescriptor {
  /** Unique key for React reconciliation (e.g., "row:col"). */
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  instruction: InputInstruction;
}

/** CSS object-fit values for image rendering. */
export type CssObjectFit = "contain" | "cover" | "fill" | "none" | "scale-down";

/** Styling for image cells. */
export interface ImageStyle {
  /** How the image fits within its content box. @default "fill" */
  objectFit: CssObjectFit;
  /** Border radius in pixels. @default 0 */
  borderRadius: number;
  /** Opacity (0–1). @default 1 */
  opacity: number;
}

/** Referrer policy values for image fetch. */
export type ReferrerPolicy =
  | "no-referrer"
  | "no-referrer-when-downgrade"
  | "origin"
  | "origin-when-cross-origin"
  | "same-origin"
  | "strict-origin"
  | "strict-origin-when-cross-origin"
  | "unsafe-url";

/** An image instruction. */
export interface ImageInstruction {
  type: "image";
  /** Image URL (required). */
  src: string;
  /** Alt text rendered on load error. */
  alt?: string;
  /** Explicit render width in px. */
  width?: number;
  /** Explicit render height in px. */
  height?: number;
  /** CORS setting. */
  crossOrigin?: "anonymous" | "use-credentials";
  /** Referrer policy for the image fetch. */
  referrerPolicy?: ReferrerPolicy;
  /** Decoding hint. @default "auto" */
  decoding?: "sync" | "async" | "auto";
  /** Fetch priority hint. */
  fetchPriority?: "high" | "low" | "auto";
  style?: Partial<ImageStyle>;
}

// ── Theme ──────────────────────────────────────────────────────────────

/** Grid theme configuration. */
export interface Theme {
  headerBackground: string;
  headerColor: string;
  cellBackground: string;
  cellColor: string;
  borderColor: string;
  /** Default grid line width in pixels. @default 0 */
  borderWidth: number;
  /** Default grid line style. @default "none" */
  borderStyle: CssBorderStyle;
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
  borderWidth: 0,
  borderStyle: "none",
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
  /** Custom editor render function. Takes precedence over `editor` when both are set. */
  editCell?: (props: CellEditRenderProps) => React.ReactNode;
  /** Editor options (e.g. dropdown options for select editor). */
  editorOptions?: Record<string, unknown>;
  /** Original TanStack cell definition (string or function). Resolved with real row data in render loop. */
  cellDef?: string | ((info: any) => unknown);
  /** Reference to the original column definition (for CellContext.column.columnDef). */
  columnDefRef?: any;
}

// ── Table meta ─────────────────────────────────────────────────────────

/** TanStack-compatible meta object passed to Grid for custom callbacks. */
export interface TableMeta {
  updateData?: (rowIndex: number, columnId: string, value: unknown) => void;
  [key: string]: unknown;
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
  onSortingChange?: (updater: import("./tanstack-types").SortingUpdater) => void;
  /** Controlled column filters state. */
  columnFilters?: import("./tanstack-types").ColumnFiltersState;
  /** Callback when column filters change (controlled mode). */
  onColumnFiltersChange?: (updater: import("./tanstack-types").ColumnFiltersUpdater) => void;
  /** Controlled global filter string. */
  globalFilter?: string;
  /** Callback when global filter changes (controlled mode). */
  onGlobalFilterChange?: (value: string) => void;
  /** Controlled column order state (array of column IDs). */
  columnOrder?: import("./tanstack-types").ColumnOrderState;
  /** Callback when column order changes (controlled mode). */
  onColumnOrderChange?: (updater: import("./tanstack-types").ColumnOrderUpdater) => void;
  /** Controlled column visibility state. */
  columnVisibility?: import("./tanstack-types").ColumnVisibilityState;
  /** Callback when column visibility changes (controlled mode). */
  onColumnVisibilityChange?: (updater: import("./tanstack-types").ColumnVisibilityUpdater) => void;
  /** Controlled column sizing state (overridden widths). */
  columnSizing?: import("./tanstack-types").ColumnSizingState;
  /** Callback when column sizing changes (controlled mode). */
  onColumnSizingChange?: (updater: import("./tanstack-types").ColumnSizingUpdater) => void;
  /** Controlled column pinning state. */
  columnPinning?: import("./tanstack-types").ColumnPinningState;
  /** Callback when column pinning changes (controlled mode). */
  onColumnPinningChange?: (updater: import("./tanstack-types").ColumnPinningUpdater) => void;
  /** Enable header drag to reorder columns. Uses columnOrder + onColumnOrderChange. */
  enableColumnDnD?: boolean;
  /** Row pinning state (top/bottom row IDs). Requires getRowId when using row IDs. */
  rowPinning?: import("./tanstack-types").RowPinningState;
  /** Callback when row pinning changes (controlled mode). */
  onRowPinningChange?: (updater: import("./tanstack-types").RowPinningUpdater) => void;
  /** Get unique row ID for row pinning. Default: (_, i) => String(i) */
  getRowId?: (row: Record<string, unknown>, index: number) => string;
  /** TanStack-compatible meta object. Use meta.updateData to commit cell edits. */
  meta?: TableMeta;
  /** When to open the cell editor: "click" (single) or "dblclick" (double). @default "dblclick" */
  editTrigger?: "click" | "dblclick";

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

  // Event callbacks (enriched events — use event.preventDefault() to skip defaults)
  /** Called on cell click. Call event.preventDefault() to skip editor cancel. */
  onCellClick?: (event: GridCellEvent) => void;
  /** Called on cell double-click. Call event.preventDefault() to skip editing. */
  onCellDoubleClick?: (event: GridCellEvent) => void;
  /** Called on header click. Call event.preventDefault() to skip sorting. */
  onHeaderClick?: (event: GridHeaderEvent) => void;
  /** Called on key down. Call event.preventDefault() to skip default handling. */
  onKeyDown?: (event: GridKeyboardEvent) => void;

  // NEW: expose internal events
  /** Called on cell mousedown. */
  onCellMouseDown?: (event: GridCellEvent) => void;
  /** Called on cell mousemove during drag. */
  onCellMouseMove?: (event: GridCellEvent) => void;
  /** Called on mouseup after cell drag. */
  onCellMouseUp?: () => void;
  /** Called on scroll (wheel or touch). */
  onScroll?: (event: GridScrollEvent) => void;
  /** Low-level canvas event — fires for all mouse events before semantic handlers. */
  onCanvasEvent?: (event: GridCanvasEvent) => void;
  /** Called on right-click. Receives hit-test result (cell, header, resize-handle, or empty). Use to show context menu. */
  onContextMenu?: (event: GridContextMenuEvent) => void;

  // Touch events (native TouchEvent access)
  /** Called on touchstart. Call event.preventDefault() to cancel internal handling. */
  onTouchStart?: (event: GridTouchEvent) => void;
  /** Called on touchmove. Call event.preventDefault() to cancel internal handling. */
  onTouchMove?: (event: GridTouchEvent) => void;
  /** Called on touchend. Call event.preventDefault() to cancel internal handling. */
  onTouchEnd?: (event: GridTouchEvent) => void;

  /** Event middleware chain — intercept/transform events before default handling. */
  eventMiddleware?: import("./event-middleware").EventMiddleware[];

  /** Custom cell renderers merged with built-ins. Same type → override. */
  cellRenderers?: import("./renderer/components").CellRenderer<any>[];

  /** Custom layer stack. Replaces default draw pipeline when provided. */
  layers?: import("./renderer/layer").GridLayer[];

  /** Called before sorting changes. Return `false` to cancel sort. */
  onBeforeSortChange?: (next: import("./tanstack-types").SortingState) => boolean | void;
  /** Called before selection changes. Return `false` to cancel selection. */
  onBeforeSelectionChange?: (next: NormalizedRange | null) => boolean | void;

  /** Enable cell selection. @default true */
  enableSelection?: boolean;
  /** Initial state for uncontrolled mode. */
  initialState?: {
    sorting?: import("./tanstack-types").SortingState;
    columnFilters?: import("./tanstack-types").ColumnFiltersState;
    globalFilter?: string;
    columnOrder?: import("./tanstack-types").ColumnOrderState;
    columnVisibility?: import("./tanstack-types").ColumnVisibilityState;
    columnSizing?: import("./tanstack-types").ColumnSizingState;
    columnPinning?: import("./tanstack-types").ColumnPinningState;
    rowPinning?: import("./tanstack-types").RowPinningState;
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

  // Streaming (infinite scroll)
  /** Total row count. When set, enables streaming mode (scrollbar reflects totalCount, not data.length). */
  totalCount?: number;
  /** Called when the viewport approaches unloaded rows. Append new rows via setData(prev => [...prev, ...newRows]). */
  onFetchMore?: (startIndex: number, count: number) => void;
  /** Number of rows to fetch ahead of the visible area. @default 100 */
  fetchAhead?: number;

  /** Pagination state (pageIndex + pageSize). When set, WASM slices view_indices per page. */
  pagination?: import("./tanstack-types").PaginationState;

  /** Mutable ref to receive WASM-computed view indices (for GridInstance row model). */
  viewIndicesRef?: { current: Uint32Array | number[] | null };

  /** Grid instance from useGridTable. When provided, passed to onContextMenu event so callbacks can use table.getRow(), getValue(), etc. */
  table?: GridInstance;

  /** Ref callback to receive the WASM engine instance (e.g., for debug logging). */
  engineRef?: React.RefObject<WasmTableEngine | null>;

  /** Parsed body content from Table children (Td JSX → RenderInstruction map). @internal */
  _parsedBodyContent?: Map<string, RenderInstruction>;
  /** Parsed border styles from Table children (keyed by "rowId:columnId"). @internal */
  _parsedBorderStyles?: Map<string, import("./react/table-components").CellBorderStyleProps>;
  /** Callback to notify Table of visible row range changes from render loop. @internal */
  _onVisibleRangeChange?: (visStart: number, visibleRowCount: number) => void;
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

  // Streaming append (Phase 2) — incremental data ingestion
  beginAppendColumnar?(newRowCount: number): void;
  appendFloat64Column?(colIdx: number, offset: number, values: Float64Array): void;
  appendBoolColumn?(colIdx: number, offset: number, values: Float64Array): void;
  appendStringColumn?(
    colIdx: number,
    offset: number,
    uniqueStrings: string[],
    ids: Uint32Array,
  ): void;
  finalizeAppendColumnar?(): void;

  // Hot path — single WASM call per frame
  rebuildView?: () => void;
  updateViewportColumnar(
    scrollTop: number,
    viewport: unknown,
    columns: unknown,
    container?: unknown,
    pinnedTop?: number,
    pinnedBottom?: number,
    skipRebuild?: boolean,
  ): Float64Array;
  setColumnarSort(configs: unknown): void;
  setColumnarFilters(filters: unknown): void;
  setGlobalFilter(query: string | null): void;
  setColumnarScrollConfig(rowHeight: number, viewportHeight: number, overscan: number): void;
  setPagination(pageIndex: number | undefined, pageSize: number | undefined): void;
  getColumnarViewIndicesInfo(): Uint32Array;

  // Layout cache
  invalidateLayout(): void;

  // Composite (in-cell) layout
  computeCompositeLayout(input: Float32Array): Float32Array;

  // Debug logging (only available when WASM built with debug-log feature)
  enableDebugLog?(): void;
  disableDebugLog?(): void;
}

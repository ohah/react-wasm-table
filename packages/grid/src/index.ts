// React components
export { Grid } from "./react/Grid";
export { Table } from "./react/Table";
export type { TableProps } from "./react/Table";
export { Column } from "./react/Column";
export { ScrollBar } from "./react/ScrollBar";
export type { ScrollBarProps } from "./react/ScrollBar";

// Table structural components (TanStack-compatible)
export { Thead, Tbody, Tfoot, Tr, Th, Td } from "./react/table-components";
export type {
  TheadProps,
  TbodyProps,
  TfootProps,
  TrProps,
  ThProps,
  TdProps,
} from "./react/table-components";

// Canvas JSX components
export type {
  TextProps,
  BadgeProps,
  SparklineProps,
  FlexProps,
  BoxProps,
  StackProps,
  StubProps,
} from "./components";
export {
  Text,
  Badge,
  Flex,
  Box,
  Stack,
  ProgressBar,
  Sparkline,
  Rating,
  Icon,
  Image,
  Avatar,
  Tag,
  Chip,
  Link,
  Color,
  Input,
  NumberInput,
  Select,
  Checkbox,
  Switch,
  DatePicker,
  Dropdown,
} from "./components";

// Resolve instruction + flexRender
export { resolveInstruction } from "./resolve-instruction";
export { flexRender } from "./flex-render";

// Column helper (TanStack-compatible API)
export { createColumnHelper } from "./column-helper";
export type { ColumnHelper } from "./column-helper";
export { resolveColumns, getLeafColumns, computePinningInfo } from "./resolve-columns";
export type { PinningInfo } from "./resolve-columns";
export type {
  GridColumnDef,
  AccessorKeyColumnDef,
  AccessorFnColumnDef,
  DisplayColumnDef,
  GroupColumnDef,
  ColumnDefBase,
  CellContext,
  HeaderContext,
  SortingState,
  ColumnSort,
  SortingUpdater,
  FilterOp,
  ColumnFilter,
  ColumnFiltersState,
  ColumnFiltersUpdater,
  ColumnOrderState,
  ColumnOrderUpdater,
  ColumnVisibilityState,
  ColumnVisibilityUpdater,
  ColumnSizingState,
  ColumnSizingUpdater,
  ColumnSizingInfoState,
  ColumnSizingInfoUpdater,
  ColumnPinningState,
  ColumnPinningUpdater,
  ColumnPinningPosition,
  RowPinningState,
  RowPinningUpdater,
  ExpandedState,
  ExpandedUpdater,
} from "./tanstack-types";

// Header grouping (multi-level headers)
export { buildHeaderGroups } from "./build-header-groups";

// Grid instance + useGridTable (TanStack-compatible)
export { useGridTable } from "./use-grid-table";
export type { UseGridTableOptions } from "./use-grid-table";
export { useReactTable } from "./use-react-table";
export type { UseReactTableOptions } from "./use-react-table";
export { buildGridInstance } from "./grid-instance";
export type {
  GridInstance,
  GridColumn,
  GridHeader,
  GridHeaderGroup,
  GridState,
  BuildOptions,
  ViewIndicesRef,
  // TanStack-compatible aliases
  TableInstance,
  TableColumn,
  TableHeader,
  TableHeaderGroup,
  TableState,
} from "./grid-instance";

// Cell type
export type { Cell } from "./cell";
export { buildCell } from "./cell";

// Row model
export {
  buildRow,
  buildRowModel,
  buildVirtualRowModel,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  buildExpandedRowModel,
} from "./row-model";
export type { Row, RowModel, RowModelFactory, VisibleRange } from "./row-model";

// Parse table children
export { parseTableChildren } from "./react/parse-table-children";
export type { ParsedTableStructure, ParsedRow, ParsedCell } from "./react/parse-table-children";

// Hooks
export { useGrid, useColumnRegistry } from "./react/hooks";

// Contexts
export { GridContext } from "./react/context";
export type { GridContextValue } from "./react/context";

// Adapter
export { ColumnRegistry } from "./adapter/column-registry";
export { EventManager } from "./adapter/event-manager";
export type { GridEventHandlers, ScrollNormalization, EventCoords } from "./adapter/event-manager";

// Event factory helpers
export {
  createGridCellEvent,
  createGridHeaderEvent,
  createGridKeyboardEvent,
  createGridScrollEvent,
  createGridCanvasEvent,
  createGridContextMenuEvent,
  createGridTouchEvent,
} from "./event-helpers";
export type { ContentCoords } from "./event-helpers";
export { EditorManager } from "./adapter/editor-manager";
export { SelectionManager, buildTSV } from "./adapter/selection-manager";

// Data export utilities
export { exportToCSV, exportToTSV, exportToJSON } from "./export";
export type { ExportOptions } from "./export";

// Clipboard utilities (copy/paste format + onCopy/onPaste wiring)
export {
  copyToClipboard,
  parseClipboardText,
  pasteFromClipboard,
  buildCSV,
  buildHTML,
} from "./clipboard";
export type { CopyToClipboardOptions, PasteFromClipboardResult } from "./clipboard";

// Event middleware
export { composeMiddleware } from "./event-middleware";
export type { EventChannel, GridEvent, NextFn, EventMiddleware } from "./event-middleware";

// Renderer
export { CanvasRenderer } from "./renderer/canvas";
export {
  drawTextCellFromBuffer,
  drawBadgeFromBuffer,
  drawSparklineFromBuffer,
  measureText,
} from "./renderer/draw-primitives";

// Layout reader helpers (for custom cell renderers)
export {
  readCellX,
  readCellY,
  readCellWidth,
  readCellHeight,
  readCellAlign,
  readCellRow,
  readCellCol,
  readCellPaddingTop,
  readCellPaddingRight,
  readCellPaddingBottom,
  readCellPaddingLeft,
} from "./adapter/layout-reader";

// Cell renderer registry
export {
  CellRendererRegistry,
  createCellRendererRegistry,
  textCellRenderer,
  badgeCellRenderer,
  sparklineCellRenderer,
  stubCellRenderer,
  flexCellRenderer,
} from "./renderer/components";
export type { CellRenderer, CellRenderContext } from "./renderer/components";

// Layer system
export {
  headerLayer,
  dataLayer,
  gridLinesLayer,
  selectionLayer,
  DEFAULT_LAYERS,
  createAfterDrawLayer,
} from "./renderer/layer";
export type { GridLayer, LayerContext, LayerSpace } from "./renderer/layer";

// Region system (frozen columns)
export { buildRegions } from "./renderer/region";
export type { CanvasRegion, RegionLayout } from "./renderer/region";

// Debug
export { createLogger } from "./debug/logger";
export type { Logger } from "./debug/logger";
export { renderDebugOverlay } from "./debug/overlay";
export { installInspector } from "./debug/inspector";

// WASM loader
export { initWasm, createTableEngine, isWasmReady, setWasmUrl } from "./wasm-loader";

// Types
export type {
  CellCoord,
  CellRange,
  NormalizedRange,
  SelectionStyle,
  CellLayout,
  TextInstruction,
  BadgeInstruction,
  SparklineInstruction,
  SparklineStyle,
  FlexContainerStyle,
  FlexInstruction,
  BoxModelStyle,
  BoxInstruction,
  StackDirection,
  StackInstruction,
  StubInstruction,
  RenderInstruction,
  TableCellContent,
  TextStyle,
  BadgeStyle,
  Theme,
  ColumnProps,
  GridProps,
  WasmTableEngine,
  // Event types
  GridEventBase,
  GridMouseEvent,
  GridCellEvent,
  GridHeaderEvent,
  GridKeyboardEvent,
  GridScrollEvent,
  GridCanvasEvent,
  GridCanvasEventType,
  GridContextMenuEvent,
  GridTouchEvent,
  GridTouchEventType,
  GridTouchPoint,
  HitTestResult,
  // CSS value types
  CssDimension,
  CssLength,
  CssLengthAuto,
  CssRect,
  CssDisplay,
  CssPosition,
  CssBoxSizing,
  CssOverflow,
  CssFlexDirection,
  CssFlexWrap,
  CssAlignItems,
  CssAlignContent,
  CssJustifyContent,
  CssGridTrackSize,
  CssGridTrackList,
  CssGridAutoFlow,
  CssGridPlacement,
  CssGridLine,
  BoxModelProps,
  AfterDrawContext,
} from "./types";
export { DEFAULT_THEME } from "./types";

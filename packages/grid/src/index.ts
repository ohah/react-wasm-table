// React components
export { Grid } from "./react/Grid";
export { Column } from "./react/Column";
export { ScrollBar } from "./react/ScrollBar";
export type { ScrollBarProps } from "./react/ScrollBar";

// Canvas JSX components
export {
  Text,
  Badge,
  Flex,
  Box,
  Stack,
  HStack,
  VStack,
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

// Resolve instruction
export { resolveInstruction } from "./resolve-instruction";

// Column helper (TanStack-compatible API)
export { createColumnHelper } from "./column-helper";
export type { ColumnHelper } from "./column-helper";
export { resolveColumns, getLeafColumns } from "./resolve-columns";
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
  ExpandedState,
  ExpandedUpdater,
} from "./tanstack-types";

// Header grouping (multi-level headers)
export { buildHeaderGroups } from "./build-header-groups";

// Grid instance + useGridTable (TanStack-compatible)
export { useGridTable } from "./use-grid-table";
export type { UseGridTableOptions } from "./use-grid-table";
export { buildGridInstance } from "./grid-instance";
export type {
  GridInstance,
  GridColumn,
  GridHeader,
  GridHeaderGroup,
  GridState,
  BuildOptions,
} from "./grid-instance";

// Row model
export {
  buildRow,
  buildRowModel,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  buildExpandedRowModel,
} from "./row-model";
export type { Row, RowModel, RowModelFactory } from "./row-model";

// Hooks
export { useGrid, useColumnRegistry } from "./react/hooks";

// Contexts
export { GridContext } from "./react/context";
export type { GridContextValue } from "./react/context";

// Adapter
export { ColumnRegistry } from "./adapter/column-registry";
export { InstructionBuilder } from "./adapter/instruction-builder";
export { EventManager } from "./adapter/event-manager";
export type { GridEventHandlers, ScrollNormalization, EventCoords } from "./adapter/event-manager";

// Event factory helpers
export {
  createGridCellEvent,
  createGridHeaderEvent,
  createGridKeyboardEvent,
  createGridScrollEvent,
  createGridCanvasEvent,
} from "./event-helpers";
export type { ContentCoords } from "./event-helpers";
export { EditorManager } from "./adapter/editor-manager";
export { SelectionManager, buildTSV } from "./adapter/selection-manager";

// Renderer
export { CanvasRenderer } from "./renderer/canvas-renderer";
export {
  drawTextCellFromBuffer,
  drawBadgeFromBuffer,
  measureText,
} from "./renderer/draw-primitives";

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
  FlexInstruction,
  StubInstruction,
  RenderInstruction,
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

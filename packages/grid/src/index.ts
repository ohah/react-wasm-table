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
} from "./grid-instance";

// Hooks
export { useGrid, useColumnRegistry, useWasm } from "./react/hooks";

// Contexts
export { GridContext, WasmContext } from "./react/context";
export type { GridContextValue, WasmContextValue } from "./react/context";

// Adapter
export { ColumnRegistry } from "./adapter/column-registry";
export { InstructionBuilder } from "./adapter/instruction-builder";
export { EventManager } from "./adapter/event-manager";
export type { GridEventHandlers, ScrollNormalization } from "./adapter/event-manager";
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
} from "./types";
export { DEFAULT_THEME } from "./types";

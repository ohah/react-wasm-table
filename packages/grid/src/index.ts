// React components
export { Grid } from "./react/Grid";
export { Column } from "./react/Column";
export { RowStyle } from "./react/RowStyle";
export type { RowStyleProps } from "./react/RowStyle";

// Hooks
export { useGrid, useColumnRegistry, useWasm } from "./react/hooks";

// Contexts
export { GridContext, WasmContext } from "./react/context";
export type { GridContextValue, WasmContextValue } from "./react/context";

// Adapter
export { ColumnRegistry } from "./adapter/column-registry";
export { InstructionBuilder } from "./adapter/instruction-builder";
export { EventManager } from "./adapter/event-manager";
export type { GridEventHandlers } from "./adapter/event-manager";
export { EditorManager } from "./adapter/editor-manager";

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
  CellLayout,
  TextInstruction,
  BadgeInstruction,
  RenderInstruction,
  TextStyle,
  BadgeStyle,
  Theme,
  ColumnDef,
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

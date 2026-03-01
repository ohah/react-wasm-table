/**
 * Library entry: export demo pages and shared utils for document or other consumers.
 * The demo app itself uses index.html + main.tsx; this file is for workspace imports.
 */

export { generateEmployees, generateSmallData } from "./data";
export { useContainerSize } from "./useContainerSize";

export { Home } from "./pages/Home";
export { Benchmark } from "./pages/Benchmark";
export { StressTest } from "./pages/StressTest";
export { Selection } from "./pages/Selection";
export { EventCallbacks } from "./pages/EventCallbacks";
export { MiddlewareDemo } from "./pages/MiddlewareDemo";
export { TouchEventsDemo } from "./pages/TouchEventsDemo";
export { ExportDemo } from "./pages/ExportDemo";
export { ClipboardDemo } from "./pages/ClipboardDemo";
export { LayoutCacheDemo } from "./pages/LayoutCacheDemo";
export { CanvasComponents } from "./pages/CanvasComponents";
export { CanvasText } from "./pages/CanvasText";
export { CanvasBadge } from "./pages/CanvasBadge";
export { CanvasFlex } from "./pages/CanvasFlex";
export { CanvasProgressBar } from "./pages/CanvasProgressBar";
export { CanvasBox } from "./pages/CanvasBox";
export { CanvasStack } from "./pages/CanvasStack";
export { CanvasSparkline } from "./pages/CanvasSparkline";
export { CustomRendererDemo } from "./pages/CustomRendererDemo";
export { LayerDemo } from "./pages/LayerDemo";
export { ColumnFeatures } from "./pages/ColumnFeatures";
export { ColumnPinningDemo } from "./pages/ColumnPinningDemo";
export { ColumnDnDAndRowPinningDemo } from "./pages/ColumnDnDAndRowPinningDemo";
export { ExpandingDemo } from "./pages/ExpandingDemo";
export { HooksOverview } from "./pages/HooksOverview";
export { UseSortingDemo } from "./pages/UseSortingDemo";
export { UseFilteringDemo } from "./pages/UseFilteringDemo";
export { UseSelectionDemo } from "./pages/UseSelectionDemo";
export { HookCompositionDemo } from "./pages/HookCompositionDemo";
export { OnAfterDrawDemo } from "./pages/OnAfterDrawDemo";
export { AdapterDIDemo } from "./pages/AdapterDIDemo";
export { TanStackApi } from "./pages/TanStackApi";
export { TableApiDemo } from "./pages/TableApiDemo";
export { GridTemplate } from "./pages/GridTemplate";
export { FlexDirection } from "./pages/FlexDirection";
export { FlexWrap } from "./pages/FlexWrap";
export { FlexGrow } from "./pages/FlexGrow";
export { Gap } from "./pages/Gap";
export { AlignItems } from "./pages/AlignItems";
export { JustifyContent } from "./pages/JustifyContent";
export { Padding } from "./pages/Padding";
export { Margin } from "./pages/Margin";
export { Overflow } from "./pages/Overflow";
export { Position } from "./pages/Position";
export { Scrollbar } from "./pages/Scrollbar";

export {
  TanStackColumnPinning,
  TanStackHome,
  TanStackUseSorting,
  TanStackSelection,
  TanStackUseFiltering,
  TanStackUseSelection,
  TanStackColumnDnDAndRowPinning,
  TanStackColumnFeatures,
  TanStackHookComposition,
  TanStackLayoutCache,
  TanStackMiddleware,
  TanStackExport,
  TanStackLayer,
  TanStackCustomRenderer,
  TanStackEventCallbacks,
  TanStackClipboard,
  TanStackStressTest,
  TanStackAdapterDI,
  TanStackOnAfterDraw,
  TanStackTouchEvents,
  TanStackTdContent,
  TanStackExpanding,
} from "./pages/tanstack";

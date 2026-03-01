import { Routes, Route } from "react-router";
import { setWasmUrl } from "@ohah/react-wasm-table";
import { Sidebar } from "./components/Sidebar";
import { Home } from "./pages/Home";
import { TanStackApi } from "./pages/TanStackApi";
import { FlexDirection } from "./pages/FlexDirection";
import { FlexWrap } from "./pages/FlexWrap";
import { FlexGrow } from "./pages/FlexGrow";
import { Gap } from "./pages/Gap";
import { AlignItems } from "./pages/AlignItems";
import { JustifyContent } from "./pages/JustifyContent";
import { Padding } from "./pages/Padding";
import { Margin } from "./pages/Margin";
import { Overflow } from "./pages/Overflow";
import { Position } from "./pages/Position";
import { GridTemplate } from "./pages/GridTemplate";
import { Scrollbar } from "./pages/Scrollbar";
import { Selection } from "./pages/Selection";
import { StressTest } from "./pages/StressTest";
import { EventCallbacks } from "./pages/EventCallbacks";
import { HooksOverview } from "./pages/HooksOverview";
import { UseSortingDemo } from "./pages/UseSortingDemo";
import { UseFilteringDemo } from "./pages/UseFilteringDemo";
import { UseSelectionDemo } from "./pages/UseSelectionDemo";
import { HookCompositionDemo } from "./pages/HookCompositionDemo";
import { OnAfterDrawDemo } from "./pages/OnAfterDrawDemo";
import { AdapterDIDemo } from "./pages/AdapterDIDemo";
import { ColumnFeatures } from "./pages/ColumnFeatures";
import { ExpandingDemo } from "./pages/ExpandingDemo";
import { TouchEventsDemo } from "./pages/TouchEventsDemo";
import { ExportDemo } from "./pages/ExportDemo";
import { ClipboardDemo } from "./pages/ClipboardDemo";
import { MiddlewareDemo } from "./pages/MiddlewareDemo";
import { LayoutCacheDemo } from "./pages/LayoutCacheDemo";
import { CanvasComponents } from "./pages/CanvasComponents";
import { CanvasText } from "./pages/CanvasText";
import { CanvasBadge } from "./pages/CanvasBadge";
import { CanvasFlex } from "./pages/CanvasFlex";
import { CanvasProgressBar } from "./pages/CanvasProgressBar";
import { CanvasBox } from "./pages/CanvasBox";
import { CanvasStack } from "./pages/CanvasStack";
import { CustomRendererDemo } from "./pages/CustomRendererDemo";
import { LayerDemo } from "./pages/LayerDemo";
import { ColumnPinningDemo } from "./pages/ColumnPinningDemo";
import { ColumnDnDAndRowPinningDemo } from "./pages/ColumnDnDAndRowPinningDemo";
import { TableApiDemo } from "./pages/TableApiDemo";
import {
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
import { FpsCounter } from "./components/FpsCounter";

setWasmUrl("/react_wasm_table_wasm_bg.wasm");

export function App() {
  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <FpsCounter />
      <Sidebar />
      <main style={{ flex: 1, overflow: "auto", padding: 24 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tanstack-api" element={<TanStackApi />} />
          <Route path="/tanstack/column-pinning" element={<TanStackColumnPinning />} />
          <Route path="/tanstack/home" element={<TanStackHome />} />
          <Route path="/tanstack/selection" element={<TanStackSelection />} />
          <Route path="/tanstack/hooks/sorting" element={<TanStackUseSorting />} />
          <Route path="/tanstack/hooks/filtering" element={<TanStackUseFiltering />} />
          <Route path="/tanstack/hooks/selection" element={<TanStackUseSelection />} />
          <Route
            path="/tanstack/column-dnd-row-pinning"
            element={<TanStackColumnDnDAndRowPinning />}
          />
          <Route path="/tanstack/column-features" element={<TanStackColumnFeatures />} />
          <Route path="/tanstack/hooks/composition" element={<TanStackHookComposition />} />
          <Route path="/tanstack/layout-cache" element={<TanStackLayoutCache />} />
          <Route path="/tanstack/event-middleware" element={<TanStackMiddleware />} />
          <Route path="/tanstack/export" element={<TanStackExport />} />
          <Route path="/tanstack/layers" element={<TanStackLayer />} />
          <Route path="/tanstack/custom-renderer" element={<TanStackCustomRenderer />} />
          <Route path="/tanstack/event-callbacks" element={<TanStackEventCallbacks />} />
          <Route path="/tanstack/clipboard" element={<TanStackClipboard />} />
          <Route path="/tanstack/stress-test" element={<TanStackStressTest />} />
          <Route path="/tanstack/hooks/adapter-di" element={<TanStackAdapterDI />} />
          <Route path="/tanstack/hooks/after-draw" element={<TanStackOnAfterDraw />} />
          <Route path="/tanstack/touch-events" element={<TanStackTouchEvents />} />
          <Route path="/tanstack/td-content" element={<TanStackTdContent />} />
          <Route path="/tanstack/expanding" element={<TanStackExpanding />} />
          {/* Canvas / Flex / Box — TanStack route uses same component (identical demo) */}
          <Route path="/tanstack/canvas-components" element={<CanvasComponents />} />
          <Route path="/tanstack/canvas-text" element={<CanvasText />} />
          <Route path="/tanstack/canvas-badge" element={<CanvasBadge />} />
          <Route path="/tanstack/canvas-flex" element={<CanvasFlex />} />
          <Route path="/tanstack/canvas-progress-bar" element={<CanvasProgressBar />} />
          <Route path="/tanstack/canvas-box" element={<CanvasBox />} />
          <Route path="/tanstack/canvas-stack" element={<CanvasStack />} />
          <Route path="/tanstack/grid-template" element={<GridTemplate />} />
          <Route path="/tanstack/flex-direction" element={<FlexDirection />} />
          <Route path="/tanstack/flex-wrap" element={<FlexWrap />} />
          <Route path="/tanstack/gap" element={<Gap />} />
          <Route path="/tanstack/justify-content" element={<JustifyContent />} />
          <Route path="/tanstack/align-items" element={<AlignItems />} />
          <Route path="/tanstack/flex-grow" element={<FlexGrow />} />
          <Route path="/tanstack/position" element={<Position />} />
          <Route path="/tanstack/padding" element={<Padding />} />
          <Route path="/tanstack/margin" element={<Margin />} />
          <Route path="/tanstack/overflow" element={<Overflow />} />
          <Route path="/tanstack/scrollbar" element={<Scrollbar />} />
          <Route path="/tanstack/hooks" element={<HooksOverview />} />
          <Route path="/table-api" element={<TableApiDemo />} />
          <Route path="/flex-direction" element={<FlexDirection />} />
          <Route path="/flex-wrap" element={<FlexWrap />} />
          <Route path="/flex-grow" element={<FlexGrow />} />
          <Route path="/gap" element={<Gap />} />
          <Route path="/align-items" element={<AlignItems />} />
          <Route path="/justify-content" element={<JustifyContent />} />
          <Route path="/padding" element={<Padding />} />
          <Route path="/margin" element={<Margin />} />
          <Route path="/overflow" element={<Overflow />} />
          <Route path="/position" element={<Position />} />
          <Route path="/grid-template" element={<GridTemplate />} />
          <Route path="/scrollbar" element={<Scrollbar />} />
          <Route path="/selection" element={<Selection />} />
          <Route path="/stress-test" element={<StressTest />} />
          <Route path="/event-callbacks" element={<EventCallbacks />} />
          <Route path="/hooks" element={<HooksOverview />} />
          <Route path="/hooks/sorting" element={<UseSortingDemo />} />
          <Route path="/hooks/filtering" element={<UseFilteringDemo />} />
          <Route path="/hooks/selection" element={<UseSelectionDemo />} />
          <Route path="/hooks/composition" element={<HookCompositionDemo />} />
          <Route path="/hooks/after-draw" element={<OnAfterDrawDemo />} />
          <Route path="/hooks/adapter-di" element={<AdapterDIDemo />} />
          <Route path="/column-features" element={<ColumnFeatures />} />
          <Route path="/expanding" element={<ExpandingDemo />} />
          <Route path="/touch-events" element={<TouchEventsDemo />} />
          <Route path="/export" element={<ExportDemo />} />
          <Route path="/clipboard" element={<ClipboardDemo />} />
          <Route path="/event-middleware" element={<MiddlewareDemo />} />
          <Route path="/layout-cache" element={<LayoutCacheDemo />} />
          <Route path="/canvas-components" element={<CanvasComponents />} />
          <Route path="/canvas-text" element={<CanvasText />} />
          <Route path="/canvas-badge" element={<CanvasBadge />} />
          <Route path="/canvas-flex" element={<CanvasFlex />} />
          <Route path="/canvas-progress-bar" element={<CanvasProgressBar />} />
          <Route path="/canvas-box" element={<CanvasBox />} />
          <Route path="/canvas-stack" element={<CanvasStack />} />
          <Route path="/custom-renderer" element={<CustomRendererDemo />} />
          <Route path="/layers" element={<LayerDemo />} />
          <Route path="/column-pinning" element={<ColumnPinningDemo />} />
          <Route path="/column-dnd-row-pinning" element={<ColumnDnDAndRowPinningDemo />} />
        </Routes>
      </main>
    </div>
  );
}

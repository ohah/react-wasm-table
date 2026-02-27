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
import { UseSelectionDemo } from "./pages/UseSelectionDemo";
import { HookCompositionDemo } from "./pages/HookCompositionDemo";
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
          <Route path="/hooks/selection" element={<UseSelectionDemo />} />
          <Route path="/hooks/composition" element={<HookCompositionDemo />} />
        </Routes>
      </main>
    </div>
  );
}

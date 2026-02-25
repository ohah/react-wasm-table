import { Routes, Route } from "react-router";
import { setWasmUrl } from "@ohah/react-wasm-table";
import { Sidebar } from "./components/Sidebar";
import { Home } from "./pages/Home";
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

setWasmUrl("/react_wasm_table_wasm_bg.wasm");

export function App() {
  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: "auto", padding: 24 }}>
        <Routes>
          <Route path="/" element={<Home />} />
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
        </Routes>
      </main>
    </div>
  );
}

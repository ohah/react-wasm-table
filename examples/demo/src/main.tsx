import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WasmProvider } from "@anthropic/react-wasm-table";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");
createRoot(root).render(
  <StrictMode>
    <WasmProvider>
      <App />
    </WasmProvider>
  </StrictMode>,
);

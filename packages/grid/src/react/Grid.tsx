import { useRef, useMemo } from "react";
import type { GridProps } from "../types";
import { ColumnRegistry } from "../adapter/column-registry";
import { GridContext, WasmContext } from "./context";

/**
 * Canvas-based grid component.
 * Renders a <canvas> element for data display and a <div> overlay for editors.
 * Initializes WASM internally — no external WasmProvider needed.
 */
export function Grid({ data: _data, width, height, children }: GridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const columnRegistry = useMemo(() => new ColumnRegistry(), []);

  // TODO: Initialize WASM engine, set up render loop, handle scroll events

  return (
    <GridContext.Provider value={{ columnRegistry }}>
      <WasmContext.Provider value={{ engine: null, isReady: false }}>
        <div style={{ position: "relative", width, height }}>
          <canvas ref={canvasRef} width={width} height={height} style={{ display: "block" }} />
          <div
            ref={editorRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              pointerEvents: "none",
            }}
          />
          {children}
        </div>
      </WasmContext.Provider>
    </GridContext.Provider>
  );
}

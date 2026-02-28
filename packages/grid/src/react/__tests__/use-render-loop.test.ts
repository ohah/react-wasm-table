import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { useRenderLoop } from "../hooks/use-render-loop";
import { ColumnRegistry } from "../../adapter/column-registry";
import { SelectionManager } from "../../adapter/selection-manager";
import { EventManager } from "../../adapter/event-manager";
import { StringTable } from "../../adapter/string-table";
import { DEFAULT_THEME } from "../../types";
import type { AfterDrawContext } from "../../types";

// Synchronous rAF for deterministic testing
let rafCallbacks: (() => void)[] = [];
let rafId = 0;

function flushRAF() {
  const cbs = rafCallbacks.slice();
  rafCallbacks = [];
  cbs.forEach((cb) => cb());
}

beforeEach(() => {
  rafCallbacks = [];
  rafId = 0;
  (globalThis as any).__origRAF = globalThis.requestAnimationFrame;
  (globalThis as any).__origCAF = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
    rafId++;
    rafCallbacks.push(() => cb(performance.now()));
    return rafId;
  };
  globalThis.cancelAnimationFrame = (_id: number) => {
    // no-op for tests
  };
});

afterEach(() => {
  globalThis.requestAnimationFrame = (globalThis as any).__origRAF;
  globalThis.cancelAnimationFrame = (globalThis as any).__origCAF;
});

const STRIDE = 16;

function makeLayoutBuf(
  cells: { row: number; col: number; x: number; y: number; w: number; h: number }[],
) {
  const buf = new Float32Array(cells.length * STRIDE);
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i]!;
    buf[i * STRIDE + 0] = c.row;
    buf[i * STRIDE + 1] = c.col;
    buf[i * STRIDE + 2] = c.x;
    buf[i * STRIDE + 3] = c.y;
    buf[i * STRIDE + 4] = c.w;
    buf[i * STRIDE + 5] = c.h;
  }
  return buf;
}

function makeEngine(layoutBuf: Float32Array, viewIndices?: Uint32Array) {
  return {
    updateViewportColumnar: mock(() => new Float64Array([layoutBuf.length / STRIDE, 0])),
  } as any;
}

function makeMemoryBridge(layoutBuf: Float32Array, viewIndices?: Uint32Array) {
  return {
    getLayoutBuffer: () => layoutBuf,
    getViewIndices: () => viewIndices ?? new Uint32Array([0]),
  } as any;
}

function makeMockCanvas() {
  const ctx = {
    save: mock(() => {}),
    restore: mock(() => {}),
    translate: mock(() => {}),
    clearRect: mock(() => {}),
    fillRect: mock(() => {}),
    fillText: mock(() => {}),
    strokeRect: mock(() => {}),
    beginPath: mock(() => {}),
    rect: mock(() => {}),
    clip: mock(() => {}),
    moveTo: mock(() => {}),
    lineTo: mock(() => {}),
    stroke: mock(() => {}),
    measureText: mock(() => ({ width: 50 })),
    scale: mock(() => {}),
    font: "",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    textAlign: "left" as CanvasTextAlign,
    textBaseline: "top" as CanvasTextBaseline,
    globalAlpha: 1,
    setLineDash: mock(() => {}),
  };
  const canvas = document.createElement("canvas");
  // Override getContext to return our mock
  canvas.getContext = (() => ctx) as any;
  // getBoundingClientRect for attach
  canvas.getBoundingClientRect = () =>
    ({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    }) as DOMRect;
  return { canvas, ctx };
}

function defaultParams(overrides?: Partial<Parameters<typeof useRenderLoop>[0]>) {
  const buf = makeLayoutBuf([
    { row: 0, col: 0, x: 0, y: 0, w: 200, h: 40 }, // header
    { row: 0, col: 0, x: 0, y: 40, w: 200, h: 36 }, // data cell
  ]);
  const engine = makeEngine(buf);
  const bridge = makeMemoryBridge(buf);
  const { canvas, ctx } = makeMockCanvas();
  const st = new StringTable();
  st.populate([{ name: "Alice" }] as Record<string, unknown>[], ["name"]);
  const registry = new ColumnRegistry();
  registry.setAll([{ id: "name", width: 200, header: "Name" }] as any);

  return {
    engine,
    memoryBridgeRef: { current: bridge },
    canvasRef: { current: canvas },
    columnRegistry: registry,
    data: [{ name: "Alice" }] as Record<string, unknown>[],
    stringTableRef: { current: st },
    theme: DEFAULT_THEME,
    sorting: [] as any,
    enableSelection: false,
    selectionManagerRef: { current: new SelectionManager() },
    eventManagerRef: { current: new EventManager() },
    scrollTopRef: { current: 0 },
    scrollLeftRef: { current: 0 },
    vScrollbarRef: { current: null } as any,
    hScrollbarRef: { current: null } as any,
    containerProps: {},
    viewRowCountRef: { current: 1 },
    width: 800,
    height: 600,
    rowHeight: 36,
    headerHeight: 40,
    onLayoutComputed: mock(() => {}),
    onVisStartComputed: mock(() => {}),
    columnPinning: undefined,
    _mockCtx: ctx,
    ...overrides,
  };
}

describe("useRenderLoop", () => {
  describe("invalidate return value", () => {
    it("returns invalidate as a function", () => {
      const params = defaultParams();
      const { result } = renderHook(() => useRenderLoop(params));
      expect(typeof result.current.invalidate).toBe("function");
    });

    it("invalidate reference is stable across re-renders", () => {
      const params = defaultParams();
      const { result, rerender } = renderHook(() => useRenderLoop(params));
      const first = result.current.invalidate;
      rerender();
      expect(result.current.invalidate).toBe(first);
    });
  });

  describe("dirtyRef internal ownership", () => {
    it("draws on first frame (internally dirty)", () => {
      const params = defaultParams();
      renderHook(() => useRenderLoop(params));
      // First rAF tick should trigger draw
      flushRAF();
      expect(params.engine.updateViewportColumnar).toHaveBeenCalled();
    });

    it("does not re-draw without invalidate", () => {
      const params = defaultParams();
      renderHook(() => useRenderLoop(params));
      flushRAF(); // first frame
      params.engine.updateViewportColumnar.mockClear();

      flushRAF(); // second frame — should skip
      expect(params.engine.updateViewportColumnar).not.toHaveBeenCalled();
    });

    it("re-draws after invalidate() call", () => {
      const params = defaultParams();
      const { result } = renderHook(() => useRenderLoop(params));
      flushRAF(); // first frame
      params.engine.updateViewportColumnar.mockClear();

      act(() => result.current.invalidate());
      flushRAF(); // should draw again
      expect(params.engine.updateViewportColumnar).toHaveBeenCalled();
    });
  });

  describe("onAfterDraw callback", () => {
    it("calls onAfterDraw with AfterDrawContext after draw", () => {
      const onAfterDraw = mock((_ctx: AfterDrawContext) => {});
      const params = defaultParams({ onAfterDraw });
      renderHook(() => useRenderLoop(params));
      flushRAF();

      expect(onAfterDraw).toHaveBeenCalledTimes(1);
      const ctx = onAfterDraw.mock.calls[0]![0] as AfterDrawContext;
      expect(ctx.width).toBe(800);
      expect(ctx.height).toBe(600);
      expect(ctx.scrollTop).toBe(0);
      expect(ctx.scrollLeft).toBe(0);
      expect(ctx.headerHeight).toBe(40);
      expect(ctx.rowHeight).toBe(36);
      expect(ctx.ctx).toBeDefined();
      // New fields (P2 #4)
      expect(ctx.columns).toBeDefined();
      expect(Array.isArray(ctx.columns)).toBe(true);
      expect(ctx.columns.length).toBe(1);
      expect(ctx.visibleRowStart).toBe(0);
      expect(typeof ctx.visibleRowCount).toBe("number");
      expect(ctx.dataRowCount).toBe(1);
    });

    it("catches errors in onAfterDraw without breaking render loop", () => {
      const errorSpy = mock(() => {});
      const origError = console.error;
      console.error = errorSpy;

      const onAfterDraw = mock(() => {
        throw new Error("user callback error");
      });
      const params = defaultParams({ onAfterDraw });
      const { result } = renderHook(() => useRenderLoop(params));
      // First frame: should not throw
      expect(() => flushRAF()).not.toThrow();
      expect(errorSpy).toHaveBeenCalledTimes(1);

      // Render loop should still work after error
      params.engine.updateViewportColumnar.mockClear();
      act(() => result.current.invalidate());
      flushRAF();
      expect(params.engine.updateViewportColumnar).toHaveBeenCalled();

      console.error = origError;
    });

    it("does not throw when onAfterDraw is not provided", () => {
      const params = defaultParams({ onAfterDraw: undefined });
      renderHook(() => useRenderLoop(params));
      expect(() => flushRAF()).not.toThrow();
    });

    it("uses latest onAfterDraw without re-starting effect", () => {
      const first = mock(() => {});
      const second = mock(() => {});
      let onAfterDraw = first;
      const baseParams = defaultParams({ onAfterDraw: first });
      const { result, rerender } = renderHook(() => useRenderLoop({ ...baseParams, onAfterDraw }));
      flushRAF();
      expect(first).toHaveBeenCalledTimes(1);

      // Switch to the second callback and re-render (updates the ref)
      onAfterDraw = second;
      rerender();
      act(() => result.current.invalidate());
      flushRAF();
      expect(second).toHaveBeenCalledTimes(1);
    });
  });

  describe("no engine/bridge", () => {
    it("does nothing when engine is null", () => {
      const params = defaultParams({ engine: null });
      renderHook(() => useRenderLoop(params));
      flushRAF();
      // No crash, no draw calls
      expect(params.onLayoutComputed).not.toHaveBeenCalled();
    });
  });
});

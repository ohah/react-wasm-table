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

  describe("cellDef with real row data", () => {
    it("calls cellDef with actual row.original and row.index", () => {
      const cellDefSpy = mock((info: any) => `Name: ${info.row.original.name}`);

      const registry = new ColumnRegistry();
      registry.setAll([
        {
          id: "name",
          width: 200,
          header: "Name",
          cellDef: cellDefSpy,
          columnDefRef: { accessorKey: "name" },
        },
      ] as any);

      const data = [{ name: "Alice" }, { name: "Bob" }] as Record<string, unknown>[];
      const st = new StringTable();
      st.populate(data, ["name"]);

      // Layout: 1 header + 1 data cell (row=0 maps to data[0])
      const buf = makeLayoutBuf([
        { row: 0, col: 0, x: 0, y: 0, w: 200, h: 40 }, // header
        { row: 0, col: 0, x: 0, y: 40, w: 200, h: 36 }, // data row 0
      ]);

      const params = defaultParams({
        columnRegistry: registry,
        data,
        stringTableRef: { current: st },
      });
      // Override the bridge to use our layout buf with viewIndices [0]
      params.memoryBridgeRef = {
        current: {
          getLayoutBuffer: () => buf,
          getViewIndices: () => new Uint32Array([0]),
        } as any,
      };

      renderHook(() => useRenderLoop(params));
      flushRAF();

      // cellDef should have been called at least once
      expect(cellDefSpy).toHaveBeenCalled();
      const info = cellDefSpy.mock.calls[0]![0];
      // Verify real row data is passed
      expect(info.row.original).toEqual({ name: "Alice" });
      expect(info.row.index).toBe(0);
      expect(info.row.id).toBe("0");
      expect(info.getValue()).toBe("Alice");
      expect(info.column.id).toBe("name");
    });

    it("string cellDef produces text instruction without calling function", () => {
      const registry = new ColumnRegistry();
      registry.setAll([{ id: "status", width: 100, header: "Status", cellDef: "N/A" }] as any);

      const data = [{ status: "active" }] as Record<string, unknown>[];
      const st = new StringTable();
      st.populate(data, ["status"]);

      const buf = makeLayoutBuf([
        { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },
        { row: 0, col: 0, x: 0, y: 40, w: 100, h: 36 },
      ]);

      const { canvas, ctx: mockCtx } = makeMockCanvas();
      const params = defaultParams({
        columnRegistry: registry,
        data,
        stringTableRef: { current: st },
        canvasRef: { current: canvas },
      });
      params.memoryBridgeRef = {
        current: {
          getLayoutBuffer: () => buf,
          getViewIndices: () => new Uint32Array([0]),
        } as any,
      };

      renderHook(() => useRenderLoop(params));
      flushRAF();

      // "N/A" should be drawn (not "active" from StringTable)
      const textCalls = mockCtx.fillText.mock.calls;
      const drawn = textCalls.map((c: any) => c[0]);
      expect(drawn.some((t: string) => t === "N/A")).toBe(true);
    });

    it("uses accessorFn when available on columnDefRef", () => {
      const cellDefSpy = mock((info: any) => `Full: ${info.getValue()}`);

      const registry = new ColumnRegistry();
      registry.setAll([
        {
          id: "fullName",
          width: 200,
          header: "Full Name",
          cellDef: cellDefSpy,
          columnDefRef: {
            id: "fullName",
            accessorFn: (row: any) => `${row.first} ${row.last}`,
          },
        },
      ] as any);

      const data = [{ first: "Alice", last: "Kim" }] as Record<string, unknown>[];
      const st = new StringTable();
      st.populate(data, ["fullName"]);

      const buf = makeLayoutBuf([
        { row: 0, col: 0, x: 0, y: 0, w: 200, h: 40 },
        { row: 0, col: 0, x: 0, y: 40, w: 200, h: 36 },
      ]);

      const params = defaultParams({
        columnRegistry: registry,
        data,
        stringTableRef: { current: st },
      });
      params.memoryBridgeRef = {
        current: {
          getLayoutBuffer: () => buf,
          getViewIndices: () => new Uint32Array([0]),
        } as any,
      };

      renderHook(() => useRenderLoop(params));
      flushRAF();

      expect(cellDefSpy).toHaveBeenCalled();
      const info = cellDefSpy.mock.calls[0]![0];
      // getValue should return the accessorFn result
      expect(info.getValue()).toBe("Alice Kim");
    });
  });

  describe("parsedBodyContent priority", () => {
    it("parsedBodyContent takes priority over cellDef", () => {
      const cellDefSpy = mock((info: any) => `cellDef: ${info.getValue()}`);

      const registry = new ColumnRegistry();
      registry.setAll([
        {
          id: "name",
          width: 200,
          header: "Name",
          cellDef: cellDefSpy,
          columnDefRef: { accessorKey: "name" },
        },
      ] as any);

      const data = [{ name: "Alice" }] as Record<string, unknown>[];
      const st = new StringTable();
      st.populate(data, ["name"]);

      const buf = makeLayoutBuf([
        { row: 0, col: 0, x: 0, y: 0, w: 200, h: 40 },
        { row: 0, col: 0, x: 0, y: 40, w: 200, h: 36 },
      ]);

      // parsedBodyContent: row 0, column "name" → "OVERRIDE"
      const parsedBodyContent = new Map([["0:name", { type: "text" as const, value: "OVERRIDE" }]]);

      const { canvas, ctx: mockCtx } = makeMockCanvas();
      const params = defaultParams({
        columnRegistry: registry,
        data,
        stringTableRef: { current: st },
        canvasRef: { current: canvas },
        parsedBodyContent,
      });
      params.memoryBridgeRef = {
        current: {
          getLayoutBuffer: () => buf,
          getViewIndices: () => new Uint32Array([0]),
        } as any,
      };

      renderHook(() => useRenderLoop(params));
      flushRAF();

      // cellDef should NOT have been called — parsedBodyContent takes priority
      expect(cellDefSpy).not.toHaveBeenCalled();
      // "OVERRIDE" should be drawn
      const textCalls = mockCtx.fillText.mock.calls;
      const drawn = textCalls.map((c: any) => c[0]);
      expect(drawn.some((t: string) => t === "OVERRIDE")).toBe(true);
    });

    it("falls through to cellDef when parsedBodyContent has no matching key", () => {
      const cellDefSpy = mock((info: any) => `from-cellDef`);

      const registry = new ColumnRegistry();
      registry.setAll([
        {
          id: "name",
          width: 200,
          header: "Name",
          cellDef: cellDefSpy,
          columnDefRef: { accessorKey: "name" },
        },
      ] as any);

      const data = [{ name: "Alice" }] as Record<string, unknown>[];
      const st = new StringTable();
      st.populate(data, ["name"]);

      const buf = makeLayoutBuf([
        { row: 0, col: 0, x: 0, y: 0, w: 200, h: 40 },
        { row: 0, col: 0, x: 0, y: 40, w: 200, h: 36 },
      ]);

      // parsedBodyContent with a different key — no match for row 0
      const parsedBodyContent = new Map([["99:name", { type: "text" as const, value: "WRONG" }]]);

      const params = defaultParams({
        columnRegistry: registry,
        data,
        stringTableRef: { current: st },
        parsedBodyContent,
      });
      params.memoryBridgeRef = {
        current: {
          getLayoutBuffer: () => buf,
          getViewIndices: () => new Uint32Array([0]),
        } as any,
      };

      renderHook(() => useRenderLoop(params));
      flushRAF();

      // cellDef should be called since parsedBodyContent didn't match
      expect(cellDefSpy).toHaveBeenCalled();
    });

    it("falls through to StringTable when no cellDef and no parsedBodyContent", () => {
      const registry = new ColumnRegistry();
      registry.setAll([{ id: "name", width: 200, header: "Name" }] as any);

      const data = [{ name: "Alice" }] as Record<string, unknown>[];
      const st = new StringTable();
      st.populate(data, ["name"]);

      const buf = makeLayoutBuf([
        { row: 0, col: 0, x: 0, y: 0, w: 200, h: 40 },
        { row: 0, col: 0, x: 0, y: 40, w: 200, h: 36 },
      ]);

      const { canvas, ctx: mockCtx } = makeMockCanvas();
      const params = defaultParams({
        columnRegistry: registry,
        data,
        stringTableRef: { current: st },
        canvasRef: { current: canvas },
      });
      params.memoryBridgeRef = {
        current: {
          getLayoutBuffer: () => buf,
          getViewIndices: () => new Uint32Array([0]),
        } as any,
      };

      renderHook(() => useRenderLoop(params));
      flushRAF();

      // StringTable should produce "Alice"
      const textCalls = mockCtx.fillText.mock.calls;
      const drawn = textCalls.map((c: any) => c[0]);
      expect(drawn.some((t: string) => t === "Alice")).toBe(true);
    });
  });
});

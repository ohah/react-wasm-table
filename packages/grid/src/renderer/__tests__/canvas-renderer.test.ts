import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test";
import { CanvasRenderer } from "../canvas-renderer";
import type { Theme, RenderInstruction } from "../../types";

const defaultTheme: Theme = {
  headerBackground: "#f5f5f5",
  headerColor: "#333",
  headerFontSize: 13,
  cellBackground: "#fff",
  cellColor: "#333",
  fontSize: 13,
  borderColor: "#e0e0e0",
  selectedBackground: "#1976d2",
};

/** Stride 16: [row, col, x, y, width, height, align, padT, padR, padB, padL, borderT, borderR, borderB, borderL, reserved] */
function buildBuf(cells: [number, number, number, number, number, number][]): Float32Array {
  const stride = 16;
  const buf = new Float32Array(cells.length * stride);
  for (let i = 0; i < cells.length; i++) {
    const [row, col, x, y, w, h] = cells[i]!;
    const off = i * stride;
    buf[off] = row;
    buf[off + 1] = col;
    buf[off + 2] = x;
    buf[off + 3] = y;
    buf[off + 4] = w;
    buf[off + 5] = h;
    buf[off + 6] = 0; // align=left
    // padding and border fields all default to 0
  }
  return buf;
}

function mockCtx() {
  return {
    font: "",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    textBaseline: "",
    textAlign: "",
    scale: mock(() => {}),
    clearRect: mock(() => {}),
    fillRect: mock(() => {}),
    strokeRect: mock(() => {}),
    beginPath: mock(() => {}),
    moveTo: mock(() => {}),
    lineTo: mock(() => {}),
    stroke: mock(() => {}),
    measureText: mock(() => ({ width: 40 })),
    fillText: mock(() => {}),
    roundRect: mock(() => {}),
    fill: mock(() => {}),
  } as unknown as CanvasRenderingContext2D;
}

function mockCanvas(ctx: CanvasRenderingContext2D) {
  const canvas = document.createElement("canvas");
  canvas.getBoundingClientRect = () =>
    ({
      width: 800,
      height: 600,
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    }) as DOMRect;
  (canvas as any).getContext = mock(() => ctx);
  return canvas;
}

describe("CanvasRenderer", () => {
  let renderer: CanvasRenderer;
  let ctx: CanvasRenderingContext2D;
  let canvas: HTMLCanvasElement;

  let origDpr: number;

  beforeEach(() => {
    renderer = new CanvasRenderer();
    ctx = mockCtx();
    canvas = mockCanvas(ctx);
    // Save and override devicePixelRatio without replacing the window object
    origDpr = window.devicePixelRatio;
    Object.defineProperty(window, "devicePixelRatio", {
      value: 1,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "devicePixelRatio", {
      value: origDpr,
      writable: true,
      configurable: true,
    });
  });

  describe("attach", () => {
    it("sets up the canvas context", () => {
      renderer.attach(canvas);
      expect(renderer.context).toBe(ctx);
    });

    it("scales canvas for devicePixelRatio", () => {
      Object.defineProperty(window, "devicePixelRatio", {
        value: 2,
        writable: true,
        configurable: true,
      });
      renderer.attach(canvas);
      expect(ctx.scale).toHaveBeenCalledWith(2, 2);
    });
  });

  describe("clear", () => {
    it("clears the entire canvas", () => {
      renderer.attach(canvas);
      renderer.clear();
      expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });

    it("is a no-op when not attached", () => {
      renderer.clear(); // should not throw
    });
  });

  describe("context getter", () => {
    it("returns null when not attached", () => {
      expect(renderer.context).toBeNull();
    });

    it("returns the context after attach", () => {
      renderer.attach(canvas);
      expect(renderer.context).toBe(ctx);
    });
  });

  describe("drawHeaderFromBuffer", () => {
    it("draws header background and text", () => {
      renderer.attach(canvas);
      // 2 header cells
      const buf = buildBuf([
        [0, 0, 0, 0, 200, 40],
        [0, 1, 200, 0, 200, 40],
      ]);
      renderer.drawHeaderFromBuffer(buf, 0, 2, ["Name", "Age"], defaultTheme, 40);

      // Should draw header background
      expect(ctx.fillRect).toHaveBeenCalled();
      // Should draw text for each header
      expect(ctx.fillText).toHaveBeenCalledTimes(2);
    });

    it("is a no-op with count=0", () => {
      renderer.attach(canvas);
      const buf = new Float32Array(0);
      renderer.drawHeaderFromBuffer(buf, 0, 0, [], defaultTheme, 40);
      expect(ctx.fillRect).not.toHaveBeenCalled();
    });

    it("is a no-op when not attached", () => {
      const buf = buildBuf([[0, 0, 0, 0, 200, 40]]);
      renderer.drawHeaderFromBuffer(buf, 0, 1, ["Name"], defaultTheme, 40);
      // Should not throw
    });
  });

  describe("drawRowsFromBuffer", () => {
    it("draws alternating row backgrounds and cell text", () => {
      renderer.attach(canvas);
      // 2 rows, 1 col each
      const buf = buildBuf([
        [0, 0, 0, 40, 200, 36],
        [1, 0, 0, 76, 200, 36],
      ]);
      const getInstruction = (cellIdx: number): RenderInstruction => ({
        type: "text",
        value: `cell${cellIdx}`,
      });
      renderer.drawRowsFromBuffer(buf, 0, 2, getInstruction, defaultTheme, 36);

      // Should draw row backgrounds (2 rows)
      // fillRect called for each row bg
      expect((ctx.fillRect as any).mock.calls.length).toBeGreaterThanOrEqual(2);
      // Should draw text for each cell
      expect(ctx.fillText).toHaveBeenCalledTimes(2);
    });

    it("renders badge instructions", () => {
      renderer.attach(canvas);
      const buf = buildBuf([[0, 0, 0, 40, 200, 36]]);
      const getInstruction = (): RenderInstruction => ({
        type: "badge",
        value: "Active",
        style: { backgroundColor: "#4caf50", color: "#fff" },
      });
      renderer.drawRowsFromBuffer(buf, 0, 1, getInstruction, defaultTheme, 36);

      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.roundRect).toHaveBeenCalled();
    });

    it("renders stub instructions", () => {
      renderer.attach(canvas);
      const buf = buildBuf([[0, 0, 0, 40, 200, 36]]);
      const getInstruction = (): RenderInstruction => ({
        type: "stub",
        component: "Chart",
      });
      renderer.drawRowsFromBuffer(buf, 0, 1, getInstruction, defaultTheme, 36);

      const fillTextCalls = (ctx.fillText as any).mock.calls;
      expect(fillTextCalls.length).toBe(1);
      expect(fillTextCalls[0][0]).toBe("[Chart]");
    });

    it("renders flex instructions (first child text)", () => {
      renderer.attach(canvas);
      const buf = buildBuf([[0, 0, 0, 40, 200, 36]]);
      const getInstruction = (): RenderInstruction => ({
        type: "flex",
        children: [{ type: "text", value: "Flex child" }],
      });
      renderer.drawRowsFromBuffer(buf, 0, 1, getInstruction, defaultTheme, 36);

      const fillTextCalls = (ctx.fillText as any).mock.calls;
      expect(fillTextCalls.length).toBe(1);
      expect(fillTextCalls[0][0]).toBe("Flex child");
    });

    it("renders flex instructions (first child badge)", () => {
      renderer.attach(canvas);
      const buf = buildBuf([[0, 0, 0, 40, 200, 36]]);
      const getInstruction = (): RenderInstruction => ({
        type: "flex",
        children: [{ type: "badge", value: "OK", style: { backgroundColor: "#0f0" } }],
      });
      renderer.drawRowsFromBuffer(buf, 0, 1, getInstruction, defaultTheme, 36);

      expect(ctx.roundRect).toHaveBeenCalled();
    });

    it("handles flex with empty children", () => {
      renderer.attach(canvas);
      const buf = buildBuf([[0, 0, 0, 40, 200, 36]]);
      const getInstruction = (): RenderInstruction => ({
        type: "flex",
        children: [],
      });
      renderer.drawRowsFromBuffer(buf, 0, 1, getInstruction, defaultTheme, 36);
      // Should not draw anything for empty flex
      expect(ctx.fillText).not.toHaveBeenCalled();
    });

    it("skips undefined instructions", () => {
      renderer.attach(canvas);
      const buf = buildBuf([[0, 0, 0, 40, 200, 36]]);
      const getInstruction = () => undefined;
      renderer.drawRowsFromBuffer(buf, 0, 1, getInstruction, defaultTheme, 36);
      expect(ctx.fillText).not.toHaveBeenCalled();
    });

    it("is a no-op with count=0", () => {
      renderer.attach(canvas);
      renderer.drawRowsFromBuffer(new Float32Array(0), 0, 0, () => undefined, defaultTheme, 36);
      expect(ctx.fillRect).not.toHaveBeenCalled();
    });
  });

  describe("drawGridLinesFromBuffer", () => {
    it("draws header and data grid lines", () => {
      renderer.attach(canvas);
      // 1 header cell + 2 data cells
      const buf = buildBuf([
        [0, 0, 0, 0, 200, 40],
        [1, 0, 0, 40, 200, 36],
        [2, 0, 0, 76, 200, 36],
      ]);
      renderer.drawGridLinesFromBuffer(buf, 1, 3, defaultTheme, 40, 36);

      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it("is a no-op with totalCount=0", () => {
      renderer.attach(canvas);
      renderer.drawGridLinesFromBuffer(new Float32Array(0), 0, 0, defaultTheme, 40, 36);
      expect(ctx.beginPath).not.toHaveBeenCalled();
    });
  });

  describe("drawSelection", () => {
    it("draws selection rectangle", () => {
      renderer.attach(canvas);
      // Header + 2 data cells
      const buf = buildBuf([
        [0, 0, 0, 0, 200, 40], // header
        [0, 0, 0, 40, 200, 36], // data row0 col0
        [0, 1, 200, 40, 200, 36], // data row0 col1
      ]);
      renderer.drawSelection(
        buf,
        1,
        3,
        { minRow: 0, maxRow: 0, minCol: 0, maxCol: 1 },
        defaultTheme,
      );

      expect(ctx.fillRect).toHaveBeenCalled();
      expect(ctx.strokeRect).toHaveBeenCalled();
    });

    it("applies custom selection style", () => {
      renderer.attach(canvas);
      const buf = buildBuf([
        [0, 0, 0, 0, 200, 40],
        [0, 0, 0, 40, 200, 36],
      ]);
      renderer.drawSelection(
        buf,
        1,
        2,
        { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 },
        defaultTheme,
        { background: "rgba(255,0,0,0.3)", borderColor: "#f00", borderWidth: 3 },
      );

      expect(ctx.strokeRect).toHaveBeenCalled();
    });

    it("is a no-op when not attached", () => {
      const buf = buildBuf([[0, 0, 0, 40, 200, 36]]);
      renderer.drawSelection(
        buf,
        0,
        1,
        { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 },
        defaultTheme,
      );
      // Should not throw
    });
  });
});

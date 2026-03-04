import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test";
import { CanvasRenderer } from "../canvas";
import { createCellRendererRegistry } from "../components";
import type { CellRenderer } from "../components";
import type { Theme, RenderInstruction } from "../../types";
import type { GridHeaderGroup } from "../../grid-instance";

const defaultTheme: Theme = {
  headerBackground: "#f5f5f5",
  headerColor: "#333",
  headerFontSize: 13,
  cellBackground: "#fff",
  cellColor: "#333",
  fontSize: 13,
  fontFamily: "system-ui, sans-serif",
  borderColor: "#e0e0e0",
  borderWidth: 0.5,
  borderStyle: "solid",
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
    textAlign: "left" as CanvasTextAlign,
    globalAlpha: 1,
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
    arc: mock(() => {}),
    save: mock(() => {}),
    restore: mock(() => {}),
    clip: mock(() => {}),
    rect: mock(() => {}),
  } as unknown as CanvasRenderingContext2D;
}

const noopLayout = (_input: Float32Array) => new Float32Array(0);

/** Simple mock computeChildLayout: places children sequentially at x=0, y=0 with their measured sizes. */
function mockComputeChildLayout(input: Float32Array): Float32Array {
  const childCount = input[10]!;
  const result = new Float32Array(childCount * 4);
  let offset = 0;
  for (let i = 0; i < childCount; i++) {
    const w = input[11 + i * 2]!;
    const h = input[11 + i * 2 + 1]!;
    result[i * 4] = offset; // x
    result[i * 4 + 1] = 0; // y
    result[i * 4 + 2] = w; // width
    result[i * 4 + 3] = h; // height
    offset += w + 4; // gap
  }
  return result;
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
  const registry = createCellRendererRegistry();

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

  describe("drawMultiLevelHeader", () => {
    function makeHeaderGroups(headers: string[]): GridHeaderGroup[] {
      return [
        {
          id: "headerGroup_0",
          depth: 0,
          headers: headers.map((h) => ({
            id: `${h}_header`,
            column: { id: h.toLowerCase(), columnDef: { header: h } } as any,
            colSpan: 1,
            rowSpan: 1,
            depth: 0,
            isPlaceholder: false,
            subHeaders: [],
            getContext: () => ({}) as any,
          })),
        },
      ];
    }

    it("draws header background and text", () => {
      renderer.attach(canvas);
      const buf = buildBuf([
        [0, 0, 0, 0, 200, 40],
        [0, 1, 200, 0, 200, 40],
      ]);
      renderer.drawMultiLevelHeader(
        buf,
        2,
        makeHeaderGroups(["Name", "Age"]),
        40,
        defaultTheme,
        [],
      );

      // Should draw header background
      expect(ctx.fillRect).toHaveBeenCalled();
      // Should draw text for each header
      expect(ctx.fillText).toHaveBeenCalledTimes(2);
    });

    it("is a no-op with count=0", () => {
      renderer.attach(canvas);
      const buf = new Float32Array(0);
      renderer.drawMultiLevelHeader(buf, 0, [], 40, defaultTheme, []);
      expect(ctx.fillRect).not.toHaveBeenCalled();
    });

    it("is a no-op when not attached", () => {
      const buf = buildBuf([[0, 0, 0, 0, 200, 40]]);
      renderer.drawMultiLevelHeader(buf, 1, makeHeaderGroups(["Name"]), 40, defaultTheme, []);
      // Should not throw
    });

    it("renders 2-level header groups (group row + leaf row)", () => {
      renderer.attach(canvas);
      // 3 leaf columns
      const buf = buildBuf([
        [0, 0, 0, 0, 100, 40],
        [0, 1, 100, 0, 100, 40],
        [0, 2, 200, 0, 100, 40],
      ]);
      const headerGroups: GridHeaderGroup[] = [
        {
          id: "headerGroup_0",
          depth: 0,
          headers: [
            {
              id: "personal_header",
              column: { id: "personal", columnDef: { header: "Personal" } } as any,
              colSpan: 2,
              rowSpan: 1,
              depth: 0,
              isPlaceholder: false,
              subHeaders: [],
              getContext: () => ({}) as any,
            },
            {
              id: "status_header",
              column: { id: "status", columnDef: { header: "Status" } } as any,
              colSpan: 1,
              rowSpan: 2,
              depth: 0,
              isPlaceholder: false,
              subHeaders: [],
              getContext: () => ({}) as any,
            },
          ],
        },
        {
          id: "headerGroup_1",
          depth: 1,
          headers: [
            {
              id: "name_header",
              column: { id: "name", columnDef: { header: "Name" } } as any,
              colSpan: 1,
              rowSpan: 1,
              depth: 1,
              isPlaceholder: false,
              subHeaders: [],
              getContext: () => ({}) as any,
            },
            {
              id: "age_header",
              column: { id: "age", columnDef: { header: "Age" } } as any,
              colSpan: 1,
              rowSpan: 1,
              depth: 1,
              isPlaceholder: false,
              subHeaders: [],
              getContext: () => ({}) as any,
            },
            {
              id: "status_placeholder",
              column: { id: "status", columnDef: { header: "Status" } } as any,
              colSpan: 1,
              rowSpan: 1,
              depth: 1,
              isPlaceholder: true,
              subHeaders: [],
              getContext: () => ({}) as any,
            },
          ],
        },
      ];
      renderer.drawMultiLevelHeader(buf, 3, headerGroups, 20, defaultTheme, []);

      // Should draw header background (full area)
      expect(ctx.fillRect).toHaveBeenCalled();
      // 4 non-placeholder headers: "Personal", "Status", "Name", "Age"
      // (status_placeholder is skipped)
      expect(ctx.fillText).toHaveBeenCalledTimes(4);
    });

    it("adds sort indicator only on leaf row headers", () => {
      renderer.attach(canvas);
      const buf = buildBuf([
        [0, 0, 0, 0, 200, 40],
        [0, 1, 200, 0, 200, 40],
      ]);
      const headerGroups: GridHeaderGroup[] = [
        {
          id: "headerGroup_0",
          depth: 0,
          headers: [
            {
              id: "group_header",
              column: { id: "group", columnDef: { header: "Group" } } as any,
              colSpan: 2,
              rowSpan: 1,
              depth: 0,
              isPlaceholder: false,
              subHeaders: [],
              getContext: () => ({}) as any,
            },
          ],
        },
        {
          id: "headerGroup_1",
          depth: 1,
          headers: [
            {
              id: "name_header",
              column: { id: "name", columnDef: { header: "Name" } } as any,
              colSpan: 1,
              rowSpan: 1,
              depth: 1,
              isPlaceholder: false,
              subHeaders: [],
              getContext: () => ({}) as any,
            },
            {
              id: "age_header",
              column: { id: "age", columnDef: { header: "Age" } } as any,
              colSpan: 1,
              rowSpan: 1,
              depth: 1,
              isPlaceholder: false,
              subHeaders: [],
              getContext: () => ({}) as any,
            },
          ],
        },
      ];
      const sorting = [{ id: "name", desc: false }];
      renderer.drawMultiLevelHeader(buf, 2, headerGroups, 20, defaultTheme, sorting);

      // Verify fillText calls contain the sort indicator on leaf row
      const fillTextCalls = (ctx.fillText as any).mock.calls;
      // Should have 3 texts: "Group", "Name ▲", "Age"
      expect(fillTextCalls.length).toBe(3);
      const texts = fillTextCalls.map((c: any) => c[0]);
      expect(texts).toContain("Name \u25B2");
      expect(texts).toContain("Age");
      expect(texts).toContain("Group");
    });

    it("renders DnD grip dots only on leaf row", () => {
      renderer.attach(canvas);
      const buf = buildBuf([[0, 0, 0, 0, 200, 40]]);
      renderer.drawMultiLevelHeader(buf, 1, makeHeaderGroups(["Name"]), 40, defaultTheme, [], true);

      // arc is called for grip dots (2 cols × 3 rows = 6 dots)
      expect((ctx.arc as any).mock.calls.length).toBe(6);
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
      renderer.drawRowsFromBuffer(
        buf,
        0,
        2,
        getInstruction,
        defaultTheme,
        36,
        noopLayout,
        registry,
      );

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
      renderer.drawRowsFromBuffer(
        buf,
        0,
        1,
        getInstruction,
        defaultTheme,
        36,
        noopLayout,
        registry,
      );

      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.roundRect).toHaveBeenCalled();
    });

    it("renders sparkline instructions (drawSparklineFromBuffer path)", () => {
      renderer.attach(canvas);
      const buf = buildBuf([[0, 0, 0, 40, 200, 36]]);
      const getInstruction = (): RenderInstruction => ({
        type: "sparkline",
        data: [10, 20, 15, 25, 30],
      });
      renderer.drawRowsFromBuffer(
        buf,
        0,
        1,
        getInstruction,
        defaultTheme,
        36,
        noopLayout,
        registry,
      );

      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.lineTo).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it("renders stub instructions", () => {
      renderer.attach(canvas);
      const buf = buildBuf([[0, 0, 0, 40, 200, 36]]);
      const getInstruction = (): RenderInstruction => ({
        type: "stub",
        component: "Chart",
      });
      renderer.drawRowsFromBuffer(
        buf,
        0,
        1,
        getInstruction,
        defaultTheme,
        36,
        noopLayout,
        registry,
      );

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
      renderer.drawRowsFromBuffer(
        buf,
        0,
        1,
        getInstruction,
        defaultTheme,
        36,
        mockComputeChildLayout,
        registry,
      );

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
      renderer.drawRowsFromBuffer(
        buf,
        0,
        1,
        getInstruction,
        defaultTheme,
        36,
        mockComputeChildLayout,
        registry,
      );

      expect(ctx.roundRect).toHaveBeenCalled();
    });

    it("handles flex with empty children", () => {
      renderer.attach(canvas);
      const buf = buildBuf([[0, 0, 0, 40, 200, 36]]);
      const getInstruction = (): RenderInstruction => ({
        type: "flex",
        children: [],
      });
      renderer.drawRowsFromBuffer(
        buf,
        0,
        1,
        getInstruction,
        defaultTheme,
        36,
        noopLayout,
        registry,
      );
      // Should not draw anything for empty flex
      expect(ctx.fillText).not.toHaveBeenCalled();
    });

    it("skips undefined instructions", () => {
      renderer.attach(canvas);
      const buf = buildBuf([[0, 0, 0, 40, 200, 36]]);
      const getInstruction = () => undefined;
      renderer.drawRowsFromBuffer(
        buf,
        0,
        1,
        getInstruction,
        defaultTheme,
        36,
        noopLayout,
        registry,
      );
      expect(ctx.fillText).not.toHaveBeenCalled();
    });

    it("is a no-op with count=0", () => {
      renderer.attach(canvas);
      renderer.drawRowsFromBuffer(
        new Float32Array(0),
        0,
        0,
        () => undefined,
        defaultTheme,
        36,
        noopLayout,
        registry,
      );
      expect(ctx.fillRect).not.toHaveBeenCalled();
    });

    it("dispatches to custom renderer via registry", () => {
      renderer.attach(canvas);
      const buf = buildBuf([[0, 0, 0, 40, 200, 36]]);
      const drawFn = mock(() => {});
      const custom: CellRenderer = { type: "progress", draw: drawFn };
      const customRegistry = createCellRendererRegistry([custom]);
      const getInstruction = (): RenderInstruction => ({ type: "progress", value: 0.75 }) as any;
      renderer.drawRowsFromBuffer(
        buf,
        0,
        1,
        getInstruction,
        defaultTheme,
        36,
        noopLayout,
        customRegistry,
      );
      expect(drawFn).toHaveBeenCalledTimes(1);
    });

    it("skips instructions with no registry", () => {
      renderer.attach(canvas);
      const buf = buildBuf([[0, 0, 0, 40, 200, 36]]);
      const getInstruction = (): RenderInstruction => ({
        type: "text",
        value: "Hello",
      });
      // No registry passed → nothing drawn (but no error)
      renderer.drawRowsFromBuffer(buf, 0, 1, getInstruction, defaultTheme, 36, noopLayout);
      expect(ctx.fillText).not.toHaveBeenCalled();
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

    it("draws per-cell borders when borderConfigMap is provided", () => {
      renderer.attach(canvas);

      const buf = buildBuf([
        [0, 0, 0, 0, 100, 40],
        [1, 0, 0, 40, 100, 36],
      ]);

      const borderConfigMap = new Map();
      borderConfigMap.set(1, {
        top: { width: 2, color: "#ff0000", style: "solid" },
        right: { width: 1, color: "#00ff00", style: "solid" },
        bottom: { width: 1, color: "#0000ff", style: "solid" },
        left: { width: 1, color: "#333", style: "solid" },
      });

      renderer.drawGridLinesFromBuffer(buf, 1, 2, defaultTheme, 40, 36, borderConfigMap);
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it("uses theme defaults for cells without config in borderConfigMap", () => {
      renderer.attach(canvas);

      const buf = buildBuf([
        [0, 0, 0, 0, 100, 40],
        [1, 0, 0, 40, 100, 36],
        [1, 1, 100, 40, 100, 36],
      ]);

      const borderConfigMap = new Map();
      // Only cell at index 1 has custom config; cell at index 2 uses defaults
      borderConfigMap.set(1, {
        top: { width: 2, color: "#f00", style: "solid" },
      });

      renderer.drawGridLinesFromBuffer(buf, 1, 3, defaultTheme, 40, 36, borderConfigMap);
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it("skips border sides with style 'none'", () => {
      renderer.attach(canvas);

      const buf = buildBuf([
        [0, 0, 0, 0, 100, 40],
        [1, 0, 0, 40, 100, 36],
      ]);

      const noneTheme = { ...defaultTheme, borderStyle: "none" as const, borderWidth: 0 };
      const borderConfigMap = new Map();
      borderConfigMap.set(1, {
        top: { width: 1, color: "#f00", style: "none" },
        right: { width: 0, color: "#0f0", style: "solid" },
      });

      renderer.drawGridLinesFromBuffer(buf, 1, 2, noneTheme, 40, 36, borderConfigMap);
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

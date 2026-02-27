import { describe, expect, it, mock } from "bun:test";
import {
  CellRendererRegistry,
  createCellRendererRegistry,
  textCellRenderer,
  badgeCellRenderer,
  stubCellRenderer,
  flexCellRenderer,
} from "../cell-renderer";
import type { CellRenderer, CellRenderContext } from "../cell-renderer";
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
  fontFamily: "system-ui, sans-serif",
};

/** Stride 16 buffer helper. */
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

function makeContext(overrides?: Partial<CellRenderContext>): CellRenderContext {
  const buf = buildBuf([[0, 0, 10, 40, 200, 36]]);
  return {
    ctx: mockCtx(),
    buf,
    cellIdx: 0,
    theme: defaultTheme,
    ...overrides,
  };
}

// ── Registry tests ─────────────────────────────────────────────────────

describe("CellRendererRegistry", () => {
  it("register and get a renderer", () => {
    const registry = new CellRendererRegistry();
    const renderer: CellRenderer<{ type: "test" }> = { type: "test", draw: mock(() => {}) };
    registry.register(renderer);
    expect(registry.get("test")).toBe(renderer);
  });

  it("returns undefined for unknown type", () => {
    const registry = new CellRendererRegistry();
    expect(registry.get("nonexistent")).toBeUndefined();
  });

  it("overrides renderer with same type", () => {
    const registry = new CellRendererRegistry();
    const first: CellRenderer = { type: "text", draw: mock(() => {}) };
    const second: CellRenderer = { type: "text", draw: mock(() => {}) };
    registry.register(first);
    registry.register(second);
    expect(registry.get("text")).toBe(second);
  });

  it("tracks size correctly", () => {
    const registry = new CellRendererRegistry();
    expect(registry.size).toBe(0);
    registry.register({ type: "a", draw: mock(() => {}) });
    expect(registry.size).toBe(1);
    registry.register({ type: "b", draw: mock(() => {}) });
    expect(registry.size).toBe(2);
    // Override doesn't increase size
    registry.register({ type: "a", draw: mock(() => {}) });
    expect(registry.size).toBe(2);
  });
});

describe("createCellRendererRegistry", () => {
  it("creates registry with 4 built-in renderers", () => {
    const registry = createCellRendererRegistry();
    expect(registry.size).toBe(4);
    expect(registry.get("text")).toBe(textCellRenderer);
    expect(registry.get("badge")).toBe(badgeCellRenderer);
    expect(registry.get("stub")).toBe(stubCellRenderer);
    expect(registry.get("flex")).toBe(flexCellRenderer);
  });

  it("merges user renderers on top of built-ins", () => {
    const custom: CellRenderer<{ type: "progress" }> = { type: "progress", draw: mock(() => {}) };
    const registry = createCellRendererRegistry([custom]);
    expect(registry.size).toBe(5);
    expect(registry.get("progress")).toBe(custom);
    // Built-ins still present
    expect(registry.get("text")).toBe(textCellRenderer);
  });

  it("user renderer overrides built-in with same type", () => {
    const customText: CellRenderer = { type: "text", draw: mock(() => {}) };
    const registry = createCellRendererRegistry([customText]);
    expect(registry.size).toBe(4);
    expect(registry.get("text")).toBe(customText);
    expect(registry.get("text")).not.toBe(textCellRenderer);
  });

  it("handles empty user renderers array", () => {
    const registry = createCellRendererRegistry([]);
    expect(registry.size).toBe(4);
  });
});

// ── Built-in renderer tests ────────────────────────────────────────────

describe("textCellRenderer", () => {
  it("has type 'text'", () => {
    expect(textCellRenderer.type).toBe("text");
  });

  it("calls fillText with instruction value", () => {
    const context = makeContext();
    textCellRenderer.draw({ type: "text", value: "Hello" }, context);
    expect(context.ctx.fillText).toHaveBeenCalledTimes(1);
    expect((context.ctx.fillText as any).mock.calls[0][0]).toBe("Hello");
  });

  it("uses theme cellColor as fallback", () => {
    const context = makeContext();
    textCellRenderer.draw({ type: "text", value: "X" }, context);
    expect(context.ctx.fillStyle).toBe(defaultTheme.cellColor);
  });

  it("applies instruction style overrides", () => {
    const context = makeContext();
    textCellRenderer.draw(
      { type: "text", value: "X", style: { color: "red", fontWeight: "bold", fontSize: 20 } },
      context,
    );
    expect(context.ctx.fillStyle).toBe("red");
    expect(context.ctx.font).toContain("bold");
    expect(context.ctx.font).toContain("20px");
  });
});

describe("badgeCellRenderer", () => {
  it("has type 'badge'", () => {
    expect(badgeCellRenderer.type).toBe("badge");
  });

  it("draws badge with roundRect", () => {
    const context = makeContext();
    badgeCellRenderer.draw(
      { type: "badge", value: "Active", style: { backgroundColor: "#4caf50", color: "#fff" } },
      context,
    );
    expect(context.ctx.beginPath).toHaveBeenCalled();
    expect(context.ctx.roundRect).toHaveBeenCalled();
    expect(context.ctx.fill).toHaveBeenCalled();
    expect(context.ctx.fillText).toHaveBeenCalledTimes(1);
  });
});

describe("stubCellRenderer", () => {
  it("has type 'stub'", () => {
    expect(stubCellRenderer.type).toBe("stub");
  });

  it("renders [ComponentName] text", () => {
    const context = makeContext();
    stubCellRenderer.draw({ type: "stub", component: "Chart" }, context);
    const calls = (context.ctx.fillText as any).mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][0]).toBe("[Chart]");
  });

  it("uses #999 for stub color", () => {
    const context = makeContext();
    stubCellRenderer.draw({ type: "stub", component: "Test" }, context);
    expect(context.ctx.fillStyle).toBe("#999");
  });
});

describe("flexCellRenderer", () => {
  it("has type 'flex'", () => {
    expect(flexCellRenderer.type).toBe("flex");
  });

  it("renders first child text", () => {
    const context = makeContext();
    flexCellRenderer.draw(
      { type: "flex", children: [{ type: "text", value: "Flex text" }] },
      context,
    );
    const calls = (context.ctx.fillText as any).mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][0]).toBe("Flex text");
  });

  it("renders first child badge", () => {
    const context = makeContext();
    flexCellRenderer.draw(
      {
        type: "flex",
        children: [{ type: "badge", value: "OK", style: { backgroundColor: "#0f0" } }],
      },
      context,
    );
    expect(context.ctx.roundRect).toHaveBeenCalled();
  });

  it("does nothing with empty children", () => {
    const context = makeContext();
    flexCellRenderer.draw({ type: "flex", children: [] }, context);
    expect(context.ctx.fillText).not.toHaveBeenCalled();
    expect(context.ctx.roundRect).not.toHaveBeenCalled();
  });

  it("ignores non-text/badge first child", () => {
    const context = makeContext();
    flexCellRenderer.draw(
      { type: "flex", children: [{ type: "stub", component: "X" } as RenderInstruction] },
      context,
    );
    // stub child is not handled by flex renderer — no text or badge drawn
    expect(context.ctx.fillText).not.toHaveBeenCalled();
  });
});

// ── Custom renderer dispatch ───────────────────────────────────────────

describe("custom renderer dispatch", () => {
  it("dispatches to registered custom renderer", () => {
    const drawFn = mock(() => {});
    const customRenderer: CellRenderer<{ type: "progress" }> = { type: "progress", draw: drawFn };
    const registry = createCellRendererRegistry([customRenderer]);

    const renderer = registry.get("progress");
    expect(renderer).toBeDefined();
    if (!renderer) return;

    const context = makeContext();
    renderer.draw({ type: "progress" }, context);
    expect(drawFn).toHaveBeenCalledTimes(1);
    expect(drawFn).toHaveBeenCalledWith(expect.anything(), context);
  });
});

import { describe, expect, it, mock } from "bun:test";
import {
  CellRendererRegistry,
  createCellRendererRegistry,
  textCellRenderer,
  badgeCellRenderer,
  sparklineCellRenderer,
  stubCellRenderer,
  boxCellRenderer,
  flexCellRenderer,
  stackCellRenderer,
  imageCellRenderer,
} from "../components";
import type { CellRenderer, CellRenderContext } from "../components";
import type { Theme, RenderInstruction } from "../../types";

const defaultTheme: Theme = {
  headerBackground: "#f5f5f5",
  headerColor: "#333",
  headerFontSize: 13,
  cellBackground: "#fff",
  cellColor: "#333",
  fontSize: 13,
  borderColor: "#e0e0e0",
  borderWidth: 0.5,
  borderStyle: "solid",
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
    rect: mock(() => {}),
    fill: mock(() => {}),
    save: mock(() => {}),
    restore: mock(() => {}),
    clip: mock(() => {}),
    drawImage: mock(() => {}),
  } as unknown as CanvasRenderingContext2D;
}

function makeContext(overrides?: Partial<CellRenderContext>): CellRenderContext {
  const buf = buildBuf([[0, 0, 10, 40, 200, 36]]);
  return {
    ctx: mockCtx(),
    buf,
    cellIdx: 0,
    theme: defaultTheme,
    registry: createCellRendererRegistry(),
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
  it("creates registry with 13 built-in renderers", () => {
    const registry = createCellRendererRegistry();
    expect(registry.size).toBe(13);
    expect(registry.get("text")).toBe(textCellRenderer);
    expect(registry.get("badge")).toBe(badgeCellRenderer);
    expect(registry.get("sparkline")).toBe(sparklineCellRenderer);
    expect(registry.get("stub")).toBe(stubCellRenderer);
    expect(registry.get("flex")).toBe(flexCellRenderer);
    expect(registry.get("stack")).toBe(stackCellRenderer);
  });

  it("merges user renderers on top of built-ins", () => {
    const custom: CellRenderer<{ type: "progress" }> = { type: "progress", draw: mock(() => {}) };
    const registry = createCellRendererRegistry([custom]);
    expect(registry.size).toBe(14);
    expect(registry.get("progress")).toBe(custom);
    // Built-ins still present
    expect(registry.get("text")).toBe(textCellRenderer);
  });

  it("user renderer overrides built-in with same type", () => {
    const customText: CellRenderer = { type: "text", draw: mock(() => {}) };
    const registry = createCellRendererRegistry([customText]);
    expect(registry.size).toBe(13);
    expect(registry.get("text")).toBe(customText);
    expect(registry.get("text")).not.toBe(textCellRenderer);
  });

  it("handles empty user renderers array", () => {
    const registry = createCellRendererRegistry([]);
    expect(registry.size).toBe(13);
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

describe("boxCellRenderer", () => {
  it("has type 'box'", () => {
    expect(boxCellRenderer.type).toBe("box");
  });

  it("draws background and border then child text", () => {
    const context = makeContext();
    boxCellRenderer.draw(
      {
        type: "box",
        padding: 8,
        borderWidth: 1,
        borderColor: "#ccc",
        backgroundColor: "#f5f5f5",
        children: [{ type: "text", value: "inside" }],
      },
      context,
    );
    expect(context.ctx.fillRect).toHaveBeenCalled();
    expect(context.ctx.fillText).toHaveBeenCalledWith(
      "inside",
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("does nothing with empty children", () => {
    const context = makeContext();
    boxCellRenderer.draw({ type: "box", padding: 4, children: [] }, context);
    expect(context.ctx.fillText).not.toHaveBeenCalled();
  });

  it("draws multiple children in vertical stack", () => {
    const context = makeContext();
    boxCellRenderer.draw(
      {
        type: "box",
        padding: 4,
        children: [
          { type: "text", value: "A" },
          { type: "text", value: "B" },
        ],
      },
      context,
    );
    expect(context.ctx.fillText).toHaveBeenCalledTimes(2);
    const calls = (context.ctx.fillText as any).mock.calls;
    expect(calls[0][0]).toBe("A");
    expect(calls[1][0]).toBe("B");
  });

  it("draws nested Flex as child", () => {
    const context = makeContext();
    boxCellRenderer.draw(
      {
        type: "box",
        padding: 4,
        children: [
          {
            type: "flex",
            children: [{ type: "text", value: "Flex child" }],
          } as RenderInstruction,
        ],
      },
      context,
    );
    expect(context.ctx.fillText).toHaveBeenCalledWith(
      "Flex child",
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("draws border only when no backgroundColor", () => {
    const context = makeContext();
    boxCellRenderer.draw(
      {
        type: "box",
        padding: 0,
        borderWidth: 2,
        borderColor: "#333",
        children: [],
      },
      context,
    );
    expect(context.ctx.fillRect).toHaveBeenCalled();
    expect(context.ctx.fillText).not.toHaveBeenCalled();
  });

  it("applies padding shorthand [top, right, bottom, left]", () => {
    const context = makeContext();
    boxCellRenderer.draw(
      {
        type: "box",
        padding: [2, 4, 2, 4],
        children: [{ type: "text", value: "padded" }],
      },
      context,
    );
    expect(context.ctx.fillText).toHaveBeenCalledWith(
      "padded",
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    );
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
    // stub child is drawn as [X] placeholder
    expect(context.ctx.fillText).toHaveBeenCalledWith(
      "[X]",
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    );
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

// ── WASM composite layout path ────────────────────────────────────────

/** Mock computeChildLayout that returns children stacked in a row with no gap. */
function mockComputeChildLayout(input: Float32Array): Float32Array {
  const childCount = input[10]!;
  const result = new Float32Array(childCount * 4);
  let x = 0;
  for (let i = 0; i < childCount; i++) {
    const w = input[11 + i * 2]!;
    const h = input[11 + i * 2 + 1]!;
    result[i * 4] = x; // x
    result[i * 4 + 1] = 0; // y
    result[i * 4 + 2] = w; // width
    result[i * 4 + 3] = h; // height
    x += w;
  }
  return result;
}

describe("flexCellRenderer with WASM path", () => {
  it("uses computeChildLayout when provided", () => {
    const computeFn = mock(mockComputeChildLayout);
    const context = makeContext({ computeChildLayout: computeFn });
    flexCellRenderer.draw({ type: "flex", children: [{ type: "text", value: "A" }] }, context);
    expect(computeFn).toHaveBeenCalledTimes(1);
    expect(context.ctx.fillText).toHaveBeenCalledTimes(1);
  });

  it("falls back to JS layout when computeChildLayout is undefined", () => {
    const context = makeContext();
    flexCellRenderer.draw({ type: "flex", children: [{ type: "text", value: "A" }] }, context);
    expect(context.ctx.fillText).toHaveBeenCalledTimes(1);
  });

  it("passes correct input encoding to computeChildLayout", () => {
    let capturedInput: Float32Array | null = null;
    const computeFn = mock((input: Float32Array) => {
      capturedInput = new Float32Array(input);
      return mockComputeChildLayout(input);
    });
    const context = makeContext({ computeChildLayout: computeFn });
    flexCellRenderer.draw(
      {
        type: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "center",
        justifyContent: "end",
        children: [{ type: "text", value: "A" }],
      },
      context,
    );
    expect(capturedInput).not.toBeNull();
    // flexDirection=column → 1
    expect(capturedInput![2]).toBe(1);
    // gap=8
    expect(capturedInput![3]).toBe(8);
    // alignItems=center → 2
    expect(capturedInput![4]).toBe(2);
    // justifyContent=end → 1
    expect(capturedInput![5]).toBe(1);
    // childCount=1
    expect(capturedInput![10]).toBe(1);
  });
});

describe("boxCellRenderer with WASM path", () => {
  it("uses computeChildLayout when provided", () => {
    const computeFn = mock(mockComputeChildLayout);
    const context = makeContext({ computeChildLayout: computeFn });
    boxCellRenderer.draw(
      {
        type: "box",
        padding: 4,
        children: [{ type: "text", value: "inside" }],
      },
      context,
    );
    expect(computeFn).toHaveBeenCalledTimes(1);
    expect(context.ctx.fillText).toHaveBeenCalledTimes(1);
  });

  it("falls back to JS layout without computeChildLayout", () => {
    const context = makeContext();
    boxCellRenderer.draw(
      {
        type: "box",
        padding: 4,
        children: [{ type: "text", value: "inside" }],
      },
      context,
    );
    expect(context.ctx.fillText).toHaveBeenCalledTimes(1);
  });

  it("propagates computeChildLayout to nested children", () => {
    const computeFn = mock(mockComputeChildLayout);
    const context = makeContext({ computeChildLayout: computeFn });
    boxCellRenderer.draw(
      {
        type: "box",
        padding: 4,
        children: [
          {
            type: "flex",
            children: [{ type: "text", value: "Nested" }],
          } as RenderInstruction,
        ],
      },
      context,
    );
    // computeChildLayout called twice: once for box, once for nested flex
    expect(computeFn).toHaveBeenCalledTimes(2);
    expect(context.ctx.fillText).toHaveBeenCalledTimes(1);
  });
});

// ── imageCellRenderer tests ────────────────────────────────────────────

import { _getImageCache } from "../components/image";
import type { ImageCacheEntry, ImageLike } from "../components/image";

function mockImageLike(overrides?: Partial<ImageLike>): ImageLike {
  return {
    src: "",
    crossOrigin: null,
    naturalWidth: 100,
    naturalHeight: 80,
    onload: null,
    onerror: null,
    ...overrides,
  };
}

function seedImageCache(src: string, entry: Partial<ImageCacheEntry>): void {
  const cache = _getImageCache();
  cache.set(src, {
    img: mockImageLike(),
    loaded: false,
    error: false,
    ...entry,
  });
}

describe("imageCellRenderer", () => {
  it("has type 'image'", () => {
    expect(imageCellRenderer.type).toBe("image");
  });

  it("is registered in default registry", () => {
    const registry = createCellRendererRegistry();
    expect(registry.get("image")).toBe(imageCellRenderer);
  });

  it("draws nothing when image is not yet loaded", () => {
    seedImageCache("test://loading.png", { loaded: false, error: false });
    const context = makeContext();
    imageCellRenderer.draw(
      { type: "image", src: "test://loading.png" },
      context,
    );
    expect(context.ctx.drawImage).not.toHaveBeenCalled();
    expect(context.ctx.fillText).not.toHaveBeenCalled();
  });

  it("draws image when loaded", () => {
    seedImageCache("test://loaded.png", {
      img: mockImageLike({ naturalWidth: 200, naturalHeight: 150 }),
      loaded: true,
      error: false,
    });
    const context = makeContext();
    imageCellRenderer.draw(
      { type: "image", src: "test://loaded.png" },
      context,
    );
    expect(context.ctx.save).toHaveBeenCalled();
    expect(context.ctx.drawImage).toHaveBeenCalledTimes(1);
    expect(context.ctx.restore).toHaveBeenCalled();
  });

  it("renders alt text on error", () => {
    seedImageCache("test://error.png", { loaded: false, error: true });
    const context = makeContext();
    imageCellRenderer.draw(
      { type: "image", src: "test://error.png", alt: "Broken image" },
      context,
    );
    expect(context.ctx.drawImage).not.toHaveBeenCalled();
    expect(context.ctx.fillText).toHaveBeenCalledTimes(1);
    expect((context.ctx.fillText as any).mock.calls[0][0]).toBe("Broken image");
  });

  it("does nothing on error without alt", () => {
    seedImageCache("test://error-noalt.png", { loaded: false, error: true });
    const context = makeContext();
    imageCellRenderer.draw(
      { type: "image", src: "test://error-noalt.png" },
      context,
    );
    expect(context.ctx.drawImage).not.toHaveBeenCalled();
    expect(context.ctx.fillText).not.toHaveBeenCalled();
  });

  it("applies borderRadius clipping", () => {
    seedImageCache("test://radius.png", {
      img: mockImageLike({ naturalWidth: 100, naturalHeight: 100 }),
      loaded: true,
    });
    const context = makeContext();
    imageCellRenderer.draw(
      { type: "image", src: "test://radius.png", style: { borderRadius: 8 } },
      context,
    );
    expect(context.ctx.beginPath).toHaveBeenCalled();
    expect(context.ctx.roundRect).toHaveBeenCalled();
    expect(context.ctx.clip).toHaveBeenCalled();
    expect(context.ctx.drawImage).toHaveBeenCalledTimes(1);
  });

  it("applies opacity", () => {
    seedImageCache("test://opacity.png", {
      img: mockImageLike({ naturalWidth: 50, naturalHeight: 50 }),
      loaded: true,
    });
    const context = makeContext();
    imageCellRenderer.draw(
      { type: "image", src: "test://opacity.png", style: { opacity: 0.5 } },
      context,
    );
    expect((context.ctx as any).globalAlpha).toBe(0.5);
    expect(context.ctx.drawImage).toHaveBeenCalledTimes(1);
  });

  it("clips to content box with rect when borderRadius is 0", () => {
    seedImageCache("test://clip-rect.png", {
      img: mockImageLike({ naturalWidth: 400, naturalHeight: 400 }),
      loaded: true,
    });
    const context = makeContext();
    imageCellRenderer.draw(
      { type: "image", src: "test://clip-rect.png", style: { objectFit: "cover" } },
      context,
    );
    expect(context.ctx.beginPath).toHaveBeenCalled();
    expect(context.ctx.rect).toHaveBeenCalled();
    expect(context.ctx.roundRect).not.toHaveBeenCalled();
    expect(context.ctx.clip).toHaveBeenCalled();
    expect(context.ctx.drawImage).toHaveBeenCalledTimes(1);
  });

  it("uses fill mode by default (stretches to content box)", () => {
    seedImageCache("test://fill.png", {
      img: mockImageLike({ naturalWidth: 100, naturalHeight: 50 }),
      loaded: true,
    });
    const context = makeContext();
    imageCellRenderer.draw(
      { type: "image", src: "test://fill.png" },
      context,
    );
    // default objectFit is "fill" — drawImage with content box dimensions
    const drawCalls = (context.ctx.drawImage as any).mock.calls;
    expect(drawCalls).toHaveLength(1);
    // dw = contentW (200), dh = contentH (36) for fill mode
    const [, , , dw, dh] = drawCalls[0];
    expect(dw).toBe(200);
    expect(dh).toBe(36);
  });

  it("contain mode preserves aspect ratio within content box", () => {
    seedImageCache("test://contain.png", {
      img: mockImageLike({ naturalWidth: 200, naturalHeight: 100 }),
      loaded: true,
    });
    const context = makeContext();
    imageCellRenderer.draw(
      { type: "image", src: "test://contain.png", style: { objectFit: "contain" } },
      context,
    );
    const drawCalls = (context.ctx.drawImage as any).mock.calls;
    expect(drawCalls).toHaveLength(1);
    const [, , , dw, dh] = drawCalls[0];
    // contentW=200, contentH=36, natural 200x100
    // scaleX=1, scaleY=0.36, min=0.36 → dw=72, dh=36
    expect(dw).toBeCloseTo(72, 0);
    expect(dh).toBeCloseTo(36, 0);
  });

  it("cover mode fills content box preserving aspect ratio", () => {
    seedImageCache("test://cover.png", {
      img: mockImageLike({ naturalWidth: 200, naturalHeight: 100 }),
      loaded: true,
    });
    const context = makeContext();
    imageCellRenderer.draw(
      { type: "image", src: "test://cover.png", style: { objectFit: "cover" } },
      context,
    );
    const drawCalls = (context.ctx.drawImage as any).mock.calls;
    expect(drawCalls).toHaveLength(1);
    const [, , , dw, dh] = drawCalls[0];
    // scaleX=1, scaleY=0.36, max=1 → dw=200, dh=100
    expect(dw).toBeCloseTo(200, 0);
    expect(dh).toBeCloseTo(100, 0);
  });

  it("none mode draws at natural size centered", () => {
    seedImageCache("test://none.png", {
      img: mockImageLike({ naturalWidth: 80, naturalHeight: 20 }),
      loaded: true,
    });
    const context = makeContext();
    imageCellRenderer.draw(
      { type: "image", src: "test://none.png", style: { objectFit: "none" } },
      context,
    );
    const drawCalls = (context.ctx.drawImage as any).mock.calls;
    expect(drawCalls).toHaveLength(1);
    const [, , , dw, dh] = drawCalls[0];
    expect(dw).toBe(80);
    expect(dh).toBe(20);
  });

  it("does not call drawImage when naturalWidth is 0", () => {
    seedImageCache("test://zero-natural.png", {
      img: mockImageLike({ naturalWidth: 0, naturalHeight: 0 }),
      loaded: true,
    });
    const context = makeContext();
    imageCellRenderer.draw(
      { type: "image", src: "test://zero-natural.png" },
      context,
    );
    expect(context.ctx.drawImage).not.toHaveBeenCalled();
  });

  it("does not modify globalAlpha when opacity is 1", () => {
    seedImageCache("test://full-opacity.png", {
      img: mockImageLike({ naturalWidth: 50, naturalHeight: 50 }),
      loaded: true,
    });
    const context = makeContext();
    imageCellRenderer.draw(
      { type: "image", src: "test://full-opacity.png" },
      context,
    );
    // globalAlpha should remain at default (1)
    expect((context.ctx as any).globalAlpha).toBe(1);
  });
});

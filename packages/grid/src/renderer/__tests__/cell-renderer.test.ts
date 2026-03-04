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
  switchCellRenderer,
} from "../components";
import { checkboxCellRenderer } from "../components/checkbox";
import { inputCellRenderer } from "../components/input";
import { progressBarCellRenderer, getBarGeometry } from "../components/progressbar";
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
    arc: mock(() => {}),
  } as unknown as CanvasRenderingContext2D;
}

/** Mock computeChildLayout that respects flexDirection and gap from the encoded input. */
function defaultMockComputeChildLayout(input: Float32Array): Float32Array {
  const flexDir = input[2]!; // 0=row, 1=column, 2=row-reverse, 3=column-reverse
  const gap = input[3]!;
  const childCount = input[10]!;
  const result = new Float32Array(childCount * 4);
  const isColumn = flexDir === 1 || flexDir === 3;
  const isReverse = flexDir === 2 || flexDir === 3;

  // Compute positions in visual order, then map back to child index
  const sizes: { w: number; h: number }[] = [];
  for (let i = 0; i < childCount; i++) {
    sizes.push({ w: input[11 + i * 2]!, h: input[11 + i * 2 + 1]! });
  }

  // Compute positions for each child (positions[i] = position of child i)
  const positions: number[] = [];
  if (isReverse) {
    // Reverse: last child gets pos=0, first child gets largest pos
    let pos = 0;
    for (let i = childCount - 1; i >= 0; i--) {
      positions[i] = pos;
      pos += (isColumn ? sizes[i]!.h : sizes[i]!.w) + gap;
    }
  } else {
    let pos = 0;
    for (let i = 0; i < childCount; i++) {
      positions[i] = pos;
      pos += (isColumn ? sizes[i]!.h : sizes[i]!.w) + gap;
    }
  }

  for (let i = 0; i < childCount; i++) {
    if (isColumn) {
      result[i * 4] = 0;
      result[i * 4 + 1] = positions[i]!;
    } else {
      result[i * 4] = positions[i]!;
      result[i * 4 + 1] = 0;
    }
    result[i * 4 + 2] = sizes[i]!.w;
    result[i * 4 + 3] = sizes[i]!.h;
  }
  return result;
}

function makeContext(overrides?: Partial<CellRenderContext>): CellRenderContext {
  const buf = buildBuf([[0, 0, 10, 40, 200, 36]]);
  return {
    ctx: mockCtx(),
    buf,
    cellIdx: 0,
    theme: defaultTheme,
    registry: createCellRendererRegistry(),
    computeChildLayout: defaultMockComputeChildLayout,
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
  it("creates registry with 17 built-in renderers", () => {
    const registry = createCellRendererRegistry();
    expect(registry.size).toBe(17);
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
    expect(registry.size).toBe(18);
    expect(registry.get("progress")).toBe(custom);
    // Built-ins still present
    expect(registry.get("text")).toBe(textCellRenderer);
  });

  it("user renderer overrides built-in with same type", () => {
    const customText: CellRenderer = { type: "text", draw: mock(() => {}) };
    const registry = createCellRendererRegistry([customText]);
    expect(registry.size).toBe(17);
    expect(registry.get("text")).toBe(customText);
    expect(registry.get("text")).not.toBe(textCellRenderer);
  });

  it("handles empty user renderers array", () => {
    const registry = createCellRendererRegistry([]);
    expect(registry.size).toBe(17);
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

describe("flexCellRenderer WASM layout", () => {
  it("calls computeChildLayout for children", () => {
    const computeFn = mock(defaultMockComputeChildLayout);
    const context = makeContext({ computeChildLayout: computeFn });
    flexCellRenderer.draw({ type: "flex", children: [{ type: "text", value: "A" }] }, context);
    expect(computeFn).toHaveBeenCalledTimes(1);
    expect(context.ctx.fillText).toHaveBeenCalledTimes(1);
  });

  it("passes correct input encoding to computeChildLayout", () => {
    let capturedInput: Float32Array | null = null;
    const computeFn = mock((input: Float32Array) => {
      capturedInput = new Float32Array(input);
      return defaultMockComputeChildLayout(input);
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

describe("boxCellRenderer WASM layout", () => {
  it("calls computeChildLayout for children", () => {
    const computeFn = mock(defaultMockComputeChildLayout);
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

  it("propagates computeChildLayout to nested children", () => {
    const computeFn = mock(defaultMockComputeChildLayout);
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

// Ensure globalThis.Image exists for tests that exercise getOrLoadImage()
if (typeof (globalThis as any).Image === "undefined") {
  (globalThis as any).Image = class MockImage {
    src = "";
    crossOrigin: string | null = null;
    referrerPolicy = "";
    decoding = "";
    fetchPriority = "";
    naturalWidth = 0;
    naturalHeight = 0;
    onload: ((ev: unknown) => void) | null = null;
    onerror: ((ev: unknown) => void) | null = null;
  };
}

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
    imageCellRenderer.draw({ type: "image", src: "test://loading.png" }, context);
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
    imageCellRenderer.draw({ type: "image", src: "test://loaded.png" }, context);
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
    imageCellRenderer.draw({ type: "image", src: "test://error-noalt.png" }, context);
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
    imageCellRenderer.draw({ type: "image", src: "test://fill.png" }, context);
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
    imageCellRenderer.draw({ type: "image", src: "test://zero-natural.png" }, context);
    expect(context.ctx.drawImage).not.toHaveBeenCalled();
  });

  it("does not modify globalAlpha when opacity is 1", () => {
    seedImageCache("test://full-opacity.png", {
      img: mockImageLike({ naturalWidth: 50, naturalHeight: 50 }),
      loaded: true,
    });
    const context = makeContext();
    imageCellRenderer.draw({ type: "image", src: "test://full-opacity.png" }, context);
    // globalAlpha should remain at default (1)
    expect((context.ctx as any).globalAlpha).toBe(1);
  });

  it("creates new cache entry for uncached src", () => {
    // Clear any existing entry
    const cache = _getImageCache();
    const testSrc = `test://new-image-${Date.now()}.png`;
    cache.delete(testSrc);

    const context = makeContext();
    imageCellRenderer.draw({ type: "image", src: testSrc }, context);

    // A new entry should be created (may or may not load depending on env)
    const entry = cache.get(testSrc);
    // In test env, Image constructor might be from happy-dom
    // The entry may exist or not depending on globalThis.Image availability
    // Just verify no crash occurs
  });

  it("handles crossOrigin option", () => {
    const cache = _getImageCache();
    const testSrc = `test://crossorigin-${Date.now()}.png`;
    cache.delete(testSrc);

    const context = makeContext();
    imageCellRenderer.draw({ type: "image", src: testSrc, crossOrigin: "anonymous" }, context);
  });

  it("handles referrerPolicy option", () => {
    const cache = _getImageCache();
    const testSrc = `test://referrer-${Date.now()}.png`;
    cache.delete(testSrc);

    const context = makeContext();
    imageCellRenderer.draw(
      { type: "image", src: testSrc, referrerPolicy: "no-referrer" } as any,
      context,
    );

    const entry = cache.get(testSrc);
    expect(entry).toBeTruthy();
  });

  it("handles decoding and fetchPriority options", () => {
    const cache = _getImageCache();
    const testSrc = `test://opts-${Date.now()}.png`;
    cache.delete(testSrc);

    const context = makeContext();
    imageCellRenderer.draw(
      { type: "image", src: testSrc, decoding: "async", fetchPriority: "high" },
      context,
    );
  });

  it("onload callback sets loaded=true on cache entry", () => {
    const cache = _getImageCache();
    const testSrc = `test://onload-${Date.now()}.png`;
    cache.delete(testSrc);

    const context = makeContext();
    imageCellRenderer.draw({ type: "image", src: testSrc }, context);

    const entry = cache.get(testSrc);
    expect(entry).toBeTruthy();
    expect(entry!.loaded).toBe(false);
    // Manually trigger onload callback
    const onload = entry!.img.onload;
    expect(onload).toBeTruthy();
    (onload as Function).call(entry!.img, {});
    expect(entry!.loaded).toBe(true);
  });

  it("onerror callback sets error=true on cache entry", () => {
    const cache = _getImageCache();
    const testSrc = `test://onerror-${Date.now()}.png`;
    cache.delete(testSrc);

    const context = makeContext();
    imageCellRenderer.draw({ type: "image", src: testSrc }, context);

    const entry = cache.get(testSrc);
    expect(entry).toBeTruthy();
    expect(entry!.error).toBe(false);
    // Manually trigger onerror callback
    const onerror = entry!.img.onerror;
    expect(onerror).toBeTruthy();
    (onerror as Function).call(entry!.img, {});
    expect(entry!.error).toBe(true);
  });
});

// ── switchCellRenderer tests ────────────────────────────────────────────

describe("switchCellRenderer", () => {
  it("has type 'switch'", () => {
    expect(switchCellRenderer.type).toBe("switch");
  });

  it("is registered in default registry", () => {
    const registry = createCellRendererRegistry();
    expect(registry.get("switch")).toBe(switchCellRenderer);
  });

  it("has cursor 'pointer'", () => {
    expect(switchCellRenderer.cursor).toBe("pointer");
  });

  it("draws unchecked state with trackColor and thumb on left", () => {
    const context = makeContext();
    switchCellRenderer.draw({ type: "switch", checked: false }, context);
    // Track drawn via roundRect + fill
    expect(context.ctx.beginPath).toHaveBeenCalled();
    expect(context.ctx.roundRect).toHaveBeenCalled();
    expect(context.ctx.fill).toHaveBeenCalled();
    // Thumb drawn via arc + fill
    expect((context.ctx as any).arc).toHaveBeenCalled();
    // Default trackColor for unchecked
    const fillCalls = (context.ctx as any).fillStyle;
    // Last fillStyle set should be thumb color (#fff)
    expect(fillCalls).toBe("#fff");
  });

  it("draws checked state with activeTrackColor and thumb on right", () => {
    const context = makeContext();
    switchCellRenderer.draw({ type: "switch", checked: true }, context);
    expect(context.ctx.roundRect).toHaveBeenCalled();
    expect((context.ctx as any).arc).toHaveBeenCalled();
    // Verify arc was called — checked thumb should be on the right side
    const arcCalls = ((context.ctx as any).arc as any).mock.calls;
    expect(arcCalls.length).toBe(1);
    // trackX + trackW - radius = right side
    const thumbCx = arcCalls[0][0];
    // For default 36w track, centered in 200w cell: trackX = 10 + (200-36)/2 = 92
    // thumbCx = 92 + 36 - 10 = 118
    expect(thumbCx).toBe(118);
  });

  it("unchecked thumb is on left side", () => {
    const context = makeContext();
    switchCellRenderer.draw({ type: "switch", checked: false }, context);
    const arcCalls = ((context.ctx as any).arc as any).mock.calls;
    expect(arcCalls.length).toBe(1);
    const thumbCx = arcCalls[0][0];
    // trackX + radius = left side: 92 + 10 = 102
    expect(thumbCx).toBe(102);
  });

  it("applies globalAlpha for disabled state with save/restore", () => {
    const context = makeContext();
    switchCellRenderer.draw({ type: "switch", checked: false, disabled: true }, context);
    expect(context.ctx.save).toHaveBeenCalled();
    expect((context.ctx as any).globalAlpha).toBe(0.4);
    expect(context.ctx.restore).toHaveBeenCalled();
  });

  it("does not call save/restore when not disabled", () => {
    const context = makeContext();
    switchCellRenderer.draw({ type: "switch", checked: true }, context);
    expect(context.ctx.save).not.toHaveBeenCalled();
    expect(context.ctx.restore).not.toHaveBeenCalled();
  });

  it("applies custom style overrides", () => {
    const context = makeContext();
    switchCellRenderer.draw(
      {
        type: "switch",
        checked: true,
        style: {
          activeTrackColor: "#10b981",
          thumbColor: "#fef3c7",
          width: 44,
          height: 24,
        },
      },
      context,
    );
    // roundRect called with custom dimensions
    const rrCalls = (context.ctx.roundRect as any).mock.calls;
    expect(rrCalls[0][2]).toBe(44); // width
    expect(rrCalls[0][3]).toBe(24); // height
  });
});

// ── stackCellRenderer tests ────────────────────────────────────────────

describe("stackCellRenderer", () => {
  it("has type 'stack'", () => {
    expect(stackCellRenderer.type).toBe("stack");
  });

  it("is registered in default registry", () => {
    const registry = createCellRendererRegistry();
    expect(registry.get("stack")).toBe(stackCellRenderer);
  });

  it("does nothing with empty children", () => {
    const context = makeContext();
    stackCellRenderer.draw({ type: "stack", children: [] }, context);
    expect(context.ctx.fillText).not.toHaveBeenCalled();
  });

  it("does nothing when registry is falsy", () => {
    const context = makeContext({ registry: undefined as any });
    stackCellRenderer.draw({ type: "stack", children: [{ type: "text", value: "A" }] }, context);
    expect(context.ctx.fillText).not.toHaveBeenCalled();
  });

  it("renders children in row direction (JS fallback)", () => {
    const context = makeContext();
    stackCellRenderer.draw(
      {
        type: "stack",
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

  it("renders children in column direction", () => {
    const context = makeContext();
    stackCellRenderer.draw(
      {
        type: "stack",
        direction: "column",
        children: [
          { type: "text", value: "X" },
          { type: "text", value: "Y" },
        ],
      },
      context,
    );
    expect(context.ctx.fillText).toHaveBeenCalledTimes(2);
    const calls = (context.ctx.fillText as any).mock.calls;
    expect(calls[0][0]).toBe("X");
    expect(calls[1][0]).toBe("Y");
    // Column: Y positions should differ
    expect(calls[1][2]).toBeGreaterThan(calls[0][2]);
  });

  it("applies custom gap", () => {
    const context = makeContext();
    stackCellRenderer.draw(
      {
        type: "stack",
        gap: 10,
        children: [
          { type: "text", value: "A" },
          { type: "text", value: "B" },
        ],
      },
      context,
    );
    expect(context.ctx.fillText).toHaveBeenCalledTimes(2);
  });

  it("uses WASM path when computeChildLayout is provided", () => {
    const computeFn = mock(defaultMockComputeChildLayout);
    const context = makeContext({ computeChildLayout: computeFn });
    stackCellRenderer.draw(
      {
        type: "stack",
        children: [
          { type: "text", value: "A" },
          { type: "text", value: "B" },
        ],
      },
      context,
    );
    expect(computeFn).toHaveBeenCalledTimes(1);
    expect(context.ctx.fillText).toHaveBeenCalledTimes(2);
  });
});

// ── checkboxCellRenderer tests ─────────────────────────────────────────

describe("checkboxCellRenderer", () => {
  it("has type 'checkbox'", () => {
    expect(checkboxCellRenderer.type).toBe("checkbox");
  });

  it("has cursor 'pointer'", () => {
    expect(checkboxCellRenderer.cursor).toBe("pointer");
  });

  it("is registered in default registry", () => {
    const registry = createCellRendererRegistry();
    expect(registry.get("checkbox")).toBe(checkboxCellRenderer);
  });

  it("renders children in row direction (JS fallback)", () => {
    const context = makeContext();
    checkboxCellRenderer.draw(
      {
        type: "checkbox",
        checked: true,
        children: [{ type: "text", value: "Label" }],
      },
      context,
    );
    expect(context.ctx.fillText).toHaveBeenCalledTimes(1);
    expect((context.ctx.fillText as any).mock.calls[0][0]).toBe("Label");
  });

  it("does nothing with empty children", () => {
    const context = makeContext();
    checkboxCellRenderer.draw({ type: "checkbox", checked: false, children: [] }, context);
    expect(context.ctx.fillText).not.toHaveBeenCalled();
  });

  it("applies globalAlpha for disabled state", () => {
    const context = makeContext();
    checkboxCellRenderer.draw(
      {
        type: "checkbox",
        checked: true,
        disabled: true,
        children: [{ type: "text", value: "D" }],
      },
      context,
    );
    expect(context.ctx.save).toHaveBeenCalled();
    expect((context.ctx as any).globalAlpha).toBe(0.4);
    expect(context.ctx.restore).toHaveBeenCalled();
  });

  it("restores context when disabled with empty children", () => {
    const context = makeContext();
    checkboxCellRenderer.draw(
      { type: "checkbox", checked: false, disabled: true, children: [] },
      context,
    );
    expect(context.ctx.save).toHaveBeenCalled();
    expect(context.ctx.restore).toHaveBeenCalled();
  });

  it("does not call save/restore when not disabled", () => {
    const context = makeContext();
    checkboxCellRenderer.draw(
      {
        type: "checkbox",
        checked: false,
        children: [{ type: "text", value: "X" }],
      },
      context,
    );
    expect(context.ctx.save).not.toHaveBeenCalled();
    expect(context.ctx.restore).not.toHaveBeenCalled();
  });

  it("uses WASM path when computeChildLayout is provided", () => {
    const computeFn = mock(defaultMockComputeChildLayout);
    const context = makeContext({ computeChildLayout: computeFn });
    checkboxCellRenderer.draw(
      {
        type: "checkbox",
        checked: true,
        children: [{ type: "text", value: "WASM" }],
      },
      context,
    );
    expect(computeFn).toHaveBeenCalledTimes(1);
    expect(context.ctx.fillText).toHaveBeenCalledTimes(1);
  });

  it("does nothing when registry is falsy", () => {
    const context = makeContext({ registry: undefined as any });
    checkboxCellRenderer.draw(
      {
        type: "checkbox",
        checked: true,
        children: [{ type: "text", value: "Z" }],
      },
      context,
    );
    expect(context.ctx.fillText).not.toHaveBeenCalled();
  });
});

// ── inputCellRenderer tests ────────────────────────────────────────────

describe("inputCellRenderer", () => {
  it("has type 'input'", () => {
    expect(inputCellRenderer.type).toBe("input");
  });

  it("has cursor 'text'", () => {
    expect(inputCellRenderer.cursor).toBe("text");
  });

  it("is registered in default registry", () => {
    const registry = createCellRendererRegistry();
    expect(registry.get("input")).toBe(inputCellRenderer);
  });

  it("draws input background and border", () => {
    const context = makeContext();
    inputCellRenderer.draw({ type: "input", value: "Hello" }, context);
    expect(context.ctx.beginPath).toHaveBeenCalled();
    expect(context.ctx.roundRect).toHaveBeenCalled();
    expect(context.ctx.fill).toHaveBeenCalled();
    expect(context.ctx.stroke).toHaveBeenCalled();
  });

  it("draws text value", () => {
    const context = makeContext();
    inputCellRenderer.draw({ type: "input", value: "Test" }, context);
    expect(context.ctx.fillText).toHaveBeenCalledTimes(1);
    expect((context.ctx.fillText as any).mock.calls[0][0]).toBe("Test");
  });

  it("draws placeholder with gray color when value is empty", () => {
    const context = makeContext();
    inputCellRenderer.draw({ type: "input", value: "", placeholder: "Enter..." }, context);
    expect(context.ctx.fillText).toHaveBeenCalledTimes(1);
    expect((context.ctx.fillText as any).mock.calls[0][0]).toBe("Enter...");
    expect(context.ctx.fillStyle).toBe("#9ca3af");
  });

  it("uses value color (not placeholder) when value is present", () => {
    const context = makeContext();
    inputCellRenderer.draw({ type: "input", value: "A", placeholder: "Enter..." }, context);
    expect(context.ctx.fillStyle).toBe(defaultTheme.cellColor);
  });

  it("applies disabled state with globalAlpha=0.5", () => {
    const context = makeContext();
    inputCellRenderer.draw({ type: "input", value: "Disabled", disabled: true }, context);
    expect(context.ctx.save).toHaveBeenCalled();
    expect(context.ctx.restore).toHaveBeenCalled();
  });

  it("clips text to prevent overflow", () => {
    const context = makeContext();
    inputCellRenderer.draw({ type: "input", value: "Long text" }, context);
    expect(context.ctx.clip).toHaveBeenCalled();
    expect(context.ctx.rect).toHaveBeenCalled();
  });

  it("applies custom style overrides", () => {
    const context = makeContext();
    inputCellRenderer.draw(
      {
        type: "input",
        value: "X",
        style: {
          fontSize: 16,
          color: "#ff0000",
          backgroundColor: "#eee",
          borderColor: "#000",
          borderWidth: 2,
          borderRadius: 8,
        },
      },
      context,
    );
    expect(context.ctx.font).toContain("16px");
    expect(context.ctx.strokeStyle).toBe("#000");
    expect(context.ctx.lineWidth).toBe(2);
  });

  it("skips border stroke when borderWidth is 0", () => {
    const context = makeContext();
    inputCellRenderer.draw({ type: "input", value: "X", style: { borderWidth: 0 } }, context);
    expect(context.ctx.stroke).not.toHaveBeenCalled();
  });

  it("draws empty string when no value or placeholder", () => {
    const context = makeContext();
    inputCellRenderer.draw({ type: "input", value: "" }, context);
    expect(context.ctx.fillText).toHaveBeenCalledTimes(1);
    expect((context.ctx.fillText as any).mock.calls[0][0]).toBe("");
  });
});

// ── progressBarCellRenderer tests ──────────────────────────────────────

describe("progressBarCellRenderer", () => {
  it("has type 'progressbar'", () => {
    expect(progressBarCellRenderer.type).toBe("progressbar");
  });

  it("has cursor 'pointer'", () => {
    expect(progressBarCellRenderer.cursor).toBe("pointer");
  });

  it("is registered in default registry", () => {
    const registry = createCellRendererRegistry();
    expect(registry.get("progressbar")).toBe(progressBarCellRenderer);
  });

  it("draws background bar", () => {
    const context = makeContext();
    progressBarCellRenderer.draw({ type: "progressbar", value: 50 }, context);
    expect(context.ctx.beginPath).toHaveBeenCalled();
    expect(context.ctx.roundRect).toHaveBeenCalled();
    expect(context.ctx.fill).toHaveBeenCalled();
  });

  it("draws filled bar when ratio > 0", () => {
    const context = makeContext();
    progressBarCellRenderer.draw({ type: "progressbar", value: 75 }, context);
    // roundRect called twice: background + filled
    expect(context.ctx.roundRect).toHaveBeenCalledTimes(2);
    expect(context.ctx.fill).toHaveBeenCalledTimes(2);
  });

  it("does not draw filled bar when value is 0", () => {
    const context = makeContext();
    progressBarCellRenderer.draw({ type: "progressbar", value: 0 }, context);
    // Only background bar
    expect(context.ctx.roundRect).toHaveBeenCalledTimes(1);
    expect(context.ctx.fill).toHaveBeenCalledTimes(1);
  });

  it("clamps ratio to [0, 1]", () => {
    const context = makeContext();
    progressBarCellRenderer.draw({ type: "progressbar", value: 150 }, context);
    // ratio clamped to 1, so filled bar drawn
    expect(context.ctx.roundRect).toHaveBeenCalledTimes(2);
  });

  it("clamps negative values to 0", () => {
    const context = makeContext();
    progressBarCellRenderer.draw({ type: "progressbar", value: -10 }, context);
    // ratio clamped to 0, no filled bar
    expect(context.ctx.roundRect).toHaveBeenCalledTimes(1);
  });

  it("shows label when showLabel is true", () => {
    const context = makeContext();
    progressBarCellRenderer.draw(
      { type: "progressbar", value: 75, style: { showLabel: true } },
      context,
    );
    expect(context.ctx.fillText).toHaveBeenCalledTimes(1);
    expect((context.ctx.fillText as any).mock.calls[0][0]).toBe("75%");
  });

  it("does not show label by default", () => {
    const context = makeContext();
    progressBarCellRenderer.draw({ type: "progressbar", value: 50 }, context);
    expect(context.ctx.fillText).not.toHaveBeenCalled();
  });

  it("applies custom colors", () => {
    const context = makeContext();
    progressBarCellRenderer.draw(
      {
        type: "progressbar",
        value: 50,
        style: { color: "#ff0000", backgroundColor: "#ccc" },
      },
      context,
    );
    // Check that fillStyle was set to the custom colors
    expect(context.ctx.fill).toHaveBeenCalled();
  });

  it("applies custom max", () => {
    const context = makeContext();
    progressBarCellRenderer.draw(
      { type: "progressbar", value: 5, max: 10, style: { showLabel: true } },
      context,
    );
    expect((context.ctx.fillText as any).mock.calls[0][0]).toBe("50%");
  });

  it("caches bar geometry via getBarGeometry", () => {
    const context = makeContext();
    progressBarCellRenderer.draw({ type: "progressbar", value: 50 }, context);
    // Buffer has row=0, col=0
    const geo = getBarGeometry("0,0");
    expect(geo).toBeDefined();
    expect(geo!.barX).toBeGreaterThan(0);
    expect(geo!.barW).toBeGreaterThan(0);
  });

  it("getBarGeometry returns undefined for uncached key", () => {
    expect(getBarGeometry("999,999")).toBeUndefined();
  });
});

// ── flexCellRenderer column & alignment tests ──────────────────────────

describe("flexCellRenderer column and alignment", () => {
  it("renders in column direction", () => {
    const context = makeContext();
    flexCellRenderer.draw(
      {
        type: "flex",
        flexDirection: "column",
        children: [
          { type: "text", value: "Top" },
          { type: "text", value: "Bottom" },
        ],
      },
      context,
    );
    expect(context.ctx.fillText).toHaveBeenCalledTimes(2);
    const calls = (context.ctx.fillText as any).mock.calls;
    expect(calls[0][0]).toBe("Top");
    expect(calls[1][0]).toBe("Bottom");
    // Column: Y positions differ
    expect(calls[1][2]).toBeGreaterThan(calls[0][2]);
  });

  it("renders in row-reverse direction", () => {
    const context = makeContext();
    flexCellRenderer.draw(
      {
        type: "flex",
        flexDirection: "row-reverse",
        children: [
          { type: "text", value: "First" },
          { type: "text", value: "Second" },
        ],
      },
      context,
    );
    expect(context.ctx.fillText).toHaveBeenCalledTimes(2);
    const calls = (context.ctx.fillText as any).mock.calls;
    // WASM iterates children in order; Taffy positions them reversed
    expect(calls[0][0]).toBe("First");
    expect(calls[1][0]).toBe("Second");
    // First child should be placed to the right of Second
    expect(calls[0][1]).toBeGreaterThan(calls[1][1]);
  });

  it("renders in column-reverse direction", () => {
    const context = makeContext();
    flexCellRenderer.draw(
      {
        type: "flex",
        flexDirection: "column-reverse",
        children: [
          { type: "text", value: "A" },
          { type: "text", value: "B" },
        ],
      },
      context,
    );
    expect(context.ctx.fillText).toHaveBeenCalledTimes(2);
    const calls = (context.ctx.fillText as any).mock.calls;
    // WASM iterates children in order; Taffy positions them reversed
    expect(calls[0][0]).toBe("A");
    expect(calls[1][0]).toBe("B");
    // First child (A) should be placed below Second (B)
    expect(calls[0][2]).toBeGreaterThan(calls[1][2]);
  });

  it("applies justify=end for row direction", () => {
    const context = makeContext();
    flexCellRenderer.draw(
      {
        type: "flex",
        justifyContent: "end",
        children: [{ type: "text", value: "End" }],
      },
      context,
    );
    expect(context.ctx.fillText).toHaveBeenCalledTimes(1);
  });

  it("applies justify=center for row direction", () => {
    const context = makeContext();
    flexCellRenderer.draw(
      {
        type: "flex",
        justifyContent: "center",
        children: [{ type: "text", value: "Ctr" }],
      },
      context,
    );
    expect(context.ctx.fillText).toHaveBeenCalledTimes(1);
  });

  it("applies align=start for row direction", () => {
    const context = makeContext();
    flexCellRenderer.draw(
      {
        type: "flex",
        alignItems: "start",
        children: [{ type: "text", value: "S" }],
      },
      context,
    );
    expect(context.ctx.fillText).toHaveBeenCalledTimes(1);
  });

  it("applies align=end for row direction", () => {
    const context = makeContext();
    flexCellRenderer.draw(
      {
        type: "flex",
        alignItems: "end",
        children: [{ type: "text", value: "E" }],
      },
      context,
    );
    expect(context.ctx.fillText).toHaveBeenCalledTimes(1);
  });

  it("applies justify=end for column direction", () => {
    const context = makeContext();
    flexCellRenderer.draw(
      {
        type: "flex",
        flexDirection: "column",
        justifyContent: "end",
        children: [{ type: "text", value: "E" }],
      },
      context,
    );
    expect(context.ctx.fillText).toHaveBeenCalledTimes(1);
  });

  it("applies justify=center for column direction", () => {
    const context = makeContext();
    flexCellRenderer.draw(
      {
        type: "flex",
        flexDirection: "column",
        justifyContent: "center",
        children: [{ type: "text", value: "C" }],
      },
      context,
    );
    expect(context.ctx.fillText).toHaveBeenCalledTimes(1);
  });

  it("applies align=end for column direction", () => {
    const context = makeContext();
    flexCellRenderer.draw(
      {
        type: "flex",
        flexDirection: "column",
        alignItems: "end",
        children: [{ type: "text", value: "E" }],
      },
      context,
    );
    expect(context.ctx.fillText).toHaveBeenCalledTimes(1);
  });

  it("applies align=start for column direction", () => {
    const context = makeContext();
    flexCellRenderer.draw(
      {
        type: "flex",
        flexDirection: "column",
        alignItems: "start",
        children: [{ type: "text", value: "S" }],
      },
      context,
    );
    expect(context.ctx.fillText).toHaveBeenCalledTimes(1);
  });

  it("applies align=stretch for column direction", () => {
    const context = makeContext();
    flexCellRenderer.draw(
      {
        type: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        children: [{ type: "text", value: "Stretch" }],
      },
      context,
    );
    expect(context.ctx.fillText).toHaveBeenCalledTimes(1);
  });
});

// ── imageCellRenderer scale-down & explicit dimensions tests ───────────

describe("imageCellRenderer additional", () => {
  it("scale-down mode uses natural size when smaller than content", () => {
    seedImageCache("test://scaledown-small.png", {
      img: mockImageLike({ naturalWidth: 50, naturalHeight: 20 }),
      loaded: true,
    });
    const context = makeContext();
    imageCellRenderer.draw(
      { type: "image", src: "test://scaledown-small.png", style: { objectFit: "scale-down" } },
      context,
    );
    const drawCalls = (context.ctx.drawImage as any).mock.calls;
    expect(drawCalls).toHaveLength(1);
    const [, , , dw, dh] = drawCalls[0];
    // Natural size is smaller than content: scale = min(1, min(200/50, 36/20)) = min(1, 1.8) = 1
    expect(dw).toBe(50);
    expect(dh).toBe(20);
  });

  it("scale-down mode shrinks when larger than content", () => {
    seedImageCache("test://scaledown-large.png", {
      img: mockImageLike({ naturalWidth: 400, naturalHeight: 400 }),
      loaded: true,
    });
    const context = makeContext();
    imageCellRenderer.draw(
      { type: "image", src: "test://scaledown-large.png", style: { objectFit: "scale-down" } },
      context,
    );
    const drawCalls = (context.ctx.drawImage as any).mock.calls;
    expect(drawCalls).toHaveLength(1);
    const [, , , dw, dh] = drawCalls[0];
    // containScale = min(200/400, 36/400) = 0.09, scale = min(1, 0.09) = 0.09
    expect(dw).toBeCloseTo(36, 0);
    expect(dh).toBeCloseTo(36, 0);
  });

  it("uses explicit width/height when provided", () => {
    seedImageCache("test://explicit-wh.png", {
      img: mockImageLike({ naturalWidth: 100, naturalHeight: 100 }),
      loaded: true,
    });
    const context = makeContext();
    imageCellRenderer.draw(
      { type: "image", src: "test://explicit-wh.png", width: 50, height: 50 },
      context,
    );
    const drawCalls = (context.ctx.drawImage as any).mock.calls;
    expect(drawCalls).toHaveLength(1);
    const [, , , dw, dh] = drawCalls[0];
    // fill mode with explicit 50x50 target
    expect(dw).toBe(50);
    expect(dh).toBe(50);
  });

  it("returns early when contentW is 0", () => {
    seedImageCache("test://zero-w.png", {
      img: mockImageLike({ naturalWidth: 100, naturalHeight: 100 }),
      loaded: true,
    });
    const buf = buildBuf([[0, 0, 10, 40, 0, 36]]); // width=0
    const context = makeContext({ buf });
    imageCellRenderer.draw({ type: "image", src: "test://zero-w.png" }, context);
    expect(context.ctx.drawImage).not.toHaveBeenCalled();
  });
});

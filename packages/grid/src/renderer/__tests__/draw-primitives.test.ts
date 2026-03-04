import { describe, expect, it, mock } from "bun:test";
import {
  measureText,
  drawTextCellFromBuffer,
  drawBadgeFromBuffer,
  drawSparklineFromBuffer,
} from "../draw-primitives";
import { colorCellRenderer } from "../components/color";
import { tagCellRenderer } from "../components/tag";
import { ratingCellRenderer } from "../components/rating";
import { chipCellRenderer } from "../components/chip";
import { linkCellRenderer } from "../components/link";
import {
  lengthToPx,
  rectToPx,
  measureInstructionWidth,
  measureInstructionHeight,
  makeSubCellBuf,
  encodeCompositeInput,
  FLEX_CHILD_HEIGHT,
  BADGE_PADDING,
} from "../components/shared";
import { DEFAULT_THEME } from "../../types";

const noopLayout = (_input: Float32Array) => new Float32Array(0);

/** Create a mock CanvasRenderingContext2D with spies. */
function mockCtx() {
  return {
    font: "",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    globalAlpha: 1,
    textBaseline: "",
    textAlign: "",
    measureText: mock((text: string) => ({ width: text.length * 8 })),
    fillText: mock(() => {}),
    beginPath: mock(() => {}),
    moveTo: mock(() => {}),
    lineTo: mock(() => {}),
    stroke: mock(() => {}),
    roundRect: mock(() => {}),
    fill: mock(() => {}),
    closePath: mock(() => {}),
    save: mock(() => {}),
    restore: mock(() => {}),
    rect: mock(() => {}),
    clip: mock(() => {}),
  } as unknown as CanvasRenderingContext2D;
}

/**
 * Build a minimal layout buffer for a single cell at index 0.
 * Stride = 16 floats: [row, col, x, y, width, height, align, padTop, padRight, padBottom, padLeft, borderT, borderR, borderB, borderL, reserved]
 * align: 0=left, 1=center, 2=right
 */
function makeBuf(
  x: number,
  y: number,
  w: number,
  h: number,
  align = 0,
  padTop = 0,
  padRight = 0,
  padBottom = 0,
  padLeft = 0,
): Float32Array {
  return new Float32Array([
    0,
    0,
    x,
    y,
    w,
    h,
    align,
    padTop,
    padRight,
    padBottom,
    padLeft,
    0,
    0,
    0,
    0,
    0,
  ]);
}

describe("measureText", () => {
  it("sets font and returns measured width", () => {
    const ctx = mockCtx();
    (ctx.measureText as any).mockImplementation(() => ({ width: 42 }));
    const width = measureText(ctx, "hello", 14, "Arial");
    expect(ctx.font).toBe("14px Arial");
    expect(width).toBe(42);
  });
});

describe("drawTextCellFromBuffer", () => {
  it("draws text with default style (left-aligned)", () => {
    const ctx = mockCtx();
    const buf = makeBuf(10, 20, 200, 36, 0); // align=left

    drawTextCellFromBuffer(ctx, buf, 0, "Hello");

    expect(ctx.font).toBe("normal 13px system-ui, sans-serif");
    expect(ctx.fillStyle).toBe("#333");
    expect(ctx.textBaseline).toBe("middle");
    expect(ctx.textAlign).toBe("left");
    expect(ctx.fillText).toHaveBeenCalledWith("Hello", 10, 38); // x=10, y=20+36/2=38
  });

  it("draws center-aligned text", () => {
    const ctx = mockCtx();
    const buf = makeBuf(10, 20, 200, 36, 1); // align=center

    drawTextCellFromBuffer(ctx, buf, 0, "Center");

    expect(ctx.textAlign).toBe("center");
    // textX = x + (w/2) = 10 + 100 = 110
    expect(ctx.fillText).toHaveBeenCalledWith("Center", 110, 38);
  });

  it("draws right-aligned text", () => {
    const ctx = mockCtx();
    const buf = makeBuf(10, 20, 200, 36, 2); // align=right

    drawTextCellFromBuffer(ctx, buf, 0, "Right");

    expect(ctx.textAlign).toBe("right");
    // textX = x + w = 10 + 200 = 210
    expect(ctx.fillText).toHaveBeenCalledWith("Right", 210, 38);
  });

  it("applies custom style overrides", () => {
    const ctx = mockCtx();
    const buf = makeBuf(0, 0, 100, 40, 0);

    drawTextCellFromBuffer(ctx, buf, 0, "Styled", {
      color: "#ff0000",
      fontWeight: "bold",
      fontSize: 16,
    });

    expect(ctx.font).toBe("bold 16px system-ui, sans-serif");
    expect(ctx.fillStyle).toBe("#ff0000");
  });

  it("accounts for padding in text position", () => {
    const ctx = mockCtx();
    // padTop=4, padRight=8, padBottom=4, padLeft=12
    const buf = makeBuf(10, 20, 200, 36, 0, 4, 8, 4, 12);

    drawTextCellFromBuffer(ctx, buf, 0, "Padded");

    // textX = x + padLeft = 10 + 12 = 22
    // textY = y + padTop + (h - padTop - padBottom) / 2 = 20 + 4 + (36-4-4)/2 = 20 + 4 + 14 = 38
    expect(ctx.fillText).toHaveBeenCalledWith("Padded", 22, 38);
  });

  it("center-aligned with padding", () => {
    const ctx = mockCtx();
    const buf = makeBuf(0, 0, 200, 36, 1, 0, 10, 0, 10); // padLeft=10, padRight=10

    drawTextCellFromBuffer(ctx, buf, 0, "CP");

    // textX = x + padLeft + (w - padLeft - padRight) / 2 = 0 + 10 + (200-10-10)/2 = 10 + 90 = 100
    expect(ctx.textAlign).toBe("center");
    expect(ctx.fillText).toHaveBeenCalledWith("CP", 100, 18);
  });

  it("right-aligned with padding", () => {
    const ctx = mockCtx();
    const buf = makeBuf(0, 0, 200, 36, 2, 0, 16, 0, 0); // padRight=16

    drawTextCellFromBuffer(ctx, buf, 0, "RP");

    // textX = x + w - padRight = 0 + 200 - 16 = 184
    expect(ctx.textAlign).toBe("right");
    expect(ctx.fillText).toHaveBeenCalledWith("RP", 184, 18);
  });

  it("extraPadRight reduces available width for left-aligned text", () => {
    const ctx = mockCtx();
    const buf = makeBuf(10, 20, 200, 36, 0); // left-aligned, no padding

    drawTextCellFromBuffer(ctx, buf, 0, "Hello", undefined, 25);

    // textX unchanged (left-aligned) = 10
    expect(ctx.textAlign).toBe("left");
    expect(ctx.fillText).toHaveBeenCalledWith("Hello", 10, 38);
  });

  it("extraPadRight shifts right-aligned text leftward", () => {
    const ctx = mockCtx();
    const buf = makeBuf(10, 20, 200, 36, 2); // right-aligned

    drawTextCellFromBuffer(ctx, buf, 0, "Right", undefined, 25);

    // textX = x + w - padRight = 10 + 200 - 25 = 185
    expect(ctx.textAlign).toBe("right");
    expect(ctx.fillText).toHaveBeenCalledWith("Right", 185, 38);
  });

  it("extraPadRight shifts center-aligned text leftward", () => {
    const ctx = mockCtx();
    const buf = makeBuf(0, 0, 200, 36, 1); // center-aligned

    drawTextCellFromBuffer(ctx, buf, 0, "Center", undefined, 25);

    // textX = 0 + 0 + (200 - 0 - 25) / 2 = 87.5
    expect(ctx.textAlign).toBe("center");
    expect(ctx.fillText).toHaveBeenCalledWith("Center", 87.5, 18);
  });

  it("extraPadRight combines with existing padding", () => {
    const ctx = mockCtx();
    // padTop=0, padRight=8, padBottom=0, padLeft=12
    const buf = makeBuf(10, 20, 200, 36, 2, 0, 8, 0, 12);

    drawTextCellFromBuffer(ctx, buf, 0, "Both", undefined, 25);

    // effective padRight = 8 + 25 = 33
    // textX = 10 + 200 - 33 = 177
    expect(ctx.textAlign).toBe("right");
    expect(ctx.fillText).toHaveBeenCalledWith("Both", 177, 38);
  });
});

describe("drawBadgeFromBuffer", () => {
  it("draws a badge with default style", () => {
    const ctx = mockCtx();
    const buf = makeBuf(10, 20, 200, 36, 0);

    drawBadgeFromBuffer(ctx, buf, 0, "Active");

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.roundRect).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    // Default bg color
    expect(ctx.fillStyle).toBe("#333"); // last fillStyle set (text color)
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it("applies custom badge style", () => {
    const ctx = mockCtx();
    const buf = makeBuf(10, 20, 200, 36, 0);

    drawBadgeFromBuffer(ctx, buf, 0, "OK", {
      backgroundColor: "#4caf50",
      color: "#fff",
      borderRadius: 8,
    });

    // The roundRect call should use borderRadius=8
    const roundRectCall = (ctx.roundRect as any).mock.calls[0];
    expect(roundRectCall[4]).toBe(8);
  });

  it("centers the badge horizontally in the cell", () => {
    const ctx = mockCtx();
    // "Test" = 4 chars * 8px = 32px text width, badge padding = 6*2 = 12, total badge = 44
    const buf = makeBuf(0, 0, 200, 36, 0);

    drawBadgeFromBuffer(ctx, buf, 0, "Test");

    const roundRectCall = (ctx.roundRect as any).mock.calls[0];
    const badgeX = roundRectCall[0];
    const badgeW = roundRectCall[2];
    // Badge should be centered: badgeX = (200 - 44) / 2 = 78
    expect(badgeX).toBe(78);
    expect(badgeW).toBe(44);
  });
});

describe("drawSparklineFromBuffer", () => {
  it("draws a line sparkline with default style", () => {
    const ctx = mockCtx();
    const buf = makeBuf(10, 20, 200, 36, 0);

    drawSparklineFromBuffer(ctx, buf, 0, [1, 2, 3, 4, 5]);

    expect(ctx.strokeStyle).toBe("#333");
    expect(ctx.lineWidth).toBe(1.5);
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalledTimes(4); // 5 points -> 4 lineTo
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("draws an area sparkline (fill + stroke)", () => {
    const ctx = mockCtx();
    const buf = makeBuf(0, 0, 100, 30, 0);

    drawSparklineFromBuffer(ctx, buf, 0, [10, 20, 15, 25], { variant: "area" });

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("applies custom style (color, strokeWidth)", () => {
    const ctx = mockCtx();
    const buf = makeBuf(0, 0, 80, 24, 0);

    drawSparklineFromBuffer(ctx, buf, 0, [1, 2, 3], {
      color: "#2563eb",
      strokeWidth: 2,
    });

    expect(ctx.strokeStyle).toBe("#2563eb");
    expect(ctx.lineWidth).toBe(2);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("does nothing when data has fewer than 2 points", () => {
    const ctx = mockCtx();
    const buf = makeBuf(0, 0, 100, 36, 0);

    drawSparklineFromBuffer(ctx, buf, 0, [1]);
    drawSparklineFromBuffer(ctx, buf, 0, []);

    expect(ctx.beginPath).not.toHaveBeenCalled();
    expect(ctx.stroke).not.toHaveBeenCalled();
  });
});

describe("colorCellRenderer", () => {
  it("draws a color swatch with default style", () => {
    const ctx = mockCtx();
    const buf = makeBuf(10, 20, 200, 36, 0);

    colorCellRenderer.draw(
      { type: "color", value: "#ff0000" },
      { ctx, buf, cellIdx: 0, theme: DEFAULT_THEME, computeChildLayout: noopLayout },
    );

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.roundRect).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.fillStyle).toBe("#ff0000");
  });

  it("draws border when borderColor and borderWidth set", () => {
    const ctx = mockCtx();
    const buf = makeBuf(0, 0, 100, 36, 0);

    colorCellRenderer.draw(
      {
        type: "color",
        value: "#00ff00",
        style: { borderColor: "#333", borderWidth: 2, borderRadius: 4 },
      },
      { ctx, buf, cellIdx: 0, theme: DEFAULT_THEME, computeChildLayout: noopLayout },
    );

    expect(ctx.strokeStyle).toBe("#333");
    expect(ctx.lineWidth).toBe(2);
    expect(ctx.stroke).toHaveBeenCalled();
    const roundRectCall = (ctx.roundRect as any).mock.calls[0];
    expect(roundRectCall[4]).toBe(4); // borderRadius
  });
});

describe("tagCellRenderer", () => {
  it("draws a tag with stroke border and text", () => {
    const ctx = mockCtx();
    const buf = makeBuf(10, 20, 200, 36, 0);

    tagCellRenderer.draw(
      { type: "tag", value: "New" },
      { ctx, buf, cellIdx: 0, theme: DEFAULT_THEME, computeChildLayout: noopLayout },
    );

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.roundRect).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalled();
    expect(ctx.textAlign).toBe("center");
  });

  it("applies custom tag style", () => {
    const ctx = mockCtx();
    const buf = makeBuf(0, 0, 200, 36, 0);

    tagCellRenderer.draw(
      {
        type: "tag",
        value: "OK",
        style: { color: "#1565c0", borderColor: "#1565c0", borderRadius: 8, fontSize: 14 },
      },
      { ctx, buf, cellIdx: 0, theme: DEFAULT_THEME, computeChildLayout: noopLayout },
    );

    expect(ctx.strokeStyle).toBe("#1565c0");
    expect(ctx.fillStyle).toBe("#1565c0");
    const roundRectCall = (ctx.roundRect as any).mock.calls[0];
    expect(roundRectCall[4]).toBe(8);
  });
});

describe("ratingCellRenderer", () => {
  it("draws filled and empty stars", () => {
    const ctx = mockCtx();
    const buf = makeBuf(10, 20, 200, 36, 0);

    ratingCellRenderer.draw(
      { type: "rating", value: 3 },
      { ctx, buf, cellIdx: 0, theme: DEFAULT_THEME, computeChildLayout: noopLayout },
    );

    // 5 stars total (default max=5): 3 filled + 2 empty
    expect(ctx.fillText).toHaveBeenCalledTimes(5);
  });

  it("uses custom max and colors", () => {
    const ctx = mockCtx();
    const buf = makeBuf(0, 0, 300, 36, 0);

    ratingCellRenderer.draw(
      { type: "rating", value: 7, style: { max: 10, color: "gold", emptyColor: "#aaa" } },
      { ctx, buf, cellIdx: 0, theme: DEFAULT_THEME, computeChildLayout: noopLayout },
    );

    // 10 stars total
    expect(ctx.fillText).toHaveBeenCalledTimes(10);
  });
});

describe("chipCellRenderer", () => {
  it("draws a chip with default style", () => {
    const ctx = mockCtx();
    const buf = makeBuf(10, 20, 200, 36, 0);

    chipCellRenderer.draw(
      { type: "chip", value: "React" },
      { ctx, buf, cellIdx: 0, theme: DEFAULT_THEME, computeChildLayout: noopLayout },
    );

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.roundRect).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it("draws close button when closable", () => {
    const ctx = mockCtx();
    const buf = makeBuf(0, 0, 200, 36, 0);

    chipCellRenderer.draw(
      { type: "chip", value: "Tag", style: { closable: true } },
      { ctx, buf, cellIdx: 0, theme: DEFAULT_THEME, computeChildLayout: noopLayout },
    );

    // fillText called twice: once for label, once for "×"
    expect(ctx.fillText).toHaveBeenCalledTimes(2);
    const secondCall = (ctx.fillText as any).mock.calls[1];
    expect(secondCall[0]).toBe("×");
  });

  it("applies custom chip style", () => {
    const ctx = mockCtx();
    const buf = makeBuf(0, 0, 200, 36, 0);

    chipCellRenderer.draw(
      {
        type: "chip",
        value: "X",
        style: { backgroundColor: "#4caf50", color: "#fff", borderRadius: 16 },
      },
      { ctx, buf, cellIdx: 0, theme: DEFAULT_THEME, computeChildLayout: noopLayout },
    );

    const roundRectCall = (ctx.roundRect as any).mock.calls[0];
    expect(roundRectCall[4]).toBe(16);
  });
});

describe("linkCellRenderer", () => {
  it("draws link text with underline by default", () => {
    const ctx = mockCtx();
    const buf = makeBuf(10, 20, 200, 36, 0);

    linkCellRenderer.draw(
      { type: "link", value: "Click me" },
      { ctx, buf, cellIdx: 0, theme: DEFAULT_THEME, computeChildLayout: noopLayout },
    );

    expect(ctx.fillStyle).toBe("#2563eb");
    expect(ctx.fillText).toHaveBeenCalled();
    // Underline: beginPath + moveTo + lineTo + stroke
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("no underline when underline=false", () => {
    const ctx = mockCtx();
    const buf = makeBuf(0, 0, 200, 36, 0);

    linkCellRenderer.draw(
      { type: "link", value: "Plain", style: { underline: false } },
      { ctx, buf, cellIdx: 0, theme: DEFAULT_THEME, computeChildLayout: noopLayout },
    );

    expect(ctx.fillText).toHaveBeenCalled();
    // stroke should not be called (no underline line drawn)
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it("applies custom link style", () => {
    const ctx = mockCtx();
    const buf = makeBuf(0, 0, 200, 36, 0);

    linkCellRenderer.draw(
      { type: "link", value: "Home", style: { color: "#e65100", fontSize: 16 } },
      { ctx, buf, cellIdx: 0, theme: DEFAULT_THEME, computeChildLayout: noopLayout },
    );

    expect(ctx.fillStyle).toBe("#e65100");
    expect(ctx.font).toBe("16px system-ui, sans-serif");
  });
});

// ── shared.ts utility tests ────────────────────────────────────────────

describe("lengthToPx", () => {
  it("returns 0 for undefined", () => {
    expect(lengthToPx(undefined, 100)).toBe(0);
  });

  it("returns number directly", () => {
    expect(lengthToPx(10, 100)).toBe(10);
  });

  it("resolves percentage", () => {
    expect(lengthToPx("50%", 200)).toBe(100);
    expect(lengthToPx("25%", 400)).toBe(100);
  });

  it("returns 0 for invalid string", () => {
    expect(lengthToPx("auto" as any, 100)).toBe(0);
  });
});

describe("rectToPx", () => {
  it("returns zeros for undefined", () => {
    expect(rectToPx(undefined, 100, 100)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it("resolves single number", () => {
    expect(rectToPx(8, 100, 100)).toEqual({ top: 8, right: 8, bottom: 8, left: 8 });
  });

  it("resolves 2-tuple", () => {
    const result = rectToPx([4, 8], 200, 100);
    expect(result).toEqual({ top: 4, right: 8, bottom: 4, left: 8 });
  });

  it("resolves 3-tuple", () => {
    const result = rectToPx([4, 8, 12], 200, 100);
    expect(result).toEqual({ top: 4, right: 8, bottom: 12, left: 8 });
  });

  it("resolves 4-tuple", () => {
    const result = rectToPx([1, 2, 3, 4], 200, 100);
    expect(result).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });
  });

  it("resolves percentage values in tuple", () => {
    const result = rectToPx(["10%", "20%"], 200, 100);
    expect(result).toEqual({ top: 10, right: 40, bottom: 10, left: 40 });
  });
});

describe("measureInstructionWidth", () => {
  it("measures text width", () => {
    const ctx = mockCtx();
    (ctx.measureText as any).mockImplementation(() => ({ width: 50 }));
    const w = measureInstructionWidth(ctx, { type: "text", value: "hello" }, DEFAULT_THEME);
    expect(w).toBe(50);
  });

  it("measures badge width with padding", () => {
    const ctx = mockCtx();
    const w = measureInstructionWidth(
      ctx,
      { type: "badge", value: "OK", style: { backgroundColor: "#0f0" } },
      DEFAULT_THEME,
    );
    expect(w).toBe("OK".length * 8 + BADGE_PADDING * 2);
  });

  it("measures chip width with closable", () => {
    const ctx = mockCtx();
    const w = measureInstructionWidth(
      ctx,
      { type: "chip", value: "X", style: { closable: true } },
      DEFAULT_THEME,
    );
    expect(w).toBe("X".length * 8 + BADGE_PADDING * 2 + 14);
  });

  it("measures tag width", () => {
    const ctx = mockCtx();
    const w = measureInstructionWidth(ctx, { type: "tag", value: "New" }, DEFAULT_THEME);
    expect(w).toBe("New".length * 8 + BADGE_PADDING * 2);
  });

  it("measures rating width", () => {
    const ctx = mockCtx();
    const w = measureInstructionWidth(ctx, { type: "rating", value: 3 }, DEFAULT_THEME);
    expect(w).toBe("★★★★★".length * 8);
  });

  it("returns FLEX_CHILD_HEIGHT for color", () => {
    const ctx = mockCtx();
    expect(measureInstructionWidth(ctx, { type: "color", value: "#f00" }, DEFAULT_THEME)).toBe(
      FLEX_CHILD_HEIGHT,
    );
  });

  it("measures link width", () => {
    const ctx = mockCtx();
    const w = measureInstructionWidth(ctx, { type: "link", value: "Click" }, DEFAULT_THEME);
    expect(w).toBe("Click".length * 8);
  });

  it("returns default for image", () => {
    const ctx = mockCtx();
    expect(
      measureInstructionWidth(ctx, { type: "image", src: "x.png" } as any, DEFAULT_THEME),
    ).toBe(FLEX_CHILD_HEIGHT);
  });

  it("returns explicit width for image", () => {
    const ctx = mockCtx();
    expect(
      measureInstructionWidth(
        ctx,
        { type: "image", src: "x.png", width: 100 } as any,
        DEFAULT_THEME,
      ),
    ).toBe(100);
  });

  it("returns default for switch", () => {
    const ctx = mockCtx();
    expect(
      measureInstructionWidth(ctx, { type: "switch", checked: false } as any, DEFAULT_THEME),
    ).toBe(36);
  });

  it("returns custom width for switch", () => {
    const ctx = mockCtx();
    expect(
      measureInstructionWidth(
        ctx,
        { type: "switch", checked: false, style: { width: 44 } } as any,
        DEFAULT_THEME,
      ),
    ).toBe(44);
  });

  it("returns 22 for checkbox with no children (size 16 + gap 6)", () => {
    const ctx = mockCtx();
    expect(
      measureInstructionWidth(
        ctx,
        { type: "checkbox", checked: false, children: [] } as any,
        DEFAULT_THEME,
      ),
    ).toBe(22);
  });

  it("returns 120 for input", () => {
    const ctx = mockCtx();
    expect(measureInstructionWidth(ctx, { type: "input", value: "" } as any, DEFAULT_THEME)).toBe(
      120,
    );
  });

  it("returns 60 for stub/box/flex/stack", () => {
    const ctx = mockCtx();
    expect(
      measureInstructionWidth(ctx, { type: "stub", component: "X" } as any, DEFAULT_THEME),
    ).toBe(60);
    expect(
      measureInstructionWidth(ctx, { type: "box", padding: 0, children: [] } as any, DEFAULT_THEME),
    ).toBe(60);
    expect(measureInstructionWidth(ctx, { type: "flex", children: [] } as any, DEFAULT_THEME)).toBe(
      60,
    );
    expect(
      measureInstructionWidth(ctx, { type: "stack", children: [] } as any, DEFAULT_THEME),
    ).toBe(60);
  });

  it("returns 0 for unknown type", () => {
    const ctx = mockCtx();
    expect(measureInstructionWidth(ctx, { type: "unknown" } as any, DEFAULT_THEME)).toBe(0);
  });
});

describe("measureInstructionHeight", () => {
  it("returns FLEX_CHILD_HEIGHT for common types", () => {
    const ctx = mockCtx();
    const types = [
      "badge",
      "text",
      "stub",
      "box",
      "flex",
      "stack",
      "color",
      "tag",
      "rating",
      "chip",
      "link",
      "checkbox",
      "input",
    ];
    for (const t of types) {
      expect(measureInstructionHeight(ctx, { type: t } as any)).toBe(FLEX_CHILD_HEIGHT);
    }
  });

  it("returns FLEX_CHILD_HEIGHT for image without explicit height", () => {
    const ctx = mockCtx();
    expect(measureInstructionHeight(ctx, { type: "image", src: "x.png" } as any)).toBe(
      FLEX_CHILD_HEIGHT,
    );
  });

  it("returns explicit height for image", () => {
    const ctx = mockCtx();
    expect(measureInstructionHeight(ctx, { type: "image", src: "x.png", height: 80 } as any)).toBe(
      80,
    );
  });

  it("returns 0 for unknown type", () => {
    const ctx = mockCtx();
    expect(measureInstructionHeight(ctx, { type: "progressbar" } as any)).toBe(0);
  });
});

describe("makeSubCellBuf", () => {
  it("creates buffer with correct position and size", () => {
    const buf = makeSubCellBuf(10, 20, 100, 50);
    expect(buf[2]).toBe(10); // x
    expect(buf[3]).toBe(20); // y
    expect(buf[4]).toBe(100); // w
    expect(buf[5]).toBe(50); // h
    expect(buf[6]).toBe(0); // align=left
  });
});

describe("encodeCompositeInput", () => {
  it("encodes container and child layout data", () => {
    const result = encodeCompositeInput(
      200,
      100,
      "row",
      4,
      "center",
      "start",
      [2, 4, 2, 4],
      [40, 60],
      [22, 22],
    );
    expect(result[0]).toBe(200); // containerW
    expect(result[1]).toBe(100); // containerH
    expect(result[2]).toBe(0); // row=0
    expect(result[3]).toBe(4); // gap
    expect(result[4]).toBe(2); // center=2
    expect(result[5]).toBe(0); // start=0
    expect(result[6]).toBe(2); // padT
    expect(result[7]).toBe(4); // padR
    expect(result[8]).toBe(2); // padB
    expect(result[9]).toBe(4); // padL
    expect(result[10]).toBe(2); // childCount
    expect(result[11]).toBe(40); // child0 width
    expect(result[12]).toBe(22); // child0 height
    expect(result[13]).toBe(60); // child1 width
    expect(result[14]).toBe(22); // child1 height
  });

  it("encodes column direction as 1", () => {
    const result = encodeCompositeInput(
      100,
      100,
      "column",
      0,
      undefined,
      undefined,
      [0, 0, 0, 0],
      [],
      [],
    );
    expect(result[2]).toBe(1);
  });

  it("encodes row-reverse as 2 and column-reverse as 3", () => {
    const rr = encodeCompositeInput(
      100,
      100,
      "row-reverse",
      0,
      undefined,
      undefined,
      [0, 0, 0, 0],
      [],
      [],
    );
    expect(rr[2]).toBe(2);
    const cr = encodeCompositeInput(
      100,
      100,
      "column-reverse",
      0,
      undefined,
      undefined,
      [0, 0, 0, 0],
      [],
      [],
    );
    expect(cr[2]).toBe(3);
  });

  it("encodes align/justify: end=1, stretch=3, space-between=3", () => {
    const result = encodeCompositeInput(
      100,
      100,
      "row",
      0,
      "end",
      "space-between",
      [0, 0, 0, 0],
      [],
      [],
    );
    expect(result[4]).toBe(1); // end
    expect(result[5]).toBe(3); // space-between
  });

  it("encodes stretch align as 3", () => {
    const result = encodeCompositeInput(
      100,
      100,
      "row",
      0,
      "stretch",
      "center",
      [0, 0, 0, 0],
      [],
      [],
    );
    expect(result[4]).toBe(3); // stretch
    expect(result[5]).toBe(2); // center
  });

  it("encodes undefined align/justify as NaN", () => {
    const result = encodeCompositeInput(
      100,
      100,
      "row",
      0,
      undefined,
      undefined,
      [0, 0, 0, 0],
      [],
      [],
    );
    expect(Number.isNaN(result[4])).toBe(true);
    expect(Number.isNaN(result[5])).toBe(true);
  });
});

describe("linkCellRenderer onCellClick", () => {
  const ensureWindow = () => {
    if (typeof globalThis.window === "undefined") {
      (globalThis as any).window = {} as any;
    }
  };

  it("opens href in new tab", () => {
    ensureWindow();
    const openMock = mock(() => null);
    const origOpen = globalThis.window.open;
    globalThis.window.open = openMock as any;
    try {
      linkCellRenderer.onCellClick!({
        type: "link",
        value: "Click",
        href: "https://example.com",
      } as any);
      expect(openMock).toHaveBeenCalledWith("https://example.com", "_blank", "noopener,noreferrer");
    } finally {
      globalThis.window.open = origOpen;
    }
  });

  it("opens value as URL when href is not set", () => {
    ensureWindow();
    const openMock = mock(() => null);
    const origOpen = globalThis.window.open;
    globalThis.window.open = openMock as any;
    try {
      linkCellRenderer.onCellClick!({ type: "link", value: "https://fallback.com" } as any);
      expect(openMock).toHaveBeenCalledWith(
        "https://fallback.com",
        "_blank",
        "noopener,noreferrer",
      );
    } finally {
      globalThis.window.open = origOpen;
    }
  });

  it("does not open when both href and value are empty", () => {
    ensureWindow();
    const openMock = mock(() => null);
    const origOpen = globalThis.window.open;
    globalThis.window.open = openMock as any;
    try {
      linkCellRenderer.onCellClick!({ type: "link", value: "" } as any);
      expect(openMock).not.toHaveBeenCalled();
    } finally {
      globalThis.window.open = origOpen;
    }
  });
});

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
import { DEFAULT_THEME } from "../../types";

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
    expect(ctx.fillText).toHaveBeenCalledWith("Hello", 10, 38, 200); // x=10, y=20+36/2=38
  });

  it("draws center-aligned text", () => {
    const ctx = mockCtx();
    const buf = makeBuf(10, 20, 200, 36, 1); // align=center

    drawTextCellFromBuffer(ctx, buf, 0, "Center");

    expect(ctx.textAlign).toBe("center");
    // textX = x + (w/2) = 10 + 100 = 110
    expect(ctx.fillText).toHaveBeenCalledWith("Center", 110, 38, 200);
  });

  it("draws right-aligned text", () => {
    const ctx = mockCtx();
    const buf = makeBuf(10, 20, 200, 36, 2); // align=right

    drawTextCellFromBuffer(ctx, buf, 0, "Right");

    expect(ctx.textAlign).toBe("right");
    // textX = x + w = 10 + 200 = 210
    expect(ctx.fillText).toHaveBeenCalledWith("Right", 210, 38, 200);
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
    // maxWidth = w - padLeft - padRight = 200 - 12 - 8 = 180
    expect(ctx.fillText).toHaveBeenCalledWith("Padded", 22, 38, 180);
  });

  it("center-aligned with padding", () => {
    const ctx = mockCtx();
    const buf = makeBuf(0, 0, 200, 36, 1, 0, 10, 0, 10); // padLeft=10, padRight=10

    drawTextCellFromBuffer(ctx, buf, 0, "CP");

    // textX = x + padLeft + (w - padLeft - padRight) / 2 = 0 + 10 + (200-10-10)/2 = 10 + 90 = 100
    expect(ctx.textAlign).toBe("center");
    expect(ctx.fillText).toHaveBeenCalledWith("CP", 100, 18, 180);
  });

  it("right-aligned with padding", () => {
    const ctx = mockCtx();
    const buf = makeBuf(0, 0, 200, 36, 2, 0, 16, 0, 0); // padRight=16

    drawTextCellFromBuffer(ctx, buf, 0, "RP");

    // textX = x + w - padRight = 0 + 200 - 16 = 184
    expect(ctx.textAlign).toBe("right");
    expect(ctx.fillText).toHaveBeenCalledWith("RP", 184, 18, 184);
  });

  it("extraPadRight reduces available width for left-aligned text", () => {
    const ctx = mockCtx();
    const buf = makeBuf(10, 20, 200, 36, 0); // left-aligned, no padding

    drawTextCellFromBuffer(ctx, buf, 0, "Hello", undefined, 25);

    // textX unchanged (left-aligned) = 10
    // maxWidth = 200 - 0 - 25 = 175
    expect(ctx.textAlign).toBe("left");
    expect(ctx.fillText).toHaveBeenCalledWith("Hello", 10, 38, 175);
  });

  it("extraPadRight shifts right-aligned text leftward", () => {
    const ctx = mockCtx();
    const buf = makeBuf(10, 20, 200, 36, 2); // right-aligned

    drawTextCellFromBuffer(ctx, buf, 0, "Right", undefined, 25);

    // textX = x + w - padRight = 10 + 200 - 25 = 185
    // maxWidth = 200 - 0 - 25 = 175
    expect(ctx.textAlign).toBe("right");
    expect(ctx.fillText).toHaveBeenCalledWith("Right", 185, 38, 175);
  });

  it("extraPadRight shifts center-aligned text leftward", () => {
    const ctx = mockCtx();
    const buf = makeBuf(0, 0, 200, 36, 1); // center-aligned

    drawTextCellFromBuffer(ctx, buf, 0, "Center", undefined, 25);

    // textX = 0 + 0 + (200 - 0 - 25) / 2 = 87.5
    // maxWidth = 200 - 0 - 25 = 175
    expect(ctx.textAlign).toBe("center");
    expect(ctx.fillText).toHaveBeenCalledWith("Center", 87.5, 18, 175);
  });

  it("extraPadRight combines with existing padding", () => {
    const ctx = mockCtx();
    // padTop=0, padRight=8, padBottom=0, padLeft=12
    const buf = makeBuf(10, 20, 200, 36, 2, 0, 8, 0, 12);

    drawTextCellFromBuffer(ctx, buf, 0, "Both", undefined, 25);

    // effective padRight = 8 + 25 = 33
    // textX = 10 + 200 - 33 = 177
    // maxWidth = 200 - 12 - 33 = 155
    expect(ctx.textAlign).toBe("right");
    expect(ctx.fillText).toHaveBeenCalledWith("Both", 177, 38, 155);
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
      { ctx, buf, cellIdx: 0, theme: DEFAULT_THEME },
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
      { ctx, buf, cellIdx: 0, theme: DEFAULT_THEME },
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
      { ctx, buf, cellIdx: 0, theme: DEFAULT_THEME },
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
      { ctx, buf, cellIdx: 0, theme: DEFAULT_THEME },
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
      { ctx, buf, cellIdx: 0, theme: DEFAULT_THEME },
    );

    // 5 stars total (default max=5): 3 filled + 2 empty
    expect(ctx.fillText).toHaveBeenCalledTimes(5);
  });

  it("uses custom max and colors", () => {
    const ctx = mockCtx();
    const buf = makeBuf(0, 0, 300, 36, 0);

    ratingCellRenderer.draw(
      { type: "rating", value: 7, style: { max: 10, color: "gold", emptyColor: "#aaa" } },
      { ctx, buf, cellIdx: 0, theme: DEFAULT_THEME },
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
      { ctx, buf, cellIdx: 0, theme: DEFAULT_THEME },
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
      { ctx, buf, cellIdx: 0, theme: DEFAULT_THEME },
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
      { ctx, buf, cellIdx: 0, theme: DEFAULT_THEME },
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
      { ctx, buf, cellIdx: 0, theme: DEFAULT_THEME },
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
      { ctx, buf, cellIdx: 0, theme: DEFAULT_THEME },
    );

    expect(ctx.fillText).toHaveBeenCalled();
    expect(ctx.beginPath).not.toHaveBeenCalled();
  });

  it("applies custom link style", () => {
    const ctx = mockCtx();
    const buf = makeBuf(0, 0, 200, 36, 0);

    linkCellRenderer.draw(
      { type: "link", value: "Home", style: { color: "#e65100", fontSize: 16 } },
      { ctx, buf, cellIdx: 0, theme: DEFAULT_THEME },
    );

    expect(ctx.fillStyle).toBe("#e65100");
    expect(ctx.font).toBe("16px system-ui, sans-serif");
  });
});

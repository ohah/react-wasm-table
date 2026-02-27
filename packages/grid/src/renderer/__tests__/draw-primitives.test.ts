import { describe, expect, it, mock } from "bun:test";
import { measureText, drawTextCellFromBuffer, drawBadgeFromBuffer } from "../draw-primitives";

/** Create a mock CanvasRenderingContext2D with spies. */
function mockCtx() {
  return {
    font: "",
    fillStyle: "",
    textBaseline: "",
    textAlign: "",
    measureText: mock((text: string) => ({ width: text.length * 8 })),
    fillText: mock(() => {}),
    beginPath: mock(() => {}),
    roundRect: mock(() => {}),
    fill: mock(() => {}),
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

import { describe, expect, it, mock } from "bun:test";
import { avatarCellRenderer } from "../components/avatar";
import type { CellRenderContext } from "../components";
import type { Theme, AvatarInstruction } from "../../types";

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
    buf[off + 6] = 0;
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
    beginPath: mock(() => {}),
    arc: mock(() => {}),
    closePath: mock(() => {}),
    clip: mock(() => {}),
    fillRect: mock(() => {}),
    fillText: mock(() => {}),
    drawImage: mock(() => {}),
    save: mock(() => {}),
    restore: mock(() => {}),
    stroke: mock(() => {}),
  } as unknown as CanvasRenderingContext2D;
}

function makeContext(ctx: CanvasRenderingContext2D, buf: Float32Array): CellRenderContext {
  return {
    ctx,
    buf,
    cellIdx: 0,
    theme: defaultTheme,
    computeChildLayout: () => new Float32Array(0),
  };
}

describe("avatarCellRenderer", () => {
  it("has type 'avatar'", () => {
    expect(avatarCellRenderer.type).toBe("avatar");
  });

  it("draws initials when no src is provided", () => {
    const ctx = mockCtx();
    const buf = buildBuf([[0, 0, 10, 10, 60, 60]]);
    const instruction: AvatarInstruction = { type: "avatar", name: "John Doe" };
    avatarCellRenderer.draw(instruction, makeContext(ctx, buf));

    expect((ctx.arc as any).mock.calls.length).toBeGreaterThanOrEqual(1);
    expect((ctx.fillText as any).mock.calls.length).toBe(1);
    const textCall = (ctx.fillText as any).mock.calls[0];
    expect(textCall[0]).toBe("JD");
  });

  it("draws single initial for single name", () => {
    const ctx = mockCtx();
    const buf = buildBuf([[0, 0, 10, 10, 60, 60]]);
    const instruction: AvatarInstruction = { type: "avatar", name: "Alice" };
    avatarCellRenderer.draw(instruction, makeContext(ctx, buf));

    const textCall = (ctx.fillText as any).mock.calls[0];
    expect(textCall[0]).toBe("A");
  });

  it("draws circle border when borderWidth and borderColor are set", () => {
    const ctx = mockCtx();
    const buf = buildBuf([[0, 0, 10, 10, 60, 60]]);
    const instruction: AvatarInstruction = {
      type: "avatar",
      name: "X",
      style: { borderWidth: 2, borderColor: "#000" },
    };
    avatarCellRenderer.draw(instruction, makeContext(ctx, buf));

    expect((ctx.stroke as any).mock.calls.length).toBe(1);
  });

  it("does not draw when content area is zero", () => {
    const ctx = mockCtx();
    const buf = buildBuf([[0, 0, 10, 10, 0, 0]]);
    const instruction: AvatarInstruction = { type: "avatar", name: "X" };
    avatarCellRenderer.draw(instruction, makeContext(ctx, buf));

    expect((ctx.arc as any).mock.calls.length).toBe(0);
  });
});

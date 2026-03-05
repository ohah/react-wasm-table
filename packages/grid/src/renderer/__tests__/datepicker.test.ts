import { describe, expect, it, mock } from "bun:test";
import { datepickerCellRenderer } from "../components/datepicker";
import type { CellRenderContext } from "../components";
import type { Theme, DatePickerInstruction } from "../../types";

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
    lineJoin: "",
    textBaseline: "",
    textAlign: "",
    globalAlpha: 1,
    beginPath: mock(() => {}),
    roundRect: mock(() => {}),
    rect: mock(() => {}),
    fill: mock(() => {}),
    stroke: mock(() => {}),
    save: mock(() => {}),
    restore: mock(() => {}),
    clip: mock(() => {}),
    fillText: mock(() => {}),
    fillRect: mock(() => {}),
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

describe("datepickerCellRenderer", () => {
  it("has type 'datepicker'", () => {
    expect(datepickerCellRenderer.type).toBe("datepicker");
  });

  it("has cursor 'pointer'", () => {
    expect(datepickerCellRenderer.cursor).toBe("pointer");
  });

  it("draws date text and calendar icon", () => {
    const ctx = mockCtx();
    const buf = buildBuf([[0, 0, 0, 0, 200, 40]]);
    const instruction: DatePickerInstruction = { type: "datepicker", value: "2024-01-15" };
    datepickerCellRenderer.draw(instruction, makeContext(ctx, buf));

    // Should draw background (roundRect + fill), border, text, and calendar icon
    expect((ctx.roundRect as any).mock.calls.length).toBeGreaterThanOrEqual(1);
    expect((ctx.fillText as any).mock.calls.length).toBe(1);
    expect((ctx.fillText as any).mock.calls[0][0]).toBe("2024-01-15");
  });

  it("draws placeholder when no value", () => {
    const ctx = mockCtx();
    const buf = buildBuf([[0, 0, 0, 0, 200, 40]]);
    const instruction: DatePickerInstruction = {
      type: "datepicker",
      placeholder: "Select date...",
    };
    datepickerCellRenderer.draw(instruction, makeContext(ctx, buf));

    expect((ctx.fillText as any).mock.calls[0][0]).toBe("Select date...");
  });

  it("applies disabled opacity", () => {
    const ctx = mockCtx();
    const buf = buildBuf([[0, 0, 0, 0, 200, 40]]);
    const instruction: DatePickerInstruction = {
      type: "datepicker",
      disabled: true,
      value: "2024-01-01",
    };
    datepickerCellRenderer.draw(instruction, makeContext(ctx, buf));

    expect((ctx.save as any).mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("does not draw when content area is zero", () => {
    const ctx = mockCtx();
    const buf = buildBuf([[0, 0, 0, 0, 4, 4]]);
    const instruction: DatePickerInstruction = { type: "datepicker", value: "2024-01-01" };
    datepickerCellRenderer.draw(instruction, makeContext(ctx, buf));

    expect((ctx.roundRect as any).mock.calls.length).toBe(0);
  });
});

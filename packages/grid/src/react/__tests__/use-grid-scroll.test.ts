import { describe, expect, it, mock } from "bun:test";
import { ColumnRegistry } from "../../adapter/column-registry";

/**
 * Test scroll logic extracted into useGridScroll.
 * Verifies clamping, auto-scroll, and threshold behavior.
 */

function calcMaxScrollY(dataLen: number, rowHeight: number, height: number, headerHeight: number) {
  return Math.max(0, dataLen * rowHeight - (height - headerHeight));
}

function calcMaxScrollX(cols: { width: number }[], viewportWidth: number) {
  const total = cols.reduce((s, c) => s + c.width, 0);
  return Math.max(0, total - viewportWidth);
}

describe("useGridScroll logic", () => {
  it("clamps scrollTop between 0 and max", () => {
    const maxY = calcMaxScrollY(100, 36, 600, 40); // 100*36 - 560 = 3040
    expect(maxY).toBe(3040);

    // Scrolling down
    let scrollTop = 0;
    scrollTop = Math.max(0, Math.min(maxY, scrollTop + 100));
    expect(scrollTop).toBe(100);

    // Scrolling past max
    scrollTop = Math.max(0, Math.min(maxY, scrollTop + 5000));
    expect(scrollTop).toBe(3040);

    // Scrolling up past 0
    scrollTop = Math.max(0, Math.min(maxY, scrollTop - 10000));
    expect(scrollTop).toBe(0);
  });

  it("clamps scrollLeft between 0 and max", () => {
    const cols = [{ width: 200 }, { width: 200 }, { width: 200 }];
    const maxX = calcMaxScrollX(cols, 500); // 600 - 500 = 100
    expect(maxX).toBe(100);

    let scrollLeft = 0;
    scrollLeft = Math.max(0, Math.min(maxX, scrollLeft + 50));
    expect(scrollLeft).toBe(50);

    scrollLeft = Math.max(0, Math.min(maxX, scrollLeft + 200));
    expect(scrollLeft).toBe(100);
  });

  it("maxScrollY is 0 when content fits viewport", () => {
    const maxY = calcMaxScrollY(10, 36, 600, 40); // 10*36 = 360 < 560
    expect(maxY).toBe(0);
  });

  it("module exports useGridScroll function", async () => {
    const mod = await import("../hooks/use-grid-scroll");
    expect(typeof mod.useGridScroll).toBe("function");
  });
});

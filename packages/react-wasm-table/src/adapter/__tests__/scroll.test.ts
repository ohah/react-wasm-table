import { describe, expect, it } from "bun:test";

/**
 * Pure-function extraction of the scroll clamping logic from Grid.tsx:
 *   const maxScroll = Math.max(0, totalRows * rowHeight - viewportBodyHeight);
 *   scrollTop = Math.max(0, Math.min(maxScroll, scrollTop + deltaY));
 */
function clampScroll(
  current: number,
  deltaY: number,
  totalRows: number,
  rowHeight: number,
  viewportBodyHeight: number,
): number {
  const maxScroll = Math.max(0, totalRows * rowHeight - viewportBodyHeight);
  return Math.max(0, Math.min(maxScroll, current + deltaY));
}

describe("scroll clamping", () => {
  const ROWS = 10_000;
  const ROW_H = 36;
  const BODY_H = 460; // height(500) - headerHeight(40)

  it("starts at zero", () => {
    expect(clampScroll(0, 0, ROWS, ROW_H, BODY_H)).toBe(0);
  });

  it("scrolls down by deltaY", () => {
    expect(clampScroll(0, 100, ROWS, ROW_H, BODY_H)).toBe(100);
  });

  it("does not scroll below zero", () => {
    expect(clampScroll(0, -50, ROWS, ROW_H, BODY_H)).toBe(0);
    expect(clampScroll(30, -100, ROWS, ROW_H, BODY_H)).toBe(0);
  });

  it("does not scroll past maximum", () => {
    const maxScroll = ROWS * ROW_H - BODY_H; // 10000*36 - 460 = 359540
    expect(clampScroll(maxScroll, 100, ROWS, ROW_H, BODY_H)).toBe(maxScroll);
  });

  it("clamps to max when jumping far", () => {
    const maxScroll = ROWS * ROW_H - BODY_H;
    expect(clampScroll(0, 999_999, ROWS, ROW_H, BODY_H)).toBe(maxScroll);
  });

  it("returns 0 when content fits in viewport", () => {
    // 5 rows * 36 = 180 < 460 body height → no scrolling
    expect(clampScroll(0, 100, 5, ROW_H, BODY_H)).toBe(0);
  });

  it("accumulates multiple small deltas", () => {
    let scroll = 0;
    scroll = clampScroll(scroll, 36, ROWS, ROW_H, BODY_H);
    scroll = clampScroll(scroll, 36, ROWS, ROW_H, BODY_H);
    scroll = clampScroll(scroll, 36, ROWS, ROW_H, BODY_H);
    expect(scroll).toBe(108);
  });
});

/**
 * Extraction of the header/row layout split logic from Grid.tsx:
 *   headerLayouts = allLayouts.slice(0, colCount);
 *   rowLayouts    = allLayouts.slice(colCount);
 */
describe("layout split (header vs rows)", () => {
  interface MockLayout {
    row: number;
    col: number;
    y: number;
  }

  function splitLayouts(allLayouts: MockLayout[], colCount: number) {
    return {
      header: allLayouts.slice(0, colCount),
      rows: allLayouts.slice(colCount),
    };
  }

  it("splits header from rows by column count", () => {
    const layouts: MockLayout[] = [
      // 3 header cells
      { row: 0, col: 0, y: 0 },
      { row: 0, col: 1, y: 0 },
      { row: 0, col: 2, y: 0 },
      // 6 data cells (2 rows × 3 cols)
      { row: 0, col: 0, y: 40 },
      { row: 0, col: 1, y: 40 },
      { row: 0, col: 2, y: 40 },
      { row: 1, col: 0, y: 76 },
      { row: 1, col: 1, y: 76 },
      { row: 1, col: 2, y: 76 },
    ];

    const { header, rows } = splitLayouts(layouts, 3);
    expect(header).toHaveLength(3);
    expect(rows).toHaveLength(6);
  });

  it("correctly handles row index 0 collision", () => {
    // Both header and first data row have row=0, but slice-based
    // split doesn't rely on row index at all.
    const layouts: MockLayout[] = [
      { row: 0, col: 0, y: 0 }, // header
      { row: 0, col: 0, y: 40 }, // data row 0
      { row: 1, col: 0, y: 76 }, // data row 1
    ];

    const { header, rows } = splitLayouts(layouts, 1);
    expect(header).toHaveLength(1);
    expect(header[0]!.y).toBe(0); // header at y=0
    expect(rows).toHaveLength(2);
    expect(rows[0]!.y).toBe(40); // data row at y=40
  });

  it("handles empty layouts", () => {
    const { header, rows } = splitLayouts([], 3);
    expect(header).toHaveLength(0);
    expect(rows).toHaveLength(0);
  });
});

/**
 * Extraction of the WASM content_align → contentAlign normalization.
 */
describe("layout normalization (snake_case → camelCase)", () => {
  function normalizeAlign(content_align: string): "left" | "center" | "right" {
    return content_align === "Center" ? "center" : content_align === "Right" ? "right" : "left";
  }

  it("normalizes Center → center", () => {
    expect(normalizeAlign("Center")).toBe("center");
  });

  it("normalizes Right → right", () => {
    expect(normalizeAlign("Right")).toBe("right");
  });

  it("normalizes Left → left", () => {
    expect(normalizeAlign("Left")).toBe("left");
  });

  it("defaults unknown values to left", () => {
    expect(normalizeAlign("")).toBe("left");
    expect(normalizeAlign("whatever")).toBe("left");
  });
});

import { describe, expect, it } from "bun:test";
import { computeSelectionRect } from "../selection-rect";
import { LAYOUT_STRIDE } from "../../adapter/layout-reader";

/**
 * Helper to build a layout buffer for testing.
 * Each cell: [row, col, x, y, width, height, align, padT, padR, padB, padL, borT, borR, borB, borL, reserved]
 */
function buildBuffer(
  cells: { row: number; col: number; x: number; y: number; w: number; h: number }[],
): Float32Array {
  const buf = new Float32Array(cells.length * LAYOUT_STRIDE);
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i]!;
    const base = i * LAYOUT_STRIDE;
    buf[base + 0] = c.row;
    buf[base + 1] = c.col;
    buf[base + 2] = c.x;
    buf[base + 3] = c.y;
    buf[base + 4] = c.w;
    buf[base + 5] = c.h;
  }
  return buf;
}

describe("computeSelectionRect", () => {
  it("computes bounding rect for a single selected cell", () => {
    // 2 header cells + 2 data cells
    const buf = buildBuffer([
      { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },   // header
      { row: 0, col: 1, x: 100, y: 0, w: 100, h: 40 },  // header
      { row: 0, col: 0, x: 0, y: 40, w: 100, h: 36 },    // data
      { row: 0, col: 1, x: 100, y: 40, w: 100, h: 36 },  // data
    ]);

    const result = computeSelectionRect(buf, 2, 4, {
      minRow: 0, maxRow: 0, minCol: 0, maxCol: 0,
    });
    expect(result).toEqual({ x: 0, y: 40, width: 100, height: 36 });
  });

  it("computes bounding rect for a multi-cell range", () => {
    const buf = buildBuffer([
      { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },   // header
      { row: 0, col: 1, x: 100, y: 0, w: 100, h: 40 },  // header
      { row: 0, col: 0, x: 0, y: 40, w: 100, h: 36 },    // data r0c0
      { row: 0, col: 1, x: 100, y: 40, w: 100, h: 36 },  // data r0c1
      { row: 1, col: 0, x: 0, y: 76, w: 100, h: 36 },    // data r1c0
      { row: 1, col: 1, x: 100, y: 76, w: 100, h: 36 },  // data r1c1
    ]);

    const result = computeSelectionRect(buf, 2, 6, {
      minRow: 0, maxRow: 1, minCol: 0, maxCol: 1,
    });
    expect(result).toEqual({ x: 0, y: 40, width: 200, height: 72 });
  });

  it("ignores cells outside the selection range", () => {
    const buf = buildBuffer([
      { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },   // header
      { row: 0, col: 0, x: 0, y: 40, w: 100, h: 36 },    // data r0c0
      { row: 0, col: 1, x: 100, y: 40, w: 100, h: 36 },  // data r0c1
      { row: 1, col: 0, x: 0, y: 76, w: 100, h: 36 },    // data r1c0
      { row: 1, col: 1, x: 100, y: 76, w: 100, h: 36 },  // data r1c1
    ]);

    // Select only r1c1
    const result = computeSelectionRect(buf, 1, 5, {
      minRow: 1, maxRow: 1, minCol: 1, maxCol: 1,
    });
    expect(result).toEqual({ x: 100, y: 76, width: 100, height: 36 });
  });

  it("returns null when no visible cells in selection", () => {
    const buf = buildBuffer([
      { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },   // header
      { row: 0, col: 0, x: 0, y: 40, w: 100, h: 36 },    // data r0c0
    ]);

    // Select row 5 which doesn't exist in the buffer
    const result = computeSelectionRect(buf, 1, 2, {
      minRow: 5, maxRow: 5, minCol: 0, maxCol: 0,
    });
    expect(result).toBeNull();
  });

  it("returns null when buffer has only headers", () => {
    const buf = buildBuffer([
      { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },   // header
    ]);

    const result = computeSelectionRect(buf, 1, 1, {
      minRow: 0, maxRow: 0, minCol: 0, maxCol: 0,
    });
    expect(result).toBeNull();
  });

  it("handles partial column selection in a row", () => {
    const buf = buildBuffer([
      { row: 0, col: 0, x: 0, y: 0, w: 80, h: 40 },    // header
      { row: 0, col: 1, x: 80, y: 0, w: 120, h: 40 },   // header
      { row: 0, col: 2, x: 200, y: 0, w: 100, h: 40 },   // header
      { row: 0, col: 0, x: 0, y: 40, w: 80, h: 36 },     // data
      { row: 0, col: 1, x: 80, y: 40, w: 120, h: 36 },    // data
      { row: 0, col: 2, x: 200, y: 40, w: 100, h: 36 },   // data
    ]);

    // Select only col 1..2
    const result = computeSelectionRect(buf, 3, 6, {
      minRow: 0, maxRow: 0, minCol: 1, maxCol: 2,
    });
    expect(result).toEqual({ x: 80, y: 40, width: 220, height: 36 });
  });
});

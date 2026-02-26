import { describe, expect, it } from "bun:test";
import {
  LAYOUT_STRIDE,
  hitTest,
  readCellAlign,
  readCellAlignCode,
  readCellBorderBottom,
  readCellBorderLeft,
  readCellBorderRight,
  readCellBorderTop,
  readCellCol,
  readCellHeight,
  readCellPaddingBottom,
  readCellPaddingLeft,
  readCellPaddingRight,
  readCellPaddingTop,
  readCellRow,
  readCellWidth,
  readCellX,
  readCellY,
} from "../adapter/layout-reader";

/**
 * Buffer layout per cell (stride 16):
 *  [row, col, x, y, width, height, align,
 *   paddingTop, paddingRight, paddingBottom, paddingLeft,
 *   borderTop, borderRight, borderBottom, borderLeft, reserved]
 */
function makeCell(
  row: number,
  col: number,
  x: number,
  y: number,
  width: number,
  height: number,
  align: number,
  paddingTop: number,
  paddingRight: number,
  paddingBottom: number,
  paddingLeft: number,
  borderTop: number,
  borderRight: number,
  borderBottom: number,
  borderLeft: number,
): number[] {
  return [
    row,
    col,
    x,
    y,
    width,
    height,
    align,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    borderTop,
    borderRight,
    borderBottom,
    borderLeft,
    0, // reserved
  ];
}

function makeBuf(...cells: number[][]): Float32Array {
  return new Float32Array(cells.flat());
}

describe("LAYOUT_STRIDE", () => {
  it("equals 16", () => {
    expect(LAYOUT_STRIDE).toBe(16);
  });
});

describe("field readers — single cell at index 0", () => {
  // cell 0: row=3, col=5, x=10, y=20, w=200, h=40, align=1(center),
  //          pt=2, pr=4, pb=6, pl=8, bt=1, br=2, bb=3, bl=4
  const buf = makeBuf(makeCell(3, 5, 10, 20, 200, 40, 1, 2, 4, 6, 8, 1, 2, 3, 4));

  it("readCellRow", () => {
    expect(readCellRow(buf, 0)).toBe(3);
  });

  it("readCellCol", () => {
    expect(readCellCol(buf, 0)).toBe(5);
  });

  it("readCellX", () => {
    expect(readCellX(buf, 0)).toBe(10);
  });

  it("readCellY", () => {
    expect(readCellY(buf, 0)).toBe(20);
  });

  it("readCellWidth", () => {
    expect(readCellWidth(buf, 0)).toBe(200);
  });

  it("readCellHeight", () => {
    expect(readCellHeight(buf, 0)).toBe(40);
  });

  it("readCellAlignCode", () => {
    expect(readCellAlignCode(buf, 0)).toBe(1);
  });

  it("readCellPaddingTop", () => {
    expect(readCellPaddingTop(buf, 0)).toBe(2);
  });

  it("readCellPaddingRight", () => {
    expect(readCellPaddingRight(buf, 0)).toBe(4);
  });

  it("readCellPaddingBottom", () => {
    expect(readCellPaddingBottom(buf, 0)).toBe(6);
  });

  it("readCellPaddingLeft", () => {
    expect(readCellPaddingLeft(buf, 0)).toBe(8);
  });

  it("readCellBorderTop", () => {
    expect(readCellBorderTop(buf, 0)).toBe(1);
  });

  it("readCellBorderRight", () => {
    expect(readCellBorderRight(buf, 0)).toBe(2);
  });

  it("readCellBorderBottom", () => {
    expect(readCellBorderBottom(buf, 0)).toBe(3);
  });

  it("readCellBorderLeft", () => {
    expect(readCellBorderLeft(buf, 0)).toBe(4);
  });
});

describe("field readers — multiple cells, reading index > 0", () => {
  // cell 0: all zeros except row=0, col=0
  // cell 1: row=1, col=2, x=100, y=50, w=150, h=30, align=2(right),
  //          pt=5, pr=10, pb=15, pl=20, bt=3, br=6, bb=9, bl=12
  const buf = makeBuf(
    makeCell(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
    makeCell(1, 2, 100, 50, 150, 30, 2, 5, 10, 15, 20, 3, 6, 9, 12),
  );

  it("reads row from cell 1", () => {
    expect(readCellRow(buf, 1)).toBe(1);
  });

  it("reads col from cell 1", () => {
    expect(readCellCol(buf, 1)).toBe(2);
  });

  it("reads x from cell 1", () => {
    expect(readCellX(buf, 1)).toBe(100);
  });

  it("reads y from cell 1", () => {
    expect(readCellY(buf, 1)).toBe(50);
  });

  it("reads width from cell 1", () => {
    expect(readCellWidth(buf, 1)).toBe(150);
  });

  it("reads height from cell 1", () => {
    expect(readCellHeight(buf, 1)).toBe(30);
  });

  it("reads alignCode from cell 1", () => {
    expect(readCellAlignCode(buf, 1)).toBe(2);
  });

  it("reads paddingTop from cell 1", () => {
    expect(readCellPaddingTop(buf, 1)).toBe(5);
  });

  it("reads paddingRight from cell 1", () => {
    expect(readCellPaddingRight(buf, 1)).toBe(10);
  });

  it("reads paddingBottom from cell 1", () => {
    expect(readCellPaddingBottom(buf, 1)).toBe(15);
  });

  it("reads paddingLeft from cell 1", () => {
    expect(readCellPaddingLeft(buf, 1)).toBe(20);
  });

  it("reads borderTop from cell 1", () => {
    expect(readCellBorderTop(buf, 1)).toBe(3);
  });

  it("reads borderRight from cell 1", () => {
    expect(readCellBorderRight(buf, 1)).toBe(6);
  });

  it("reads borderBottom from cell 1", () => {
    expect(readCellBorderBottom(buf, 1)).toBe(9);
  });

  it("reads borderLeft from cell 1", () => {
    expect(readCellBorderLeft(buf, 1)).toBe(12);
  });
});

describe("readCellAlign", () => {
  it("returns 'left' for align code 0", () => {
    const buf = makeBuf(makeCell(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0));
    expect(readCellAlign(buf, 0)).toBe("left");
  });

  it("returns 'center' for align code 1", () => {
    const buf = makeBuf(makeCell(0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0));
    expect(readCellAlign(buf, 0)).toBe("center");
  });

  it("returns 'right' for align code 2", () => {
    const buf = makeBuf(makeCell(0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0));
    expect(readCellAlign(buf, 0)).toBe("right");
  });

  it("returns 'left' for unknown align code (defaults)", () => {
    const buf = makeBuf(makeCell(0, 0, 0, 0, 0, 0, 99, 0, 0, 0, 0, 0, 0, 0, 0));
    expect(readCellAlign(buf, 0)).toBe("left");
  });
});

describe("out-of-bounds index falls back to 0 via nullish coalescing", () => {
  const buf = makeBuf(makeCell(5, 7, 10, 20, 100, 50, 1, 2, 3, 4, 5, 1, 2, 3, 4));

  it("readCellRow returns 0 for out-of-bounds index", () => {
    expect(readCellRow(buf, 999)).toBe(0);
  });

  it("readCellCol returns 0 for out-of-bounds index", () => {
    expect(readCellCol(buf, 999)).toBe(0);
  });

  it("readCellX returns 0 for out-of-bounds index", () => {
    expect(readCellX(buf, 999)).toBe(0);
  });

  it("readCellY returns 0 for out-of-bounds index", () => {
    expect(readCellY(buf, 999)).toBe(0);
  });

  it("readCellWidth returns 0 for out-of-bounds index", () => {
    expect(readCellWidth(buf, 999)).toBe(0);
  });

  it("readCellHeight returns 0 for out-of-bounds index", () => {
    expect(readCellHeight(buf, 999)).toBe(0);
  });

  it("readCellAlignCode returns 0 for out-of-bounds index", () => {
    expect(readCellAlignCode(buf, 999)).toBe(0);
  });

  it("readCellAlign returns 'left' for out-of-bounds index", () => {
    expect(readCellAlign(buf, 999)).toBe("left");
  });

  it("readCellPaddingTop returns 0 for out-of-bounds index", () => {
    expect(readCellPaddingTop(buf, 999)).toBe(0);
  });

  it("readCellPaddingRight returns 0 for out-of-bounds index", () => {
    expect(readCellPaddingRight(buf, 999)).toBe(0);
  });

  it("readCellPaddingBottom returns 0 for out-of-bounds index", () => {
    expect(readCellPaddingBottom(buf, 999)).toBe(0);
  });

  it("readCellPaddingLeft returns 0 for out-of-bounds index", () => {
    expect(readCellPaddingLeft(buf, 999)).toBe(0);
  });

  it("readCellBorderTop returns 0 for out-of-bounds index", () => {
    expect(readCellBorderTop(buf, 999)).toBe(0);
  });

  it("readCellBorderRight returns 0 for out-of-bounds index", () => {
    expect(readCellBorderRight(buf, 999)).toBe(0);
  });

  it("readCellBorderBottom returns 0 for out-of-bounds index", () => {
    expect(readCellBorderBottom(buf, 999)).toBe(0);
  });

  it("readCellBorderLeft returns 0 for out-of-bounds index", () => {
    expect(readCellBorderLeft(buf, 999)).toBe(0);
  });
});

describe("hitTest", () => {
  // 3 cells laid out horizontally:
  //   cell 0: (10, 20) 100x50
  //   cell 1: (120, 20) 80x50
  //   cell 2: (210, 20) 60x50
  const buf = makeBuf(
    makeCell(0, 0, 10, 20, 100, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0),
    makeCell(0, 1, 120, 20, 80, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0),
    makeCell(0, 2, 210, 20, 60, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  );

  it("returns cell index when point is inside a cell", () => {
    // middle of cell 0
    expect(hitTest(buf, 0, 3, 50, 40)).toBe(0);
  });

  it("returns cell index for cell 1", () => {
    expect(hitTest(buf, 0, 3, 150, 40)).toBe(1);
  });

  it("returns cell index for cell 2", () => {
    expect(hitTest(buf, 0, 3, 240, 40)).toBe(2);
  });

  it("returns -1 when point is outside all cells", () => {
    // gap between cell 0 and cell 1
    expect(hitTest(buf, 0, 3, 115, 40)).toBe(-1);
  });

  it("returns -1 when point is above all cells", () => {
    expect(hitTest(buf, 0, 3, 50, 10)).toBe(-1);
  });

  it("returns -1 when point is below all cells", () => {
    expect(hitTest(buf, 0, 3, 50, 80)).toBe(-1);
  });

  it("hit on exact top-left corner (inclusive)", () => {
    // x=10, y=20 is the top-left of cell 0 — should hit
    expect(hitTest(buf, 0, 3, 10, 20)).toBe(0);
  });

  it("miss on exact right edge (exclusive)", () => {
    // x=110 is exactly x+width for cell 0 — should miss (< not <=)
    expect(hitTest(buf, 0, 3, 110, 40)).toBe(-1);
  });

  it("miss on exact bottom edge (exclusive)", () => {
    // y=70 is exactly y+height for cell 0 — should miss
    expect(hitTest(buf, 0, 3, 50, 70)).toBe(-1);
  });

  it("hit on pixel just inside right edge", () => {
    // x=109.9 should still be inside cell 0
    expect(hitTest(buf, 0, 3, 109.9, 40)).toBe(0);
  });

  it("hit on pixel just inside bottom edge", () => {
    // y=69.9 should still be inside cell 0
    expect(hitTest(buf, 0, 3, 50, 69.9)).toBe(0);
  });

  describe("start/count range", () => {
    it("respects start offset — skips cells before start", () => {
      // search only cells 1..2, point is in cell 0
      expect(hitTest(buf, 1, 2, 50, 40)).toBe(-1);
    });

    it("respects count — does not search cells beyond start+count", () => {
      // search only cell 0, point is in cell 2
      expect(hitTest(buf, 0, 1, 240, 40)).toBe(-1);
    });

    it("works with start > 0 and finds correct cell", () => {
      // search starting from cell 1 with count 2, point in cell 2
      expect(hitTest(buf, 1, 2, 240, 40)).toBe(2);
    });

    it("returns -1 for count=0", () => {
      expect(hitTest(buf, 0, 0, 50, 40)).toBe(-1);
    });
  });

  it("returns -1 for an empty buffer", () => {
    const empty = new Float32Array(0);
    expect(hitTest(empty, 0, 0, 50, 40)).toBe(-1);
  });
});

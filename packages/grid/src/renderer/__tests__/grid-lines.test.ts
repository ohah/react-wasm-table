import { describe, expect, it } from "bun:test";
import {
  computeHeaderLines,
  computeDataLines,
  computeHeaderLinesFromBuffer,
  computeDataLinesFromBuffer,
} from "../grid-lines";
import type { CellLayout } from "../../types";

// ── Helpers ──────────────────────────────────────────────────────────

/** Create a minimal CellLayout for testing. */
function cell(
  row: number,
  col: number,
  x: number,
  y: number,
  width: number,
  height: number,
): CellLayout {
  return { row, col, x, y, width, height };
}

/**
 * Build a Float32Array layout buffer from CellLayout objects.
 * Buffer format: stride 16 per cell [row, col, x, y, width, height, align, pt, pr, pb, pl, bt, br, bb, bl, reserved]
 */
function toBuffer(layouts: CellLayout[]): Float32Array {
  const STRIDE = 16;
  const buf = new Float32Array(layouts.length * STRIDE);
  for (let i = 0; i < layouts.length; i++) {
    const l = layouts[i]!;
    const base = i * STRIDE;
    buf[base] = l.row;
    buf[base + 1] = l.col;
    buf[base + 2] = l.x;
    buf[base + 3] = l.y;
    buf[base + 4] = l.width;
    buf[base + 5] = l.height;
  }
  return buf;
}

// ── Test data ────────────────────────────────────────────────────────

// Standard: 3 columns starting at x=0 (justify-content: start)
const HEADER_START = [
  cell(0, 0, 0, 0, 150, 40),
  cell(0, 1, 150, 0, 120, 40),
  cell(0, 2, 270, 0, 100, 40),
];

const DATA_START = [
  cell(1, 0, 0, 40, 150, 36),
  cell(1, 1, 150, 40, 120, 36),
  cell(1, 2, 270, 40, 100, 36),
  cell(2, 0, 0, 76, 150, 36),
  cell(2, 1, 150, 76, 120, 36),
  cell(2, 2, 270, 76, 100, 36),
];

// Offset: 3 columns starting at x=100 (justify-content: end with 800px container)
const HEADER_OFFSET = [
  cell(0, 0, 430, 0, 150, 40),
  cell(0, 1, 580, 0, 120, 40),
  cell(0, 2, 700, 0, 100, 40),
];

const DATA_OFFSET = [
  cell(1, 0, 430, 40, 150, 36),
  cell(1, 1, 580, 40, 120, 36),
  cell(1, 2, 700, 40, 100, 36),
];

// Space-evenly: 3 columns with gaps
const HEADER_SPACED = [
  cell(0, 0, 107, 0, 150, 40),
  cell(0, 1, 364, 0, 120, 40),
  cell(0, 2, 591, 0, 100, 40),
];

const DATA_SPACED = [
  cell(1, 0, 107, 40, 150, 36),
  cell(1, 1, 364, 40, 120, 36),
  cell(1, 2, 591, 40, 100, 36),
];

const CANVAS_W = 800;
const HEADER_H = 40;

// ── computeHeaderLines ──────────────────────────────────────────────

describe("computeHeaderLines", () => {
  it("returns empty spec for empty layouts", () => {
    const spec = computeHeaderLines([], CANVAS_W, HEADER_H);
    expect(spec.horizontal).toHaveLength(0);
    expect(spec.vertical).toHaveLength(0);
  });

  it("horizontal lines span full canvas width", () => {
    const spec = computeHeaderLines(HEADER_START, CANVAS_W, HEADER_H);
    for (const h of spec.horizontal) {
      expect(h.x1).toBe(0);
      expect(h.x2).toBe(CANVAS_W);
    }
  });

  it("has top border at y≈0 and bottom border at y≈headerHeight", () => {
    const spec = computeHeaderLines(HEADER_START, CANVAS_W, HEADER_H);
    expect(spec.horizontal[0]!.y).toBeCloseTo(0.25, 5);
    expect(spec.horizontal[1]!.y).toBeCloseTo(HEADER_H - 0.25, 5);
  });

  it("left border is at first cell's x position (start)", () => {
    const spec = computeHeaderLines(HEADER_START, CANVAS_W, HEADER_H);
    const leftBorder = spec.vertical[0]!;
    expect(leftBorder.x).toBeCloseTo(0.25, 5);
  });

  it("left border follows first cell when offset (justify-content: end)", () => {
    const spec = computeHeaderLines(HEADER_OFFSET, CANVAS_W, HEADER_H);
    const leftBorder = spec.vertical[0]!;
    expect(leftBorder.x).toBeCloseTo(430 + 0.25, 5);
  });

  it("left border follows first cell when spaced (space-evenly)", () => {
    const spec = computeHeaderLines(HEADER_SPACED, CANVAS_W, HEADER_H);
    const leftBorder = spec.vertical[0]!;
    expect(leftBorder.x).toBeCloseTo(107 + 0.25, 5);
  });

  it("has right border per column (3 cols → 3 right edges)", () => {
    const spec = computeHeaderLines(HEADER_START, CANVAS_W, HEADER_H);
    // vertical[0] = left border, vertical[1..3] = right edges
    expect(spec.vertical).toHaveLength(4); // 1 left + 3 right edges
  });

  it("rightmost border uses inset adjustment", () => {
    const spec = computeHeaderLines(HEADER_START, CANVAS_W, HEADER_H);
    const gridMaxX = 370; // 270 + 100
    const rightBorder = spec.vertical.find((v) => Math.abs(v.x - (gridMaxX - 0.25)) < 1);
    expect(rightBorder).toBeDefined();
  });
});

// ── computeDataLines ────────────────────────────────────────────────

describe("computeDataLines", () => {
  it("returns empty spec for empty layouts", () => {
    const spec = computeDataLines([], CANVAS_W);
    expect(spec.horizontal).toHaveLength(0);
    expect(spec.vertical).toHaveLength(0);
  });

  it("horizontal lines span full canvas width", () => {
    const spec = computeDataLines(DATA_START, CANVAS_W);
    for (const h of spec.horizontal) {
      expect(h.x1).toBe(0);
      expect(h.x2).toBe(CANVAS_W);
    }
  });

  it("has one horizontal line per row bottom edge", () => {
    const spec = computeDataLines(DATA_START, CANVAS_W);
    // 2 rows → 2 bottom edges (76 and 112)
    expect(spec.horizontal).toHaveLength(2);
  });

  it("left border at x=0 when cells start at 0", () => {
    const spec = computeDataLines(DATA_START, CANVAS_W);
    const leftBorder = spec.vertical[0]!;
    expect(leftBorder.x).toBeCloseTo(0.25, 5);
  });

  it("left border follows first cell when offset", () => {
    const spec = computeDataLines(DATA_OFFSET, CANVAS_W);
    const leftBorder = spec.vertical[0]!;
    expect(leftBorder.x).toBeCloseTo(430 + 0.25, 5);
  });

  it("left border follows first cell when spaced", () => {
    const spec = computeDataLines(DATA_SPACED, CANVAS_W);
    const leftBorder = spec.vertical[0]!;
    expect(leftBorder.x).toBeCloseTo(107 + 0.25, 5);
  });

  it("vertical lines span from minY to maxY", () => {
    const spec = computeDataLines(DATA_START, CANVAS_W);
    for (const v of spec.vertical) {
      expect(v.y1).toBe(40); // first row y
      expect(v.y2).toBe(112); // last row y + height
    }
  });
});

// ── Buffer-based: computeHeaderLinesFromBuffer ──────────────────────

describe("computeHeaderLinesFromBuffer", () => {
  it("matches object-based output for start-aligned cells", () => {
    const objSpec = computeHeaderLines(HEADER_START, CANVAS_W, HEADER_H);
    const bufSpec = computeHeaderLinesFromBuffer(
      toBuffer(HEADER_START),
      HEADER_START.length,
      CANVAS_W,
      HEADER_H,
    );
    expect(bufSpec.horizontal).toEqual(objSpec.horizontal);
    expect(bufSpec.vertical).toEqual(objSpec.vertical);
  });

  it("matches object-based output for offset cells", () => {
    const objSpec = computeHeaderLines(HEADER_OFFSET, CANVAS_W, HEADER_H);
    const bufSpec = computeHeaderLinesFromBuffer(
      toBuffer(HEADER_OFFSET),
      HEADER_OFFSET.length,
      CANVAS_W,
      HEADER_H,
    );
    expect(bufSpec.horizontal).toEqual(objSpec.horizontal);
    expect(bufSpec.vertical).toEqual(objSpec.vertical);
  });
});

// ── Buffer-based: computeDataLinesFromBuffer ────────────────────────

describe("computeDataLinesFromBuffer", () => {
  it("matches object-based output for start-aligned cells", () => {
    // Buffer: header + data
    const allLayouts = [...HEADER_START, ...DATA_START];
    const buf = toBuffer(allLayouts);
    const headerCount = HEADER_START.length;
    const totalCount = allLayouts.length;

    const objSpec = computeDataLines(DATA_START, CANVAS_W);
    const bufSpec = computeDataLinesFromBuffer(buf, headerCount, totalCount, CANVAS_W);

    expect(bufSpec.horizontal).toEqual(objSpec.horizontal);
    expect(bufSpec.vertical).toEqual(objSpec.vertical);
  });

  it("matches object-based output for offset cells", () => {
    const allLayouts = [...HEADER_OFFSET, ...DATA_OFFSET];
    const buf = toBuffer(allLayouts);

    const objSpec = computeDataLines(DATA_OFFSET, CANVAS_W);
    const bufSpec = computeDataLinesFromBuffer(
      buf,
      HEADER_OFFSET.length,
      allLayouts.length,
      CANVAS_W,
    );

    expect(bufSpec.horizontal).toEqual(objSpec.horizontal);
    expect(bufSpec.vertical).toEqual(objSpec.vertical);
  });

  it("returns empty when no data cells", () => {
    const buf = toBuffer(HEADER_START);
    const spec = computeDataLinesFromBuffer(
      buf,
      HEADER_START.length,
      HEADER_START.length,
      CANVAS_W,
    );
    expect(spec.horizontal).toHaveLength(0);
    expect(spec.vertical).toHaveLength(0);
  });
});

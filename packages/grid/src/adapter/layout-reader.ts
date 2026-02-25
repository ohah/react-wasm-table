/**
 * Zero-copy layout buffer reader.
 * Reads cell layout data directly from a Float32Array backed by WASM memory.
 *
 * Buffer format: each cell occupies STRIDE (16) f32 values:
 *   [row, col, x, y, width, height, align,
 *    paddingTop, paddingRight, paddingBottom, paddingLeft,
 *    borderTop, borderRight, borderBottom, borderLeft, reserved]
 *
 * Align encoding: 0=left, 1=center, 2=right
 */

const STRIDE = 16;

// Field offsets
const FIELD_ROW = 0;
const FIELD_COL = 1;
const FIELD_X = 2;
const FIELD_Y = 3;
const FIELD_WIDTH = 4;
const FIELD_HEIGHT = 5;
const FIELD_ALIGN = 6;
const FIELD_PADDING_TOP = 7;
const FIELD_PADDING_RIGHT = 8;
const FIELD_PADDING_BOTTOM = 9;
const FIELD_PADDING_LEFT = 10;
const FIELD_BORDER_TOP = 11;
const FIELD_BORDER_RIGHT = 12;
const FIELD_BORDER_BOTTOM = 13;
const FIELD_BORDER_LEFT = 14;

export { STRIDE as LAYOUT_STRIDE };

export function readCellRow(buf: Float32Array, i: number): number {
  return buf[i * STRIDE + FIELD_ROW] ?? 0;
}

export function readCellCol(buf: Float32Array, i: number): number {
  return buf[i * STRIDE + FIELD_COL] ?? 0;
}

export function readCellX(buf: Float32Array, i: number): number {
  return buf[i * STRIDE + FIELD_X] ?? 0;
}

export function readCellY(buf: Float32Array, i: number): number {
  return buf[i * STRIDE + FIELD_Y] ?? 0;
}

export function readCellWidth(buf: Float32Array, i: number): number {
  return buf[i * STRIDE + FIELD_WIDTH] ?? 0;
}

export function readCellHeight(buf: Float32Array, i: number): number {
  return buf[i * STRIDE + FIELD_HEIGHT] ?? 0;
}

/** Returns 0 (left), 1 (center), or 2 (right). */
export function readCellAlignCode(buf: Float32Array, i: number): number {
  return buf[i * STRIDE + FIELD_ALIGN] ?? 0;
}

export function readCellAlign(buf: Float32Array, i: number): "left" | "center" | "right" {
  const code = buf[i * STRIDE + FIELD_ALIGN] ?? 0;
  if (code === 1) return "center";
  if (code === 2) return "right";
  return "left";
}

export function readCellPaddingTop(buf: Float32Array, i: number): number {
  return buf[i * STRIDE + FIELD_PADDING_TOP] ?? 0;
}

export function readCellPaddingRight(buf: Float32Array, i: number): number {
  return buf[i * STRIDE + FIELD_PADDING_RIGHT] ?? 0;
}

export function readCellPaddingBottom(buf: Float32Array, i: number): number {
  return buf[i * STRIDE + FIELD_PADDING_BOTTOM] ?? 0;
}

export function readCellPaddingLeft(buf: Float32Array, i: number): number {
  return buf[i * STRIDE + FIELD_PADDING_LEFT] ?? 0;
}

export function readCellBorderTop(buf: Float32Array, i: number): number {
  return buf[i * STRIDE + FIELD_BORDER_TOP] ?? 0;
}

export function readCellBorderRight(buf: Float32Array, i: number): number {
  return buf[i * STRIDE + FIELD_BORDER_RIGHT] ?? 0;
}

export function readCellBorderBottom(buf: Float32Array, i: number): number {
  return buf[i * STRIDE + FIELD_BORDER_BOTTOM] ?? 0;
}

export function readCellBorderLeft(buf: Float32Array, i: number): number {
  return buf[i * STRIDE + FIELD_BORDER_LEFT] ?? 0;
}

/**
 * Hit-test: find the cell index containing (x, y).
 * Searches cells in range [start, start+count).
 * Returns the cell index or -1 if not found.
 */
export function hitTest(
  buf: Float32Array,
  start: number,
  count: number,
  x: number,
  y: number,
): number {
  for (let i = start; i < start + count; i++) {
    const base = i * STRIDE;
    const cx = buf[base + FIELD_X] ?? 0;
    const cy = buf[base + FIELD_Y] ?? 0;
    const cw = buf[base + FIELD_WIDTH] ?? 0;
    const ch = buf[base + FIELD_HEIGHT] ?? 0;
    if (x >= cx && x < cx + cw && y >= cy && y < cy + ch) {
      return i;
    }
  }
  return -1;
}

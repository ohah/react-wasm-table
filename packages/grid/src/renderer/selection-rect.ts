import type { NormalizedRange } from "../types";
import {
  readCellRow,
  readCellCol,
  readCellX,
  readCellY,
  readCellWidth,
  readCellHeight,
} from "../adapter/layout-reader";

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Compute the bounding rectangle for a cell selection from the layout buffer.
 * Scans data cells (headerCount..totalCount) to find the union bounding box
 * of all cells within the selection range.
 * Returns null if no visible cells fall within the selection.
 */
export function computeSelectionRect(
  buf: Float32Array,
  headerCount: number,
  totalCount: number,
  selection: NormalizedRange,
): SelectionRect | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let found = false;

  for (let i = headerCount; i < totalCount; i++) {
    const row = readCellRow(buf, i);
    const col = readCellCol(buf, i);
    if (row < selection.minRow || row > selection.maxRow) continue;
    if (col < selection.minCol || col > selection.maxCol) continue;

    const cx = readCellX(buf, i);
    const cy = readCellY(buf, i);
    const cw = readCellWidth(buf, i);
    const ch = readCellHeight(buf, i);

    minX = Math.min(minX, cx);
    minY = Math.min(minY, cy);
    maxX = Math.max(maxX, cx + cw);
    maxY = Math.max(maxY, cy + ch);
    found = true;
  }

  if (!found) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

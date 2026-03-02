import type { NormalizedRange } from "../../types";
import {
  readCellRow,
  readCellCol,
  readCellX,
  readCellY,
  readCellWidth,
  readCellHeight,
} from "../../adapter/layout-reader";

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Compute the bounding rectangle for a cell selection from the layout buffer.
 * Scans all cells (headers + data) using the unified row index written by WASM
 * (header=0, data=1+). Returns null if no visible cells fall within the selection.
 *
 * For multi-level headers, the WASM buffer stores header cells with
 * height = totalHeaderHeight. When headerRowCount > 1, this function
 * corrects header cell y/height to only cover the leaf header row.
 */
export function computeSelectionRect(
  buf: Float32Array,
  headerCount: number,
  totalCount: number,
  selection: NormalizedRange,
  headerRowCount?: number,
): SelectionRect | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let found = false;

  const hrc = headerRowCount ?? 1;

  for (let i = 0; i < totalCount; i++) {
    const row = readCellRow(buf, i);
    const col = readCellCol(buf, i);
    if (row < selection.minRow || row > selection.maxRow) continue;
    if (col < selection.minCol || col > selection.maxCol) continue;

    const cx = readCellX(buf, i);
    let cy = readCellY(buf, i);
    const cw = readCellWidth(buf, i);
    let ch = readCellHeight(buf, i);

    // For header cells in multi-level layout: WASM stores height=totalHeaderHeight
    // but selection should only highlight the leaf row.
    if (i < headerCount && hrc > 1) {
      const perRowH = ch / hrc;
      cy = cy + (hrc - 1) * perRowH; // offset to leaf row
      ch = perRowH;
    }

    minX = Math.min(minX, cx);
    minY = Math.min(minY, cy);
    maxX = Math.max(maxX, cx + cw);
    maxY = Math.max(maxY, cy + ch);
    found = true;
  }

  if (!found) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

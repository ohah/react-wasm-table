import type { CellLayout } from "../types";
import { readCellRow, readCellX, readCellY, readCellWidth } from "../adapter/layout-reader";

// ── Types ────────────────────────────────────────────────────────────

export interface HLine {
  y: number;
  x1: number;
  x2: number;
}

export interface VLine {
  x: number;
  y1: number;
  y2: number;
}

export interface GridLineSpec {
  horizontal: HLine[];
  vertical: VLine[];
}

// ── Object-based computation ─────────────────────────────────────────

/**
 * Compute header grid lines from CellLayout objects.
 * Horizontal lines span full canvasW; vertical left border sits at first cell's x.
 */
export function computeHeaderLines(
  layouts: CellLayout[],
  canvasW: number,
  headerHeight: number,
): GridLineSpec {
  if (layouts.length === 0) return { horizontal: [], vertical: [] };

  let gridMaxX = 0;
  for (const layout of layouts) {
    gridMaxX = Math.max(gridMaxX, layout.x + layout.width);
  }

  // Read header Y from layout (scrolls with content)
  const headerY = layouts[0]!.y;
  let firstX = Infinity;
  for (const layout of layouts) {
    firstX = Math.min(firstX, layout.x);
  }
  const horizontal: HLine[] = [
    { y: headerY + 0.25, x1: 0, x2: canvasW },
    { y: headerY + headerHeight - 0.25, x1: 0, x2: canvasW },
  ];

  const vertical: VLine[] = [{ x: firstX + 0.25, y1: headerY, y2: headerY + headerHeight }];

  const colEdges = new Set<number>();
  for (const layout of layouts) {
    colEdges.add(layout.x + layout.width);
  }
  for (const edge of colEdges) {
    const x = edge >= gridMaxX ? edge - 0.25 : edge + 0.5;
    vertical.push({ x, y1: headerY, y2: headerY + headerHeight });
  }

  return { horizontal, vertical };
}

/**
 * Compute data-area grid lines from CellLayout objects.
 * Horizontal lines span full canvasW; vertical left border sits at first cell's x.
 */
export function computeDataLines(layouts: CellLayout[], canvasW: number): GridLineSpec {
  if (layouts.length === 0) return { horizontal: [], vertical: [] };

  let gridMaxX = 0;
  for (const layout of layouts) {
    gridMaxX = Math.max(gridMaxX, layout.x + layout.width);
  }

  const colEdges = new Set<number>();
  const rowEdges = new Set<number>();
  let minY = Infinity;
  let maxY = -Infinity;
  let firstColX = Infinity;

  for (const layout of layouts) {
    colEdges.add(layout.x + layout.width);
    rowEdges.add(layout.y + layout.height);
    minY = Math.min(minY, layout.y);
    maxY = Math.max(maxY, layout.y + layout.height);
    firstColX = Math.min(firstColX, layout.x);
  }

  const horizontal: HLine[] = [];
  for (const edge of rowEdges) {
    // Last row bottom border: inset so the line stays fully inside the canvas
    const y = edge >= maxY ? edge - 0.5 : edge + 0.5;
    horizontal.push({ y, x1: 0, x2: canvasW });
  }

  const vertical: VLine[] = [{ x: firstColX + 0.25, y1: minY, y2: maxY }];
  for (const edge of colEdges) {
    const x = edge >= gridMaxX ? edge - 0.25 : edge + 0.5;
    vertical.push({ x, y1: minY, y2: maxY });
  }

  return { horizontal, vertical };
}

// ── Buffer-based computation ─────────────────────────────────────────

/**
 * Compute header grid lines from a layout buffer.
 */
export function computeHeaderLinesFromBuffer(
  buf: Float32Array,
  headerCount: number,
  canvasW: number,
  headerHeight: number,
): GridLineSpec {
  if (headerCount === 0) return { horizontal: [], vertical: [] };

  let gridMaxX = 0;
  for (let i = 0; i < headerCount; i++) {
    gridMaxX = Math.max(gridMaxX, readCellX(buf, i) + readCellWidth(buf, i));
  }

  // Read header Y from buffer (scrolls with content)
  const headerY = readCellY(buf, 0);
  let firstX = Infinity;
  for (let i = 0; i < headerCount; i++) {
    firstX = Math.min(firstX, readCellX(buf, i));
  }
  const horizontal: HLine[] = [
    { y: headerY + 0.25, x1: 0, x2: canvasW },
    { y: headerY + headerHeight - 0.25, x1: 0, x2: canvasW },
  ];

  const vertical: VLine[] = [{ x: firstX + 0.25, y1: headerY, y2: headerY + headerHeight }];

  const colEdges = new Set<number>();
  for (let i = 0; i < headerCount; i++) {
    colEdges.add(readCellX(buf, i) + readCellWidth(buf, i));
  }
  for (const edge of colEdges) {
    const x = edge >= gridMaxX ? edge - 0.25 : edge + 0.5;
    vertical.push({ x, y1: headerY, y2: headerY + headerHeight });
  }

  return { horizontal, vertical };
}

/**
 * Compute data-area grid lines from a layout buffer.
 */
export function computeDataLinesFromBuffer(
  buf: Float32Array,
  headerCount: number,
  totalCount: number,
  canvasW: number,
  rowHeight: number,
): GridLineSpec {
  const dataCount = totalCount - headerCount;
  if (dataCount === 0) return { horizontal: [], vertical: [] };

  let gridMaxX = 0;
  for (let i = 0; i < totalCount; i++) {
    gridMaxX = Math.max(gridMaxX, readCellX(buf, i) + readCellWidth(buf, i));
  }

  const colEdges = new Set<number>();
  let firstColX = Infinity;

  // Collect per-row minY using rowHeight for correct bounds under flex-wrap.
  // Individual cells may be shorter than the full row when wrapped.
  const rowMinY = new Map<number, number>();
  for (let i = headerCount; i < totalCount; i++) {
    const x = readCellX(buf, i);
    const w = readCellWidth(buf, i);
    const row = readCellRow(buf, i);
    const cellY = readCellY(buf, i);
    colEdges.add(x + w);
    firstColX = Math.min(firstColX, x);

    if (!rowMinY.has(row)) {
      rowMinY.set(row, cellY);
    } else {
      rowMinY.set(row, Math.min(rowMinY.get(row)!, cellY));
    }
  }

  // Compute row edges and overall minY/maxY from row-level bounds
  const rowEdges = new Set<number>();
  let minY = Infinity;
  let maxY = -Infinity;
  for (const y of rowMinY.values()) {
    const bottom = y + rowHeight;
    rowEdges.add(bottom);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, bottom);
  }

  const horizontal: HLine[] = [];
  for (const edge of rowEdges) {
    // Last row bottom border: inset so the line stays fully inside the canvas
    const y = edge >= maxY ? edge - 0.5 : edge + 0.5;
    horizontal.push({ y, x1: 0, x2: canvasW });
  }

  const vertical: VLine[] = [{ x: firstColX + 0.25, y1: minY, y2: maxY }];
  for (const edge of colEdges) {
    const x = edge >= gridMaxX ? edge - 0.25 : edge + 0.5;
    vertical.push({ x, y1: minY, y2: maxY });
  }

  return { horizontal, vertical };
}

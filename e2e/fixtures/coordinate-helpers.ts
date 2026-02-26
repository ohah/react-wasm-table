/**
 * Coordinate helpers for the demo Grid layout.
 *
 * These constants must match the column definitions and grid props
 * in examples/demo/src/App.tsx.
 */

/** Column widths in pixel order (matches demo column definitions) */
export const COLUMN_WIDTHS = [70, 180, 260, 130, 180, 110, 110, 80, 80, 80];

export const HEADER_HEIGHT = 40;
export const ROW_HEIGHT = 36;
export const GRID_WIDTH = 1280;
export const GRID_HEIGHT = 600;

/** Cumulative x-offsets for each column (left edge). */
function columnLeft(col: number): number {
  let x = 0;
  for (let i = 0; i < col; i++) {
    x += COLUMN_WIDTHS[i]!;
  }
  return x;
}

/** Center point of a header cell. */
export function headerCenter(col: number): { x: number; y: number } {
  return {
    x: columnLeft(col) + COLUMN_WIDTHS[col]! / 2,
    y: HEADER_HEIGHT / 2,
  };
}

/** Center point of a visible data cell (0-indexed visible row). */
export function cellCenter(visibleRow: number, col: number): { x: number; y: number } {
  return {
    x: columnLeft(col) + COLUMN_WIDTHS[col]! / 2,
    y: HEADER_HEIGHT + visibleRow * ROW_HEIGHT + ROW_HEIGHT / 2,
  };
}

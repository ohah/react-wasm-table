import type { CellLayout, TextStyle, BadgeStyle } from "../types";

/** Draw a text cell on the canvas. */
export function drawTextCell(
  _ctx: CanvasRenderingContext2D,
  _layout: CellLayout,
  _text: string,
  _style?: Partial<TextStyle>,
): void {
  throw new Error("TODO: drawTextCell");
}

/** Draw a badge cell on the canvas. */
export function drawBadge(
  _ctx: CanvasRenderingContext2D,
  _layout: CellLayout,
  _text: string,
  _style?: Partial<BadgeStyle>,
): void {
  throw new Error("TODO: drawBadge");
}

/** Measure text width for a given font configuration. */
export function measureText(
  _ctx: CanvasRenderingContext2D,
  _text: string,
  _fontSize: number,
  _fontFamily: string,
): number {
  throw new Error("TODO: measureText");
}

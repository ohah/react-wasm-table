import type { CellLayout, TextStyle, BadgeStyle } from "../types";

const CELL_PADDING = 8;

/** Draw a text cell on the canvas. */
export function drawTextCell(
  ctx: CanvasRenderingContext2D,
  layout: CellLayout,
  text: string,
  style?: Partial<TextStyle>,
): void {
  const fontSize = style?.fontSize ?? 13;
  const fontWeight = style?.fontWeight ?? "normal";
  ctx.font = `${fontWeight} ${fontSize}px system-ui, sans-serif`;
  ctx.fillStyle = style?.color ?? "#333";
  ctx.textBaseline = "middle";

  const textY = layout.y + layout.height / 2;
  let textX: number;

  const align = layout.contentAlign ?? "left";
  if (align === "center") {
    ctx.textAlign = "center";
    textX = layout.x + layout.width / 2;
  } else if (align === "right") {
    ctx.textAlign = "right";
    textX = layout.x + layout.width - CELL_PADDING;
  } else {
    ctx.textAlign = "left";
    textX = layout.x + CELL_PADDING;
  }

  ctx.fillText(text, textX, textY, layout.width - CELL_PADDING * 2);
}

/** Draw a badge cell on the canvas. */
export function drawBadge(
  ctx: CanvasRenderingContext2D,
  layout: CellLayout,
  text: string,
  style?: Partial<BadgeStyle>,
): void {
  const bgColor = style?.backgroundColor ?? "#e0e0e0";
  const textColor = style?.color ?? "#333";
  const borderRadius = style?.borderRadius ?? 4;
  const padding = 6;

  ctx.font = "12px system-ui, sans-serif";
  const textWidth = ctx.measureText(text).width;
  const badgeWidth = textWidth + padding * 2;
  const badgeHeight = layout.height - CELL_PADDING * 2;

  const badgeX = layout.x + (layout.width - badgeWidth) / 2;
  const badgeY = layout.y + CELL_PADDING;

  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, borderRadius);
  ctx.fillStyle = bgColor;
  ctx.fill();

  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
}

/** Measure text width for a given font configuration. */
export function measureText(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
  fontFamily: string,
): number {
  ctx.font = `${fontSize}px ${fontFamily}`;
  return ctx.measureText(text).width;
}

import type { TextStyle, BadgeStyle, SparklineStyle } from "../../types";
import {
  readCellX,
  readCellY,
  readCellWidth,
  readCellHeight,
  readCellAlign,
  readCellPaddingTop,
  readCellPaddingRight,
  readCellPaddingBottom,
  readCellPaddingLeft,
} from "../../adapter/layout-reader";

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

/** Draw a text cell reading layout from a Float32Array buffer. */
export function drawTextCellFromBuffer(
  ctx: CanvasRenderingContext2D,
  buf: Float32Array,
  cellIdx: number,
  text: string,
  style?: Partial<TextStyle>,
): void {
  const fontSize = style?.fontSize ?? 13;
  const fontWeight = style?.fontWeight ?? "normal";
  ctx.font = `${fontWeight} ${fontSize}px system-ui, sans-serif`;
  ctx.fillStyle = style?.color ?? "#333";
  ctx.textBaseline = "middle";

  const x = readCellX(buf, cellIdx);
  const y = readCellY(buf, cellIdx);
  const w = readCellWidth(buf, cellIdx);
  const h = readCellHeight(buf, cellIdx);
  const align = readCellAlign(buf, cellIdx);

  const padLeft = readCellPaddingLeft(buf, cellIdx);
  const padRight = readCellPaddingRight(buf, cellIdx);
  const padTop = readCellPaddingTop(buf, cellIdx);
  const padBottom = readCellPaddingBottom(buf, cellIdx);

  const textY = y + padTop + (h - padTop - padBottom) / 2;
  let textX: number;

  if (align === "center") {
    ctx.textAlign = "center";
    textX = x + padLeft + (w - padLeft - padRight) / 2;
  } else if (align === "right") {
    ctx.textAlign = "right";
    textX = x + w - padRight;
  } else {
    ctx.textAlign = "left";
    textX = x + padLeft;
  }

  ctx.fillText(text, textX, textY, w - padLeft - padRight);
}

/** Draw a badge reading layout from a Float32Array buffer. */
export function drawBadgeFromBuffer(
  ctx: CanvasRenderingContext2D,
  buf: Float32Array,
  cellIdx: number,
  text: string,
  style?: Partial<BadgeStyle>,
): void {
  const bgColor = style?.backgroundColor ?? "#e0e0e0";
  const textColor = style?.color ?? "#333";
  const borderRadius = style?.borderRadius ?? 4;
  const padding = 6;

  const x = readCellX(buf, cellIdx);
  const y = readCellY(buf, cellIdx);
  const w = readCellWidth(buf, cellIdx);
  const h = readCellHeight(buf, cellIdx);

  const padTop = readCellPaddingTop(buf, cellIdx);
  const padBottom = readCellPaddingBottom(buf, cellIdx);

  ctx.font = "12px system-ui, sans-serif";
  const textWidth = ctx.measureText(text).width;
  const badgeWidth = textWidth + padding * 2;
  const badgeHeight = h - padTop - padBottom;

  const badgeX = x + (w - badgeWidth) / 2;
  const badgeY = y + padTop;

  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, borderRadius);
  ctx.fillStyle = bgColor;
  ctx.fill();

  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
}

/** Draw a sparkline (mini line chart) reading layout from a Float32Array buffer. */
export function drawSparklineFromBuffer(
  ctx: CanvasRenderingContext2D,
  buf: Float32Array,
  cellIdx: number,
  data: number[],
  style?: Partial<SparklineStyle>,
): void {
  const color = style?.color ?? "#333";
  const strokeWidth = style?.strokeWidth ?? 1.5;
  const variant = style?.variant ?? "line";

  const x = readCellX(buf, cellIdx);
  const y = readCellY(buf, cellIdx);
  const w = readCellWidth(buf, cellIdx);
  const h = readCellHeight(buf, cellIdx);
  const padTop = readCellPaddingTop(buf, cellIdx);
  const padRight = readCellPaddingRight(buf, cellIdx);
  const padBottom = readCellPaddingBottom(buf, cellIdx);
  const padLeft = readCellPaddingLeft(buf, cellIdx);

  const contentLeft = x + padLeft;
  const contentTop = y + padTop;
  const contentWidth = w - padLeft - padRight;
  const contentHeight = h - padTop - padBottom;

  if (data.length < 2 || contentWidth <= 0 || contentHeight <= 0) return;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = contentWidth / (data.length - 1);

  const points: { x: number; y: number }[] = data.map((v, i) => ({
    x: contentLeft + i * stepX,
    y: contentTop + contentHeight - ((v - min) / range) * contentHeight,
  }));

  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if (variant === "area") {
    ctx.beginPath();
    ctx.moveTo(points[0].x, contentTop + contentHeight);
    for (const p of points) ctx.lineTo(p.x, p.y);
    ctx.lineTo(points[points.length - 1].x, contentTop + contentHeight);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.25;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
}

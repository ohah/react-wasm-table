import type { ProgressBarInstruction } from "../../types";
import type { CellRenderer } from "./types";
import {
  readCellX,
  readCellY,
  readCellWidth,
  readCellHeight,
  readCellPaddingTop,
  readCellPaddingRight,
  readCellPaddingBottom,
  readCellPaddingLeft,
  readCellRow,
  readCellCol,
} from "../../adapter/layout-reader";

/** Per-canvas bar geometry cache. Outer key = canvas element, inner key = "row,col". */
const barGeometryCaches = new WeakMap<
  HTMLCanvasElement,
  Map<string, { barX: number; barW: number }>
>();

function getBarGeometryCache(
  canvas: HTMLCanvasElement,
): Map<string, { barX: number; barW: number }> {
  let map = barGeometryCaches.get(canvas);
  if (!map) {
    map = new Map();
    barGeometryCaches.set(canvas, map);
  }
  return map;
}

/** Retrieve cached bar geometry for a cell on the given canvas. */
export function getBarGeometry(
  key: string,
  canvas?: HTMLCanvasElement | null,
): { barX: number; barW: number } | undefined {
  if (!canvas) return undefined;
  return barGeometryCaches.get(canvas)?.get(key);
}

export const progressBarCellRenderer: CellRenderer<ProgressBarInstruction> = {
  type: "progressbar",
  cursor: "pointer",
  draw(instruction, { ctx, buf, cellIdx }) {
    const max = instruction.max ?? 100;
    const color = instruction.style?.color ?? "#2196f3";
    const bgColor = instruction.style?.backgroundColor ?? "#e0e0e0";
    const borderRadius = instruction.style?.borderRadius ?? 4;
    const barHeight = instruction.style?.height ?? 8;
    const showLabel = instruction.style?.showLabel ?? false;
    const labelColor = instruction.style?.labelColor ?? "#333";
    const labelFontSize = instruction.style?.labelFontSize ?? 11;

    const ratio = Math.min(Math.max(instruction.value / max, 0), 1);

    const x = readCellX(buf, cellIdx);
    const y = readCellY(buf, cellIdx);
    const w = readCellWidth(buf, cellIdx);
    const h = readCellHeight(buf, cellIdx);
    const padTop = readCellPaddingTop(buf, cellIdx);
    const padRight = readCellPaddingRight(buf, cellIdx);
    const padBottom = readCellPaddingBottom(buf, cellIdx);
    const padLeft = readCellPaddingLeft(buf, cellIdx);

    const contentX = x + padLeft;
    const contentW = w - padLeft - padRight;
    const contentH = h - padTop - padBottom;

    // Reserve space for label if shown
    let labelText = "";
    let labelW = 0;
    const labelGap = 6;
    if (showLabel) {
      labelText = `${Math.round(ratio * 100)}%`;
      ctx.font = `${labelFontSize}px system-ui, sans-serif`;
      labelW = ctx.measureText(labelText).width + labelGap;
    }

    const barW = contentW - labelW;
    const barY = y + padTop + (contentH - barHeight) / 2;

    // Cache bar geometry for click/drag editing (scoped per canvas)
    const cacheKey = `${readCellRow(buf, cellIdx)},${readCellCol(buf, cellIdx)}`;
    getBarGeometryCache(ctx.canvas).set(cacheKey, { barX: contentX, barW });

    // Background bar
    ctx.beginPath();
    ctx.roundRect(contentX, barY, barW, barHeight, borderRadius);
    ctx.fillStyle = bgColor;
    ctx.fill();

    // Filled bar
    if (ratio > 0) {
      const filledW = barW * ratio;
      ctx.beginPath();
      ctx.roundRect(contentX, barY, filledW, barHeight, borderRadius);
      ctx.fillStyle = color;
      ctx.fill();
    }

    // Label
    if (showLabel) {
      ctx.fillStyle = labelColor;
      ctx.font = `${labelFontSize}px system-ui, sans-serif`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(labelText, contentX + barW + labelGap, y + padTop + contentH / 2);
    }
  },
};

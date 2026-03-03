import type { ColorInstruction } from "../../types";
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
} from "../../adapter/layout-reader";

export const colorCellRenderer: CellRenderer<ColorInstruction> = {
  type: "color",
  draw(instruction, { ctx, buf, cellIdx }) {
    const fillColor = instruction.value;
    const borderColor = instruction.style?.borderColor;
    const borderWidth = instruction.style?.borderWidth ?? 0;
    const borderRadius = instruction.style?.borderRadius ?? 0;

    const x = readCellX(buf, cellIdx);
    const y = readCellY(buf, cellIdx);
    const w = readCellWidth(buf, cellIdx);
    const h = readCellHeight(buf, cellIdx);
    const padTop = readCellPaddingTop(buf, cellIdx);
    const padRight = readCellPaddingRight(buf, cellIdx);
    const padBottom = readCellPaddingBottom(buf, cellIdx);
    const padLeft = readCellPaddingLeft(buf, cellIdx);

    const contentH = h - padTop - padBottom;
    const size = Math.min(w - padLeft - padRight, contentH);
    const swatchX = x + padLeft + (w - padLeft - padRight - size) / 2;
    const swatchY = y + padTop + (contentH - size) / 2;

    ctx.beginPath();
    ctx.roundRect(swatchX, swatchY, size, size, borderRadius);
    ctx.fillStyle = fillColor;
    ctx.fill();

    if (borderColor && borderWidth > 0) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      ctx.stroke();
    }
  },
};

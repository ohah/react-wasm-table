import type { ChipInstruction } from "../../types";
import type { CellRenderer } from "./types";
import {
  readCellX,
  readCellY,
  readCellWidth,
  readCellHeight,
  readCellPaddingTop,
  readCellPaddingBottom,
} from "../../adapter/layout-reader";

export const chipCellRenderer: CellRenderer<ChipInstruction> = {
  type: "chip",
  draw(instruction, { ctx, buf, cellIdx }) {
    const bgColor = instruction.style?.backgroundColor ?? "#e0e0e0";
    const textColor = instruction.style?.color ?? "#333";
    const borderRadius = instruction.style?.borderRadius ?? 12;
    const closable = instruction.style?.closable ?? false;
    const padding = 6;
    const closePadding = closable ? 14 : 0;

    const x = readCellX(buf, cellIdx);
    const y = readCellY(buf, cellIdx);
    const w = readCellWidth(buf, cellIdx);
    const h = readCellHeight(buf, cellIdx);
    const padTop = readCellPaddingTop(buf, cellIdx);
    const padBottom = readCellPaddingBottom(buf, cellIdx);

    ctx.font = "12px system-ui, sans-serif";
    const textWidth = ctx.measureText(instruction.value).width;
    const chipWidth = textWidth + padding * 2 + closePadding;
    const chipHeight = h - padTop - padBottom;

    const chipX = x + (w - chipWidth) / 2;
    const chipY = y + padTop;

    ctx.beginPath();
    ctx.roundRect(chipX, chipY, chipWidth, chipHeight, borderRadius);
    ctx.fillStyle = bgColor;
    ctx.fill();

    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const textCenterX = chipX + padding + textWidth / 2;
    ctx.fillText(instruction.value, textCenterX, chipY + chipHeight / 2);

    if (closable) {
      ctx.fillStyle = textColor;
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText("×", chipX + chipWidth - padding - 4, chipY + chipHeight / 2);
    }
  },
};

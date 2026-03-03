import type { TagInstruction } from "../../types";
import type { CellRenderer } from "./types";
import {
  readCellX,
  readCellY,
  readCellWidth,
  readCellHeight,
  readCellPaddingTop,
  readCellPaddingBottom,
} from "../../adapter/layout-reader";

export const tagCellRenderer: CellRenderer<TagInstruction> = {
  type: "tag",
  draw(instruction, { ctx, buf, cellIdx }) {
    const textColor = instruction.style?.color ?? "#333";
    const borderColor = instruction.style?.borderColor ?? textColor;
    const borderRadius = instruction.style?.borderRadius ?? 4;
    const fontSize = instruction.style?.fontSize ?? 12;
    const padding = 6;

    const x = readCellX(buf, cellIdx);
    const y = readCellY(buf, cellIdx);
    const w = readCellWidth(buf, cellIdx);
    const h = readCellHeight(buf, cellIdx);
    const padTop = readCellPaddingTop(buf, cellIdx);
    const padBottom = readCellPaddingBottom(buf, cellIdx);

    ctx.font = `${fontSize}px system-ui, sans-serif`;
    const textWidth = ctx.measureText(instruction.value).width;
    const tagWidth = textWidth + padding * 2;
    const tagHeight = h - padTop - padBottom;

    const tagX = x + (w - tagWidth) / 2;
    const tagY = y + padTop;

    ctx.beginPath();
    ctx.roundRect(tagX, tagY, tagWidth, tagHeight, borderRadius);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(instruction.value, tagX + tagWidth / 2, tagY + tagHeight / 2);
  },
};

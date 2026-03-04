import type { IconInstruction } from "../../types";
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

export const iconCellRenderer: CellRenderer<IconInstruction> = {
  type: "icon",
  draw(instruction, { ctx, buf, cellIdx, theme }) {
    const size = instruction.style?.size ?? 24;
    const color = instruction.style?.color ?? theme.cellColor;
    const viewBox = instruction.style?.viewBox ?? 24;

    const x = readCellX(buf, cellIdx);
    const y = readCellY(buf, cellIdx);
    const w = readCellWidth(buf, cellIdx);
    const h = readCellHeight(buf, cellIdx);
    const padT = readCellPaddingTop(buf, cellIdx);
    const padR = readCellPaddingRight(buf, cellIdx);
    const padB = readCellPaddingBottom(buf, cellIdx);
    const padL = readCellPaddingLeft(buf, cellIdx);

    const contentW = w - padL - padR;
    const contentH = h - padT - padB;

    // Center the icon within the content area
    const iconX = x + padL + (contentW - size) / 2;
    const iconY = y + padT + (contentH - size) / 2;

    const scale = size / viewBox;

    ctx.save();
    ctx.translate(iconX, iconY);
    ctx.scale(scale, scale);

    const path2d = new Path2D(instruction.path);
    ctx.fillStyle = color;
    ctx.fill(path2d);

    ctx.restore();
  },
};

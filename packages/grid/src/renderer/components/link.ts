import type { LinkInstruction } from "../../types";
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

export const linkCellRenderer: CellRenderer<LinkInstruction> = {
  type: "link",
  cursor: "pointer",
  onCellClick(instruction) {
    const url = instruction.href ?? instruction.value;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  },
  draw(instruction, { ctx, buf, cellIdx }) {
    const color = instruction.style?.color ?? "#2563eb";
    const fontSize = instruction.style?.fontSize ?? 13;
    const underline = instruction.style?.underline ?? true;

    const x = readCellX(buf, cellIdx);
    const y = readCellY(buf, cellIdx);
    const w = readCellWidth(buf, cellIdx);
    const h = readCellHeight(buf, cellIdx);
    const padTop = readCellPaddingTop(buf, cellIdx);
    const padRight = readCellPaddingRight(buf, cellIdx);
    const padBottom = readCellPaddingBottom(buf, cellIdx);
    const padLeft = readCellPaddingLeft(buf, cellIdx);

    ctx.font = `${fontSize}px system-ui, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    const contentH = h - padTop - padBottom;
    const textX = x + padLeft;
    const textY = y + padTop + contentH / 2;
    const maxWidth = w - padLeft - padRight;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    ctx.fillText(instruction.value, textX, textY);

    if (underline) {
      const textWidth = Math.min(ctx.measureText(instruction.value).width, maxWidth);
      const lineY = textY + fontSize * 0.4;
      ctx.beginPath();
      ctx.moveTo(textX, lineY);
      ctx.lineTo(textX + textWidth, lineY);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  },
};

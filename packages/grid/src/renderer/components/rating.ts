import type { RatingInstruction } from "../../types";
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

export const ratingCellRenderer: CellRenderer<RatingInstruction> = {
  type: "rating",
  draw(instruction, { ctx, buf, cellIdx }) {
    const max = instruction.style?.max ?? 5;
    const color = instruction.style?.color ?? "#f59e0b";
    const emptyColor = instruction.style?.emptyColor ?? "#d1d5db";
    const size = instruction.style?.size ?? 14;
    const filled = Math.round(Math.min(Math.max(instruction.value, 0), max));

    const x = readCellX(buf, cellIdx);
    const y = readCellY(buf, cellIdx);
    const w = readCellWidth(buf, cellIdx);
    const h = readCellHeight(buf, cellIdx);
    const padTop = readCellPaddingTop(buf, cellIdx);
    const padRight = readCellPaddingRight(buf, cellIdx);
    const padBottom = readCellPaddingBottom(buf, cellIdx);
    const padLeft = readCellPaddingLeft(buf, cellIdx);

    const stars = "★".repeat(filled) + "☆".repeat(max - filled);

    ctx.font = `${size}px system-ui, sans-serif`;
    ctx.textBaseline = "middle";

    const contentH = h - padTop - padBottom;
    const textY = y + padTop + contentH / 2;

    // Draw filled stars
    let curX = x + padLeft;
    for (let i = 0; i < max; i++) {
      ctx.fillStyle = i < filled ? color : emptyColor;
      const ch = stars[i]!;
      ctx.textAlign = "left";
      ctx.fillText(ch, curX, textY, w - padLeft - padRight);
      curX += ctx.measureText(ch).width;
    }
  },
};

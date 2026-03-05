import type { InputInstruction } from "../../types";
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

export const inputCellRenderer: CellRenderer<InputInstruction> = {
  type: "input",
  cursor: "text",
  draw(instruction, { ctx, buf, cellIdx, theme }) {
    const fontSize = instruction.style?.fontSize ?? theme.fontSize;
    const fontFamily = instruction.style?.fontFamily ?? theme.fontFamily;
    const color = instruction.style?.color ?? theme.cellColor;
    const bgColor = instruction.style?.backgroundColor ?? "#fff";
    const borderColor = instruction.style?.borderColor ?? "#d1d5db";
    const borderW = instruction.style?.borderWidth ?? 1;
    const borderRadius = instruction.style?.borderRadius ?? 4;

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
    const inputH = Math.min(contentH - 4, fontSize + 12);
    const inputW = contentW - 4;
    const inputX = x + padL + 2;
    const inputY = y + padT + (contentH - inputH) / 2;

    if (instruction.disabled) {
      ctx.save();
      ctx.globalAlpha = 0.5;
    }

    // Background
    ctx.beginPath();
    ctx.roundRect(inputX, inputY, inputW, inputH, borderRadius);
    ctx.fillStyle = bgColor;
    ctx.fill();

    // Border
    if (borderW > 0) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderW;
      ctx.stroke();
    }

    // Text or placeholder
    const text = instruction.value || instruction.placeholder || "";
    const isPlaceholder = !instruction.value && !!instruction.placeholder;
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = isPlaceholder ? "#9ca3af" : color;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";

    // Clip to prevent text overflow
    ctx.save();
    ctx.beginPath();
    ctx.rect(inputX + 6, inputY, inputW - 12, inputH);
    ctx.clip();
    ctx.fillText(text, inputX + 6, inputY + inputH / 2);
    ctx.restore();

    if (instruction.disabled) {
      ctx.restore();
    }
  },
};

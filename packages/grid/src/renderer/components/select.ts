import type { SelectInstruction } from "../../types";
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

export const selectCellRenderer: CellRenderer<SelectInstruction> = {
  type: "select",
  cursor: "pointer",
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
    const selectH = Math.min(contentH - 4, fontSize + 12);
    const selectW = contentW - 4;
    const selectX = x + padL + 2;
    const selectY = y + padT + (contentH - selectH) / 2;

    if (instruction.disabled) {
      ctx.save();
      ctx.globalAlpha = 0.5;
    }

    // Background
    ctx.beginPath();
    ctx.roundRect(selectX, selectY, selectW, selectH, borderRadius);
    ctx.fillStyle = bgColor;
    ctx.fill();

    // Border
    if (borderW > 0) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderW;
      ctx.stroke();
    }

    // Current value text or placeholder
    const selectedOption = instruction.options.find((o) => o.value === instruction.value);
    const text = selectedOption?.label ?? instruction.placeholder ?? "";
    const isPlaceholder = !selectedOption && !!instruction.placeholder;
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = isPlaceholder ? "#9ca3af" : color;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";

    // Clip text (leave room for dropdown arrow)
    const arrowSpace = 20;
    ctx.save();
    ctx.beginPath();
    ctx.rect(selectX + 6, selectY, selectW - 12 - arrowSpace, selectH);
    ctx.clip();
    ctx.fillText(text, selectX + 6, selectY + selectH / 2);
    ctx.restore();

    // Dropdown arrow (▼)
    const arrowX = selectX + selectW - 16;
    const arrowY = selectY + selectH / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(arrowX - 4, arrowY - 2);
    ctx.lineTo(arrowX + 4, arrowY - 2);
    ctx.lineTo(arrowX, arrowY + 3);
    ctx.closePath();
    ctx.fill();

    if (instruction.disabled) {
      ctx.restore();
    }
  },
};

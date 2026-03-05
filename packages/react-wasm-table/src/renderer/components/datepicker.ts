import type { DatePickerInstruction } from "../../types";
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

export const datepickerCellRenderer: CellRenderer<DatePickerInstruction> = {
  type: "datepicker",
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
    const inputH = Math.max(0, Math.min(contentH - 4, fontSize + 12));
    const inputW = Math.max(0, contentW - 4);
    if (inputW === 0 || inputH === 0) return;
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

    // Calendar icon (right side)
    const iconSize = fontSize;
    const iconX = inputX + inputW - iconSize - 8;
    const iconY = inputY + (inputH - iconSize) / 2;
    drawCalendarIcon(ctx, iconX, iconY, iconSize, color);

    // Date text or placeholder
    const text = instruction.value || instruction.placeholder || "";
    const isPlaceholder = !instruction.value && !!instruction.placeholder;
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = isPlaceholder ? "#9ca3af" : color;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";

    // Clip text (leave room for icon)
    const iconSpace = iconSize + 12;
    ctx.save();
    ctx.beginPath();
    ctx.rect(inputX + 6, inputY, inputW - 12 - iconSpace, inputH);
    ctx.clip();
    ctx.fillText(text, inputX + 6, inputY + inputH / 2);
    ctx.restore();

    if (instruction.disabled) {
      ctx.restore();
    }
  },
};

/** Draw a simple calendar icon. */
function drawCalendarIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  const s = size;
  const lw = Math.max(1, s / 10);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lw;
  ctx.lineJoin = "round";

  // Calendar body
  const bodyY = y + s * 0.2;
  const bodyH = s * 0.7;
  ctx.beginPath();
  ctx.roundRect(x, bodyY, s, bodyH, lw);
  ctx.stroke();

  // Top bar
  ctx.beginPath();
  ctx.rect(x, bodyY, s, s * 0.2);
  ctx.fill();

  // Two small handle lines on top
  const handleW = lw;
  const handleH = s * 0.15;
  const h1x = x + s * 0.28;
  const h2x = x + s * 0.72;
  ctx.beginPath();
  ctx.rect(h1x - handleW / 2, y, handleW, handleH);
  ctx.rect(h2x - handleW / 2, y, handleW, handleH);
  ctx.fill();

  ctx.restore();
}

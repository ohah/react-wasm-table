import type { RadioInstruction, RenderInstruction } from "../../types";
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
import {
  measureInstructionWidth,
  measureInstructionHeight,
  makeSubCellBuf,
  encodeCompositeInput,
} from "./shared";

export const radioCellRenderer: CellRenderer<RadioInstruction> = {
  type: "radio",
  cursor: "pointer",
  draw(instruction, context) {
    const { ctx, buf, cellIdx, theme, registry, computeChildLayout } = context;
    const children = instruction.children;

    const size = instruction.style?.size ?? 16;
    const borderColor = instruction.style?.borderColor ?? "#d1d5db";
    const checkedColor = instruction.style?.checkedColor ?? "#3b82f6";
    const borderWidth = instruction.style?.borderWidth ?? 2;
    const { checked } = instruction;

    const cellX = readCellX(buf, cellIdx);
    const cellY = readCellY(buf, cellIdx);
    const cellW = readCellWidth(buf, cellIdx);
    const cellH = readCellHeight(buf, cellIdx);
    const padT = readCellPaddingTop(buf, cellIdx);
    const padR = readCellPaddingRight(buf, cellIdx);
    const padB = readCellPaddingBottom(buf, cellIdx);
    const padL = readCellPaddingLeft(buf, cellIdx);
    const contentH = cellH - padT - padB;

    if (instruction.disabled) {
      ctx.save();
      ctx.globalAlpha = 0.4;
    }

    // ── Draw radio circle ──────────────────────────────────────────

    const gap = 6;
    const radius = size / 2;
    const cx = cellX + padL + radius;
    const cy = cellY + padT + contentH / 2;

    if (checked) {
      // Blue outer circle
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = checkedColor;
      ctx.lineWidth = borderWidth;
      ctx.stroke();

      // Blue inner filled dot
      const innerRadius = radius * 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
      ctx.fillStyle = checkedColor;
      ctx.fill();
    } else {
      // White background circle + gray border
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      ctx.stroke();
    }

    // ── Draw children (Label etc.) to the right of radio ───────────

    if (children.length > 0 && registry) {
      const childWidths: number[] = [];
      const childHeights: number[] = [];
      for (const child of children) {
        childWidths.push(measureInstructionWidth(ctx, child, theme));
        childHeights.push(measureInstructionHeight(ctx, child));
      }

      const childAreaX = cellX + padL + size + gap;
      const childAreaW = cellW - padL - padR - size - gap;
      const childAreaH = contentH;

      const input = encodeCompositeInput(
        childAreaW,
        childAreaH,
        "row",
        4,
        "center",
        "start",
        [0, 0, 0, 0],
        childWidths,
        childHeights,
      );
      const positions = computeChildLayout(input);
      for (let i = 0; i < children.length; i++) {
        const child = children[i]!;
        const px = positions[i * 4]!;
        const py = positions[i * 4 + 1]!;
        const pw = positions[i * 4 + 2]!;
        const ph = positions[i * 4 + 3]!;
        const subBuf = makeSubCellBuf(childAreaX + px, cellY + padT + py, pw, ph);
        const subContext = { ...context, buf: subBuf, cellIdx: 0 };
        registry.get((child as RenderInstruction).type)?.draw(child as any, subContext);
      }
    }

    if (instruction.disabled) {
      ctx.restore();
    }
  },
};

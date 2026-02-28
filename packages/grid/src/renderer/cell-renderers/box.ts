import type { BoxInstruction, RenderInstruction } from "../../types";
import type { CellRenderer } from "../cell-renderer-types";
import { readCellX, readCellY, readCellWidth, readCellHeight } from "../../adapter/layout-reader";
import {
  rectToPx,
  measureInstructionWidth,
  measureInstructionHeight,
  makeSubCellBuf,
  encodeCompositeInput,
  FLEX_CHILD_HEIGHT,
} from "./shared";

export const boxCellRenderer: CellRenderer<BoxInstruction> = {
  type: "box",
  draw(instruction, context) {
    const { ctx, buf, cellIdx, theme, registry, computeChildLayout } = context;
    const cellX = readCellX(buf, cellIdx);
    const cellY = readCellY(buf, cellIdx);
    const cellW = readCellWidth(buf, cellIdx);
    const cellH = readCellHeight(buf, cellIdx);

    const padding = rectToPx(instruction.padding, cellW, cellH);
    const border = rectToPx(instruction.borderWidth, cellW, cellH);
    const boxSizing = instruction.boxSizing ?? "border-box";

    let innerX = cellX;
    let innerY = cellY;
    let innerW = cellW;
    let innerH = cellH;
    if (boxSizing === "border-box") {
      innerX += border.left + padding.left;
      innerY += border.top + padding.top;
      innerW -= border.left + border.right + padding.left + padding.right;
      innerH -= border.top + border.bottom + padding.top + padding.bottom;
    }

    if (instruction.backgroundColor) {
      ctx.fillStyle = instruction.backgroundColor;
      ctx.fillRect(cellX, cellY, cellW, cellH);
    }
    const bc = instruction.borderColor ?? theme.borderColor;
    if (border.top > 0 || border.right > 0 || border.bottom > 0 || border.left > 0) {
      ctx.fillStyle = bc;
      if (border.top) ctx.fillRect(cellX, cellY, cellW, border.top);
      if (border.bottom) ctx.fillRect(cellX, cellY + cellH - border.bottom, cellW, border.bottom);
      if (border.left)
        ctx.fillRect(cellX, cellY + border.top, border.left, cellH - border.top - border.bottom);
      if (border.right)
        ctx.fillRect(
          cellX + cellW - border.right,
          cellY + border.top,
          border.right,
          cellH - border.top - border.bottom,
        );
    }

    const children = instruction.children;
    if (children.length === 0 || !registry) return;

    const childWidths = children.map((c) => measureInstructionWidth(ctx, c, theme));
    const childHeights = children.map((c) => measureInstructionHeight(ctx, c));

    if (computeChildLayout) {
      // Box = vertical column layout with no gap, stretch alignment
      const input = encodeCompositeInput(
        innerW, innerH, "column", 0, "stretch", "start",
        [0, 0, 0, 0], childWidths, childHeights,
      );
      const positions = computeChildLayout(input);
      for (let i = 0; i < children.length; i++) {
        const child = children[i]!;
        const px = positions[i * 4]!;
        const py = positions[i * 4 + 1]!;
        const pw = positions[i * 4 + 2]!;
        const ph = positions[i * 4 + 3]!;
        const subBuf = makeSubCellBuf(innerX + px, innerY + py, pw, ph);
        const subContext = { ...context, buf: subBuf, cellIdx: 0 };
        registry.get((child as RenderInstruction).type)?.draw(child as any, subContext);
      }
    } else {
      // Fallback: simple vertical stack (no WASM)
      let y = innerY;
      for (let i = 0; i < children.length; i++) {
        const child = children[i]!;
        const h = childHeights[i] ?? FLEX_CHILD_HEIGHT;
        const subBuf = makeSubCellBuf(innerX, y, innerW, h);
        const subContext = { ...context, buf: subBuf, cellIdx: 0 };
        registry.get((child as RenderInstruction).type)?.draw(child as any, subContext);
        y += h;
      }
    }
  },
};

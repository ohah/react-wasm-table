import type { CheckboxInstruction, RenderInstruction } from "../../types";
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
  FLEX_CHILD_HEIGHT,
} from "./shared";

export const checkboxCellRenderer: CellRenderer<CheckboxInstruction> = {
  type: "checkbox",
  cursor: "pointer",
  draw(instruction, context) {
    const { ctx, buf, cellIdx, theme, registry, computeChildLayout } = context;
    const children = instruction.children;

    const cellX = readCellX(buf, cellIdx);
    const cellY = readCellY(buf, cellIdx);
    const cellW = readCellWidth(buf, cellIdx);
    const cellH = readCellHeight(buf, cellIdx);
    const padT = readCellPaddingTop(buf, cellIdx);
    const padB = readCellPaddingBottom(buf, cellIdx);
    const padL = readCellPaddingLeft(buf, cellIdx);
    const padR = readCellPaddingRight(buf, cellIdx);
    const contentW = cellW - padL - padR;
    const contentH = cellH - padT - padB;

    if (instruction.disabled) {
      ctx.save();
      ctx.globalAlpha = 0.4;
    }

    if (children.length === 0 || !registry) {
      if (instruction.disabled) ctx.restore();
      return;
    }

    const childWidths: number[] = [];
    const childHeights: number[] = [];
    for (const child of children) {
      childWidths.push(measureInstructionWidth(ctx, child, theme));
      childHeights.push(measureInstructionHeight(ctx, child));
    }

    if (computeChildLayout) {
      const input = encodeCompositeInput(
        cellW,
        cellH,
        "row",
        4,
        "center",
        "start",
        [padT, padR, padB, padL],
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
        const subBuf = makeSubCellBuf(cellX + px, cellY + py, pw, ph);
        const subContext = { ...context, buf: subBuf, cellIdx: 0 };
        registry.get((child as RenderInstruction).type)?.draw(child as any, subContext);
      }
    } else {
      // JS fallback: simple row layout
      const childHeight = Math.min(contentH, FLEX_CHILD_HEIGHT);
      let x = cellX + padL;
      const childY = cellY + padT + (contentH - childHeight) / 2;
      for (let i = 0; i < children.length; i++) {
        const child = children[i]!;
        const w = childWidths[i]!;
        const subBuf = makeSubCellBuf(x, childY, w, childHeight);
        const subContext = { ...context, buf: subBuf, cellIdx: 0 };
        registry.get((child as RenderInstruction).type)?.draw(child as any, subContext);
        x += w + 4;
      }
    }

    if (instruction.disabled) {
      ctx.restore();
    }
  },
};

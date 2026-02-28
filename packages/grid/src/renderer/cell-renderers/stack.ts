import type { RenderInstruction, StackInstruction } from "../../types";
import type { CellRenderer } from "../cell-renderer-types";
import {
  readCellX,
  readCellY,
  readCellWidth,
  readCellHeight,
  readCellPaddingTop,
  readCellPaddingBottom,
  readCellPaddingLeft,
  readCellPaddingRight,
} from "../../adapter/layout-reader";
import {
  measureInstructionWidth,
  measureInstructionHeight,
  makeSubCellBuf,
  encodeCompositeInput,
  FLEX_CHILD_HEIGHT,
} from "./shared";

export const stackCellRenderer: CellRenderer<StackInstruction> = {
  type: "stack",
  draw(instruction, context) {
    const { ctx, buf, cellIdx, theme, registry, computeChildLayout } = context;
    const children = instruction.children;
    if (children.length === 0 || !registry) return;

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

    const direction = instruction.direction ?? "row";
    const gap = typeof instruction.gap === "number" ? instruction.gap : 4;

    const childWidths: number[] = [];
    const childHeights: number[] = [];
    for (const child of children) {
      childWidths.push(measureInstructionWidth(ctx, child, theme));
      childHeights.push(measureInstructionHeight(ctx, child));
    }

    if (computeChildLayout) {
      const input = encodeCompositeInput(
        contentW,
        contentH,
        direction,
        gap,
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
        const subBuf = makeSubCellBuf(cellX + padL + px, cellY + padT + py, pw, ph);
        const subContext = { ...context, buf: subBuf, cellIdx: 0 };
        registry.get((child as RenderInstruction).type)?.draw(child as any, subContext);
      }
    } else {
      const isRow = direction === "row";
      if (isRow) {
        let x = cellX + padL;
        const childHeight = Math.min(contentH, FLEX_CHILD_HEIGHT);
        const childY = cellY + padT + (contentH - childHeight) / 2;
        for (let i = 0; i < children.length; i++) {
          const child = children[i]!;
          const w = childWidths[i] ?? 0;
          const subBuf = makeSubCellBuf(x, childY, w, childHeight);
          const subContext = { ...context, buf: subBuf, cellIdx: 0 };
          registry.get((child as RenderInstruction).type)?.draw(child as any, subContext);
          x += w + gap;
        }
      } else {
        let y = cellY + padT;
        for (let i = 0; i < children.length; i++) {
          const child = children[i]!;
          const w = childWidths[i] ?? contentW;
          const h = childHeights[i] ?? FLEX_CHILD_HEIGHT;
          const subBuf = makeSubCellBuf(cellX + padL, y, w, h);
          const subContext = { ...context, buf: subBuf, cellIdx: 0 };
          registry.get((child as RenderInstruction).type)?.draw(child as any, subContext);
          y += h + gap;
        }
      }
    }
  },
};

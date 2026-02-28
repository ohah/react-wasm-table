import type { FlexInstruction, RenderInstruction } from "../../types";
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
  FLEX_CHILD_HEIGHT,
} from "./shared";

export const flexCellRenderer: CellRenderer<FlexInstruction> = {
  type: "flex",
  draw(instruction, context) {
    const { ctx, buf, cellIdx, theme, registry } = context;
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

    const gap = typeof instruction.gap === "number" ? instruction.gap : 4;
    const flexDir = instruction.flexDirection ?? "row";
    const align = instruction.alignItems ?? "center";
    const justify = instruction.justifyContent ?? "start";

    const isRow = flexDir === "row" || flexDir === "row-reverse";
    const childWidths: number[] = [];
    const childHeights: number[] = [];
    for (const child of children) {
      childWidths.push(measureInstructionWidth(ctx, child, theme));
      childHeights.push(measureInstructionHeight(ctx, child));
    }
    const totalW =
      childWidths.reduce((a, b) => a + b, 0) + gap * (children.length - 1);
    const totalH =
      childHeights.reduce((a, b) => a + b, 0) + gap * (children.length - 1);
    const childHeight = Math.min(contentH, FLEX_CHILD_HEIGHT);

    const order =
      flexDir === "row-reverse" || flexDir === "column-reverse"
        ? [...children].reverse()
        : children;
    const widthsOrder =
      flexDir === "row-reverse" || flexDir === "column-reverse"
        ? [...childWidths].reverse()
        : childWidths;
    const heightsOrder =
      flexDir === "row-reverse" || flexDir === "column-reverse"
        ? [...childHeights].reverse()
        : childHeights;

    if (isRow) {
      let startX: number;
      if (justify === "end") {
        startX = cellX + cellW - padR - totalW;
      } else if (justify === "center") {
        startX = cellX + padL + (contentW - totalW) / 2;
      } else {
        startX = cellX + padL;
      }
      let childY: number;
      if (align === "end") {
        childY = cellY + cellH - padB - childHeight;
      } else if (align === "center" || align === "stretch") {
        childY = cellY + padT + (contentH - childHeight) / 2;
      } else {
        childY = cellY + padT;
      }
      let x = startX;
      for (let i = 0; i < order.length; i++) {
        const child = order[i]!;
        const w = widthsOrder[i]!;
        const subBuf = makeSubCellBuf(x, childY, w, childHeight);
        const subContext = { ...context, buf: subBuf, cellIdx: 0 };
        registry.get((child as RenderInstruction).type)?.draw(child as any, subContext);
        x += w + gap;
      }
    } else {
      let startY: number;
      if (justify === "end") {
        startY = cellY + cellH - padB - totalH;
      } else if (justify === "center") {
        startY = cellY + padT + (contentH - totalH) / 2;
      } else {
        startY = cellY + padT;
      }
      let y = startY;
      for (let i = 0; i < order.length; i++) {
        const child = order[i]!;
        const cw = widthsOrder[i] ?? 0;
        const w = align === "stretch" ? contentW : cw;
        const h = heightsOrder[i] ?? FLEX_CHILD_HEIGHT;
        let childX: number;
        if (align === "end") {
          childX = cellX + cellW - padR - w;
        } else if (align === "center" || align === "stretch") {
          childX = cellX + padL + (contentW - w) / 2;
        } else {
          childX = cellX + padL;
        }
        const subBuf = makeSubCellBuf(childX, y, w, h);
        const subContext = { ...context, buf: subBuf, cellIdx: 0 };
        registry.get((child as RenderInstruction).type)?.draw(child as any, subContext);
        y += h + gap;
      }
    }
  },
};

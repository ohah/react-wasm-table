import type { TextInstruction } from "../../types";
import type { CellRenderer } from "../cell-renderer-types";
import { drawTextCellFromBuffer } from "../draw-primitives";

export const textCellRenderer: CellRenderer<TextInstruction> = {
  type: "text",
  draw(instruction, { ctx, buf, cellIdx, theme }) {
    drawTextCellFromBuffer(ctx, buf, cellIdx, instruction.value, {
      color: instruction.style?.color ?? theme.cellColor,
      fontWeight: instruction.style?.fontWeight ?? "normal",
      fontSize: instruction.style?.fontSize ?? theme.fontSize,
    });
  },
};

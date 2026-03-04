import type { LabelInstruction } from "../../types";
import type { CellRenderer } from "./types";
import { drawTextCellFromBuffer } from "../draw-primitives";

export const labelCellRenderer: CellRenderer<LabelInstruction> = {
  type: "label",
  cursor: "pointer",
  draw(instruction, { ctx, buf, cellIdx, theme }) {
    drawTextCellFromBuffer(ctx, buf, cellIdx, instruction.value, {
      color: instruction.style?.color ?? theme.cellColor,
      fontWeight: instruction.style?.fontWeight ?? "normal",
      fontSize: instruction.style?.fontSize ?? theme.fontSize,
    });
  },
};

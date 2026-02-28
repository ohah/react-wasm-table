import type { StubInstruction } from "../../types";
import type { CellRenderer } from "../cell-renderer-types";
import { drawTextCellFromBuffer } from "../draw-primitives";

export const stubCellRenderer: CellRenderer<StubInstruction> = {
  type: "stub",
  draw(instruction, { ctx, buf, cellIdx, theme }) {
    drawTextCellFromBuffer(ctx, buf, cellIdx, `[${instruction.component}]`, {
      color: "#999",
      fontWeight: "normal",
      fontSize: theme.fontSize,
    });
  },
};

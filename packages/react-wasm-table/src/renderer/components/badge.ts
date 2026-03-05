import type { BadgeInstruction } from "../../types";
import type { CellRenderer } from "./types";
import { drawBadgeFromBuffer } from "../draw-primitives";

export const badgeCellRenderer: CellRenderer<BadgeInstruction> = {
  type: "badge",
  draw(instruction, { ctx, buf, cellIdx }) {
    drawBadgeFromBuffer(ctx, buf, cellIdx, instruction.value, instruction.style);
  },
};

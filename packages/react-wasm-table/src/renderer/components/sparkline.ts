import type { SparklineInstruction } from "../../types";
import type { CellRenderer } from "./types";
import { drawSparklineFromBuffer } from "../draw-primitives";

export const sparklineCellRenderer: CellRenderer<SparklineInstruction> = {
  type: "sparkline",
  draw(instruction, { ctx, buf, cellIdx }) {
    drawSparklineFromBuffer(ctx, buf, cellIdx, instruction.data, instruction.style);
  },
};

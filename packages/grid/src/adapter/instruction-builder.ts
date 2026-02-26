import type { ColumnProps, RenderInstruction } from "../types";
import { resolveInstruction } from "../resolve-instruction";

/**
 * Builds RenderInstruction objects from cell values using column render props.
 * If no render prop is provided, creates a default text instruction.
 * Supports JSX returns (ReactElements) via resolveInstruction.
 */
export class InstructionBuilder {
  /** Build a render instruction for a cell value. */
  build(column: ColumnProps, value: unknown): RenderInstruction {
    // If the column has a render function (children), use it
    if (column.children) {
      try {
        const result = column.children(value);
        return resolveInstruction(result);
      } catch {
        // Fall through to default text
      }
      return { type: "text", value: String(value ?? "") };
    }

    // Default: plain text instruction
    return {
      type: "text",
      value: value == null ? "" : String(value),
    };
  }
}

import type { ColumnProps, RenderInstruction } from "../types";

/**
 * Builds RenderInstruction objects from cell values using column render props.
 * If no render prop is provided, creates a default text instruction.
 */
export class InstructionBuilder {
  /** Build a render instruction for a cell value. */
  build(_column: ColumnProps, _value: unknown): RenderInstruction {
    throw new Error("TODO: InstructionBuilder.build");
  }
}

import type { Theme } from "../types";

/** Context passed to each cell renderer's draw method. */
export interface CellRenderContext {
  ctx: CanvasRenderingContext2D;
  buf: Float32Array;
  cellIdx: number;
  theme: Theme;
  /** Registry to resolve child renderers (e.g. for Flex/Box). Omitted when not drawing from a registry. */
  registry?: CellRendererRegistryLike;
}

/** Minimal registry interface so renderers can draw children without importing the class. */
export interface CellRendererRegistryLike {
  get(type: string): CellRenderer<any> | undefined;
}

/** Instruction-like shape: at least a string `type` (allows custom instruction types). */
export type InstructionLike = { type: string };

/** A cell renderer that knows how to draw one instruction type onto canvas. */
export interface CellRenderer<T extends InstructionLike = InstructionLike> {
  readonly type: T["type"];
  draw(instruction: T, context: CellRenderContext): void;
}

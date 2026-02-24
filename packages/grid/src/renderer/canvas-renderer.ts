import type { CellLayout, RenderInstruction, Theme } from "../types";

/**
 * Draws the grid onto a <canvas> 2D context.
 * Receives pre-computed cell layouts from WASM and render instructions from the adapter.
 */
export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D | null = null;

  /** Bind to a canvas element. */
  attach(_canvas: HTMLCanvasElement): void {
    throw new Error("TODO: CanvasRenderer.attach");
  }

  /** Clear the entire canvas. */
  clear(): void {
    throw new Error("TODO: CanvasRenderer.clear");
  }

  /** Draw the header row. */
  drawHeader(_layouts: CellLayout[], _headers: string[], _theme: Theme): void {
    throw new Error("TODO: CanvasRenderer.drawHeader");
  }

  /** Draw data rows. */
  drawRows(_layouts: CellLayout[], _instructions: RenderInstruction[], _theme: Theme): void {
    throw new Error("TODO: CanvasRenderer.drawRows");
  }

  /** Draw grid lines. */
  drawGridLines(_layouts: CellLayout[], _theme: Theme): void {
    throw new Error("TODO: CanvasRenderer.drawGridLines");
  }

  /** Get the 2D context (or null if not attached). */
  get context(): CanvasRenderingContext2D | null {
    return this.ctx;
  }
}

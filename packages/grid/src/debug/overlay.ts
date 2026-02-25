import type { CellLayout } from "../types";

/** Render a debug overlay showing cell layout boundaries on the canvas. */
export function renderDebugOverlay(ctx: CanvasRenderingContext2D, layouts: CellLayout[]): void {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 0, 0, 0.6)";
  ctx.lineWidth = 1;
  ctx.font = "9px monospace";
  ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  for (const layout of layouts) {
    ctx.strokeRect(layout.x, layout.y, layout.width, layout.height);
    ctx.fillText(`${layout.row},${layout.col}`, layout.x + 2, layout.y + 2);
  }

  ctx.restore();
}

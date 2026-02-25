import type { CellLayout, RenderInstruction, Theme } from "../types";
import { drawTextCell, drawBadge } from "./draw-primitives";

/**
 * Draws the grid onto a <canvas> 2D context.
 * Receives pre-computed cell layouts from WASM and render instructions from the adapter.
 */
export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D | null = null;
  private canvas: HTMLCanvasElement | null = null;

  /** Bind to a canvas element with devicePixelRatio support. */
  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    this.ctx?.scale(dpr, dpr);
  }

  /** Clear the entire canvas. */
  clear(): void {
    if (!this.ctx || !this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    this.ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
  }

  /** Draw the header row. */
  drawHeader(layouts: CellLayout[], headers: string[], theme: Theme): void {
    const ctx = this.ctx;
    if (!ctx) return;

    // Draw header background
    if (layouts.length > 0) {
      const firstLayout = layouts[0]!;
      const lastLayout = layouts[layouts.length - 1]!;
      const totalWidth = lastLayout.x + lastLayout.width;
      ctx.fillStyle = theme.headerBackground;
      ctx.fillRect(0, firstLayout.y, totalWidth, firstLayout.height);
    }

    // Draw header text
    for (let i = 0; i < layouts.length; i++) {
      const layout = layouts[i]!;
      const text = headers[i] ?? "";
      drawTextCell(ctx, layout, text, {
        color: theme.headerColor,
        fontWeight: "bold",
        fontSize: theme.headerFontSize,
      });
    }

    // Draw bottom border
    if (layouts.length > 0) {
      const first = layouts[0]!;
      const last = layouts[layouts.length - 1]!;
      ctx.strokeStyle = theme.borderColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, first.y + first.height + 0.5);
      ctx.lineTo(last.x + last.width, first.y + first.height + 0.5);
      ctx.stroke();
    }
  }

  /** Draw data rows. Clips to the area below headerHeight to prevent overlap. */
  drawRows(
    layouts: CellLayout[],
    instructions: RenderInstruction[],
    theme: Theme,
    headerHeight: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const canvasW = this.canvas.width / dpr;
    const canvasH = this.canvas.height / dpr;

    // Clip to area below header so scrolled rows don't bleed into header
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, headerHeight, canvasW, canvasH - headerHeight);
    ctx.clip();

    // Group layouts by row for alternating backgrounds
    const rowMap = new Map<number, CellLayout[]>();
    for (const layout of layouts) {
      let list = rowMap.get(layout.row);
      if (!list) {
        list = [];
        rowMap.set(layout.row, list);
      }
      list.push(layout);
    }

    // Draw alternating row backgrounds
    for (const [rowIdx, rowLayouts] of rowMap) {
      const first = rowLayouts[0]!;
      const last = rowLayouts[rowLayouts.length - 1]!;
      const bg = rowIdx % 2 === 0 ? theme.cellBackground : `${theme.cellBackground}f5`;
      ctx.fillStyle = bg;
      ctx.fillRect(0, first.y, last.x + last.width, first.height);
    }

    // Draw cell contents
    for (let i = 0; i < layouts.length; i++) {
      const layout = layouts[i]!;
      const instruction = instructions[i];
      if (!instruction) continue;

      switch (instruction.type) {
        case "text":
          drawTextCell(ctx, layout, instruction.value, {
            color: instruction.style?.color ?? theme.cellColor,
            fontWeight: instruction.style?.fontWeight ?? "normal",
            fontSize: instruction.style?.fontSize ?? theme.fontSize,
          });
          break;
        case "badge":
          drawBadge(ctx, layout, instruction.value, instruction.style);
          break;
      }
    }

    ctx.restore();
  }

  /** Draw grid lines (vertical and horizontal). Clips data area below header. */
  drawGridLines(
    headerLayouts: CellLayout[],
    rowLayouts: CellLayout[],
    theme: Theme,
    headerHeight: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const canvasW = this.canvas.width / dpr;
    const canvasH = this.canvas.height / dpr;
    const allLayouts = [...headerLayouts, ...rowLayouts];
    if (allLayouts.length === 0) return;

    ctx.strokeStyle = theme.borderColor;
    ctx.lineWidth = 0.5;

    // --- Header grid lines (no clip needed) ---
    if (headerLayouts.length > 0) {
      const headerColEdges = new Set<number>();
      let headerMaxX = 0;
      for (const layout of headerLayouts) {
        headerColEdges.add(layout.x + layout.width);
        headerMaxX = Math.max(headerMaxX, layout.x + layout.width);
      }
      ctx.beginPath();
      for (const edge of headerColEdges) {
        ctx.moveTo(edge + 0.5, 0);
        ctx.lineTo(edge + 0.5, headerHeight);
      }
      ctx.stroke();
    }

    // --- Data area grid lines (clipped below header) ---
    if (rowLayouts.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, headerHeight, canvasW, canvasH - headerHeight);
      ctx.clip();

      const colEdges = new Set<number>();
      const rowEdges = new Set<number>();
      let maxX = 0;

      for (const layout of rowLayouts) {
        colEdges.add(layout.x + layout.width);
        rowEdges.add(layout.y + layout.height);
        maxX = Math.max(maxX, layout.x + layout.width);
      }

      const minY = Math.min(...rowLayouts.map((l) => l.y));
      const maxY = Math.max(...rowLayouts.map((l) => l.y + l.height));

      // Vertical lines
      ctx.beginPath();
      for (const edge of colEdges) {
        ctx.moveTo(edge + 0.5, minY);
        ctx.lineTo(edge + 0.5, maxY);
      }
      ctx.stroke();

      // Horizontal lines
      ctx.beginPath();
      for (const edge of rowEdges) {
        ctx.moveTo(0, edge + 0.5);
        ctx.lineTo(maxX, edge + 0.5);
      }
      ctx.stroke();

      ctx.restore();
    }
  }

  /** Get the 2D context (or null if not attached). */
  get context(): CanvasRenderingContext2D | null {
    return this.ctx;
  }
}

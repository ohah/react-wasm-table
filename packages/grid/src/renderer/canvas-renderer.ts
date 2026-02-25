import type { CellLayout, RenderInstruction, Theme } from "../types";
import {
  drawTextCell,
  drawBadge,
  drawTextCellFromBuffer,
  drawBadgeFromBuffer,
} from "./draw-primitives";
import {
  computeHeaderLines,
  computeDataLines,
  computeHeaderLinesFromBuffer,
  computeDataLinesFromBuffer,
  type GridLineSpec,
} from "./grid-lines";
import {
  readCellRow,
  readCellY,
  readCellHeight,
} from "../adapter/layout-reader";

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

  /** Get logical canvas width (CSS pixels). */
  private canvasWidth(): number {
    if (!this.canvas) return 0;
    const dpr = window.devicePixelRatio || 1;
    return this.canvas.width / dpr;
  }

  /** Get logical canvas height (CSS pixels). */
  private canvasHeight(): number {
    if (!this.canvas) return 0;
    const dpr = window.devicePixelRatio || 1;
    return this.canvas.height / dpr;
  }

  /** Stroke a GridLineSpec onto the canvas context. */
  private strokeLines(ctx: CanvasRenderingContext2D, spec: GridLineSpec): void {
    ctx.beginPath();
    for (const h of spec.horizontal) {
      ctx.moveTo(h.x1, h.y);
      ctx.lineTo(h.x2, h.y);
    }
    for (const v of spec.vertical) {
      ctx.moveTo(v.x, v.y1);
      ctx.lineTo(v.x, v.y2);
    }
    ctx.stroke();
  }

  /** Draw the header row. */
  drawHeader(layouts: CellLayout[], headers: string[], theme: Theme): void {
    const ctx = this.ctx;
    if (!ctx) return;

    // Draw header background (extend to full canvas width, like CSS)
    if (layouts.length > 0) {
      const canvasW = this.canvasWidth();
      const firstLayout = layouts[0]!;
      ctx.fillStyle = theme.headerBackground;
      ctx.fillRect(0, firstLayout.y, canvasW, firstLayout.height);
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

    const canvasW = this.canvasWidth();
    const canvasH = this.canvasHeight();

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

    // Draw alternating row backgrounds (extend to full canvas width)
    for (const [rowIdx, rowLayouts] of rowMap) {
      const first = rowLayouts[0]!;
      const bg = rowIdx % 2 === 0 ? theme.cellBackground : `${theme.cellBackground}f5`;
      ctx.fillStyle = bg;
      ctx.fillRect(0, first.y, canvasW, first.height);
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

    const canvasW = this.canvasWidth();
    const canvasH = this.canvasHeight();
    if (headerLayouts.length === 0 && rowLayouts.length === 0) return;

    ctx.strokeStyle = theme.borderColor;
    ctx.lineWidth = 0.5;

    // Header grid lines (no clip needed)
    if (headerLayouts.length > 0) {
      this.strokeLines(ctx, computeHeaderLines(headerLayouts, canvasW, headerHeight));
    }

    // Data area grid lines (clipped below header)
    if (rowLayouts.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, headerHeight, canvasW, canvasH - headerHeight);
      ctx.clip();
      this.strokeLines(ctx, computeDataLines(rowLayouts, canvasW));
      ctx.restore();
    }
  }

  // ── Buffer-based draw methods (Phase 1: zero-copy path) ──────────

  /**
   * Draw header row from a layout buffer.
   * @param buf - Float32Array view of WASM layout buffer
   * @param start - first cell index (typically 0)
   * @param count - number of header cells
   * @param headers - header label strings
   * @param theme - grid theme
   */
  drawHeaderFromBuffer(
    buf: Float32Array,
    start: number,
    count: number,
    headers: string[],
    theme: Theme,
  ): void {
    const ctx = this.ctx;
    if (!ctx || count === 0) return;

    // Draw header background (extend to full canvas width, like CSS)
    const canvasW = this.canvasWidth();
    const firstY = readCellY(buf, start);
    const firstH = readCellHeight(buf, start);
    ctx.fillStyle = theme.headerBackground;
    ctx.fillRect(0, firstY, canvasW, firstH);

    // Draw header text
    for (let i = 0; i < count; i++) {
      const cellIdx = start + i;
      const text = headers[i] ?? "";
      drawTextCellFromBuffer(ctx, buf, cellIdx, text, {
        color: theme.headerColor,
        fontWeight: "bold",
        fontSize: theme.headerFontSize,
      });
    }
  }

  /**
   * Draw data rows from a layout buffer.
   */
  drawRowsFromBuffer(
    buf: Float32Array,
    start: number,
    count: number,
    getInstruction: (cellIdx: number) => RenderInstruction | undefined,
    theme: Theme,
    headerHeight: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.canvas || count === 0) return;

    const canvasW = this.canvasWidth();
    const canvasH = this.canvasHeight();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, headerHeight, canvasW, canvasH - headerHeight);
    ctx.clip();

    // Group by row for alternating backgrounds
    const rowBounds = new Map<number, { y: number; h: number }>();
    for (let i = start; i < start + count; i++) {
      const row = readCellRow(buf, i);
      if (!rowBounds.has(row)) {
        rowBounds.set(row, { y: readCellY(buf, i), h: readCellHeight(buf, i) });
      }
    }

    // Alternating row backgrounds (extend to full canvas width)
    for (const [rowIdx, bounds] of rowBounds) {
      const bg = rowIdx % 2 === 0 ? theme.cellBackground : `${theme.cellBackground}f5`;
      ctx.fillStyle = bg;
      ctx.fillRect(0, bounds.y, canvasW, bounds.h);
    }

    // Draw cell contents
    for (let i = start; i < start + count; i++) {
      const instruction = getInstruction(i);
      if (!instruction) continue;

      switch (instruction.type) {
        case "text":
          drawTextCellFromBuffer(ctx, buf, i, instruction.value, {
            color: instruction.style?.color ?? theme.cellColor,
            fontWeight: instruction.style?.fontWeight ?? "normal",
            fontSize: instruction.style?.fontSize ?? theme.fontSize,
          });
          break;
        case "badge":
          drawBadgeFromBuffer(ctx, buf, i, instruction.value, instruction.style);
          break;
      }
    }

    ctx.restore();
  }

  /**
   * Draw grid lines from a layout buffer.
   */
  drawGridLinesFromBuffer(
    buf: Float32Array,
    headerCount: number,
    totalCount: number,
    theme: Theme,
    headerHeight: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.canvas || totalCount === 0) return;

    const canvasW = this.canvasWidth();
    const canvasH = this.canvasHeight();

    ctx.strokeStyle = theme.borderColor;
    ctx.lineWidth = 0.5;

    // Header grid lines
    if (headerCount > 0) {
      this.strokeLines(
        ctx,
        computeHeaderLinesFromBuffer(buf, headerCount, canvasW, headerHeight),
      );
    }

    // Data area grid lines (clipped)
    if (totalCount > headerCount) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, headerHeight, canvasW, canvasH - headerHeight);
      ctx.clip();
      this.strokeLines(
        ctx,
        computeDataLinesFromBuffer(buf, headerCount, totalCount, canvasW),
      );
      ctx.restore();
    }
  }

  /** Get the 2D context (or null if not attached). */
  get context(): CanvasRenderingContext2D | null {
    return this.ctx;
  }
}

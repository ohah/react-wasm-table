import type { NormalizedRange, RenderInstruction, SelectionStyle, Theme } from "../types";
import type { CellRendererRegistry } from "./cell-renderer";
import { drawTextCellFromBuffer } from "./draw-primitives";
import {
  computeHeaderLinesFromBuffer,
  computeDataLinesFromBuffer,
  type GridLineSpec,
} from "./grid-lines";
import { readCellRow, readCellX, readCellY, readCellWidth } from "../adapter/layout-reader";
import { computeSelectionRect } from "./selection-rect";

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
    headerHeight: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || count === 0) return;

    // Draw header background bounded by actual cell edges.
    // Region clipping handles pinned column coverage; no need for canvasWidth floor.
    let contentLeft = Infinity;
    let contentRight = 0;
    for (let i = start; i < start + count; i++) {
      const x = readCellX(buf, i);
      contentLeft = Math.min(contentLeft, x);
      contentRight = Math.max(contentRight, x + readCellWidth(buf, i));
    }
    if (contentLeft === Infinity) contentLeft = 0;
    const headerY = count > 0 ? readCellY(buf, start) : 0;
    ctx.fillStyle = theme.headerBackground;
    ctx.fillRect(contentLeft, headerY, contentRight - contentLeft, headerHeight);

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
    rowHeight: number,
    rendererRegistry?: CellRendererRegistry,
    computeChildLayout?: (input: Float32Array) => Float32Array,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.canvas || count === 0) return;

    // Compute content bounds from actual cell edges.
    // Region clipping handles pinned column coverage; no need for canvasWidth floor.
    let contentLeft = Infinity;
    let contentRight = 0;
    for (let i = start; i < start + count; i++) {
      const x = readCellX(buf, i);
      contentLeft = Math.min(contentLeft, x);
      contentRight = Math.max(contentRight, x + readCellWidth(buf, i));
    }
    if (contentLeft === Infinity) contentLeft = 0;

    // Group by row for alternating backgrounds.
    // Use minY across all cells in a row + rowHeight for bounds —
    // with flex-wrap, individual cells may be shorter than the full row.
    const rowBounds = new Map<number, { y: number; h: number }>();
    for (let i = start; i < start + count; i++) {
      const row = readCellRow(buf, i);
      const cellY = readCellY(buf, i);
      if (!rowBounds.has(row)) {
        rowBounds.set(row, { y: cellY, h: rowHeight });
      } else {
        const b = rowBounds.get(row)!;
        b.y = Math.min(b.y, cellY);
      }
    }

    // Alternating row backgrounds (extend to full content width)
    for (const [rowIdx, bounds] of rowBounds) {
      const bg = rowIdx % 2 === 0 ? theme.cellBackground : `${theme.cellBackground}f5`;
      ctx.fillStyle = bg;
      ctx.fillRect(contentLeft, bounds.y, contentRight - contentLeft, bounds.h);
    }

    // Draw cell contents via registry dispatch
    for (let i = start; i < start + count; i++) {
      const instruction = getInstruction(i);
      if (!instruction) continue;

      const renderer = rendererRegistry?.get(instruction.type);
      if (renderer) {
        renderer.draw(instruction, {
          ctx,
          buf,
          cellIdx: i,
          theme,
          registry: rendererRegistry,
          computeChildLayout,
        });
      }
    }
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
    rowHeight: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.canvas || totalCount === 0) return;

    // Use max content right edge from actual cells for grid line extents.
    // Region clipping handles pinned column coverage; no need for canvasWidth floor.
    let contentRight = 0;
    for (let i = 0; i < totalCount; i++) {
      contentRight = Math.max(contentRight, readCellX(buf, i) + readCellWidth(buf, i));
    }

    ctx.strokeStyle = theme.borderColor;
    ctx.lineWidth = 0.5;

    // Header grid lines
    if (headerCount > 0) {
      this.strokeLines(
        ctx,
        computeHeaderLinesFromBuffer(buf, headerCount, contentRight, headerHeight),
      );
    }

    // Data area grid lines
    if (totalCount > headerCount) {
      this.strokeLines(
        ctx,
        computeDataLinesFromBuffer(buf, headerCount, totalCount, contentRight, rowHeight),
      );
    }
  }

  /**
   * Draw selection highlight over the selected cell range.
   * Should be called last (topmost layer) in the draw pass.
   */
  drawSelection(
    buf: Float32Array,
    headerCount: number,
    totalCount: number,
    selection: NormalizedRange,
    theme: Theme,
    style?: SelectionStyle,
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const rect = computeSelectionRect(buf, headerCount, totalCount, selection);
    if (!rect) return;

    // Semi-transparent fill
    ctx.fillStyle = style?.background ?? theme.selectedBackground + "80";
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

    // Border
    ctx.strokeStyle = style?.borderColor ?? "#1976d2";
    ctx.lineWidth = style?.borderWidth ?? 2;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  }

  /** Get the 2D context (or null if not attached). */
  get context(): CanvasRenderingContext2D | null {
    return this.ctx;
  }
}

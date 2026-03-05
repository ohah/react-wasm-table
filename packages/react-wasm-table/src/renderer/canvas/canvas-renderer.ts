import type {
  NormalizedRange,
  RenderInstruction,
  SelectionStyle,
  Theme,
  CellBorderConfig,
} from "../../types";
import type { CellRendererRegistry } from "../components";
import type { GridHeaderGroup } from "../../grid-instance";
import type { SortingState } from "../../tanstack-types";

import {
  computeHeaderLinesFromBuffer,
  computeDataLinesFromBuffer,
  type GridLineSpec,
} from "../grid-lines";
import {
  readCellRow,
  readCellX,
  readCellY,
  readCellWidth,
  readCellHeight,
} from "../../adapter/layout-reader";
import { computeSelectionRect } from "../selection";

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
   * Draw multi-level header rows from a layout buffer + header groups.
   * Leaf column x/width come from the WASM buffer; group header positions are
   * derived by spanning across their children's leaf cells.
   *
   * @param buf - Float32Array view of WASM layout buffer (leaf header cells start at index 0)
   * @param leafCount - number of leaf header cells in the buffer
   * @param headerGroups - multi-level header group rows (depth 0 = top)
   * @param perRowHeight - height of a single header row
   * @param theme - grid theme
   * @param sorting - current sort state (indicators on leaf headers only)
   * @param enableColumnDnD - show drag handle grip dots on leaf row
   */
  drawMultiLevelHeader(
    buf: Float32Array,
    leafCount: number,
    headerGroups: GridHeaderGroup[],
    perRowHeight: number,
    theme: Theme,
    sorting: SortingState,
    enableColumnDnD?: boolean,
  ): void {
    const ctx = this.ctx;
    if (!ctx || leafCount === 0 || headerGroups.length === 0) return;

    const totalHeaderHeight = headerGroups.length * perRowHeight;

    // Compute content bounds from leaf buffer cells
    let contentLeft = Infinity;
    let contentRight = 0;
    for (let i = 0; i < leafCount; i++) {
      const x = readCellX(buf, i);
      contentLeft = Math.min(contentLeft, x);
      contentRight = Math.max(contentRight, x + readCellWidth(buf, i));
    }
    if (contentLeft === Infinity) contentLeft = 0;

    // Base Y from the first leaf cell in buffer
    const baseY = readCellY(buf, 0);

    // Draw full header background
    ctx.fillStyle = theme.headerBackground;
    ctx.fillRect(contentLeft, baseY, contentRight - contentLeft, totalHeaderHeight);

    // DnD constants
    const HANDLE_ZONE = 20;
    const RESIZE_ZONE = 5;
    const handleReserved = enableColumnDnD ? HANDLE_ZONE + RESIZE_ZONE : 0;

    const isLeafRow = headerGroups.length - 1;

    // Iterate each header group row
    for (let rowIdx = 0; rowIdx < headerGroups.length; rowIdx++) {
      const group = headerGroups[rowIdx]!;
      const rowY = baseY + rowIdx * perRowHeight;

      // Track leaf index across headers in this row to map to buffer positions
      let leafIdx = 0;

      for (const header of group.headers) {
        const colSpan = header.colSpan;
        const rowSpan = header.rowSpan;

        // Compute x and width from leaf buffer cells
        if (leafIdx >= leafCount) break;
        const cellX = readCellX(buf, leafIdx);
        let cellW = 0;
        for (let s = 0; s < colSpan && leafIdx + s < leafCount; s++) {
          cellW += readCellWidth(buf, leafIdx + s);
        }
        const cellH = rowSpan * perRowHeight;

        // Skip placeholder headers — background already drawn, no text
        if (!header.isPlaceholder) {
          // Build label text
          let label = "";
          const colDef = header.column.columnDef;
          if (typeof colDef.header === "string") {
            label = colDef.header;
          } else if (colDef.header) {
            label = colDef.header({ column: { id: header.column.id, columnDef: colDef } }) ?? "";
          }

          // Sort indicator (leaf headers only)
          if (rowIdx === isLeafRow && header.subHeaders.length === 0) {
            const sortEntry = sorting.find((s) => s.id === header.column.id);
            if (sortEntry) {
              label = `${label} ${sortEntry.desc ? "\u25BC" : "\u25B2"}`;
            }
          }

          // Draw text centered in the merged cell
          const fontSize = theme.headerFontSize ?? 13;
          const fontWeight = "bold";
          ctx.font = `${fontWeight} ${fontSize}px system-ui, sans-serif`;
          ctx.fillStyle = theme.headerColor;
          ctx.textBaseline = "middle";
          ctx.textAlign = "center";

          const textMaxW = rowIdx === isLeafRow ? cellW - 8 - handleReserved : cellW - 8;
          const measured = ctx.measureText(label);
          const _textW = Math.min(measured.width, Math.max(0, textMaxW));
          // Clip to cell bounds
          ctx.save();
          ctx.beginPath();
          ctx.rect(cellX, rowY, cellW, cellH);
          ctx.clip();
          ctx.fillText(
            label,
            cellX + (cellW - handleReserved * (rowIdx === isLeafRow ? 1 : 0)) / 2,
            rowY + cellH / 2,
          );
          ctx.restore();
        }

        leafIdx += colSpan;
      }
    }

    // Draw drag handle grip dots on leaf row only (2 columns × 3 rows = 6 dots)
    if (enableColumnDnD) {
      const dotR = 1.5;
      const gapX = 5;
      const gapY = 4;
      const leafRowY = baseY + isLeafRow * perRowHeight;

      ctx.save();
      ctx.fillStyle = theme.headerColor;
      ctx.globalAlpha = 0.35;
      for (let i = 0; i < leafCount; i++) {
        const cx = readCellX(buf, i);
        const cw = readCellWidth(buf, i);
        const centerX = cx + cw - RESIZE_ZONE - HANDLE_ZONE / 2;
        const centerY = leafRowY + perRowHeight / 2;

        for (let r = -1; r <= 1; r++) {
          for (let c = 0; c < 2; c++) {
            ctx.beginPath();
            ctx.arc(centerX + (c - 0.5) * gapX, centerY + r * gapY, dotR, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();
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
    computeChildLayout: (input: Float32Array) => Float32Array,
    rendererRegistry?: CellRendererRegistry,
    invalidate?: () => void,
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

    // Row backgrounds (extend to full content width)
    ctx.fillStyle = theme.cellBackground;
    for (const [, bounds] of rowBounds) {
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
          invalidate,
        });
      }
    }
  }

  /**
   * Draw grid lines from a layout buffer.
   * When borderConfigMap is provided, per-cell border rendering is used for data cells.
   */
  drawGridLinesFromBuffer(
    buf: Float32Array,
    headerCount: number,
    totalCount: number,
    theme: Theme,
    headerHeight: number,
    rowHeight: number,
    borderConfigMap?: Map<number, CellBorderConfig>,
    headerRowCount?: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.canvas || totalCount === 0) return;

    // Skip all grid lines if theme border style is "none" and no per-cell overrides
    if (theme.borderStyle === "none" && !borderConfigMap) return;

    // Use max content right edge from actual cells for grid line extents.
    let contentRight = 0;
    for (let i = 0; i < totalCount; i++) {
      contentRight = Math.max(contentRight, readCellX(buf, i) + readCellWidth(buf, i));
    }

    // Header grid lines — always use uniform style (theme defaults)
    if (headerCount > 0 && theme.borderStyle !== "none") {
      ctx.strokeStyle = theme.borderColor;
      ctx.lineWidth = theme.borderWidth;
      this.strokeLines(
        ctx,
        computeHeaderLinesFromBuffer(buf, headerCount, contentRight, headerHeight, headerRowCount),
      );
    }

    // Data area grid lines
    if (totalCount > headerCount) {
      if (borderConfigMap && borderConfigMap.size > 0) {
        // Per-cell border rendering path
        this.drawPerCellBorders(ctx, buf, headerCount, totalCount, theme, borderConfigMap);
      } else if (theme.borderStyle !== "none") {
        // Fast path: uniform grid lines
        ctx.strokeStyle = theme.borderColor;
        ctx.lineWidth = theme.borderWidth;
        this.strokeLines(
          ctx,
          computeDataLinesFromBuffer(buf, headerCount, totalCount, contentRight, rowHeight),
        );
      }
    }
  }

  /**
   * Draw per-cell borders using fillRect for each border side.
   * Cells without a config entry use theme defaults.
   */
  private drawPerCellBorders(
    ctx: CanvasRenderingContext2D,
    buf: Float32Array,
    headerCount: number,
    totalCount: number,
    theme: Theme,
    borderConfigMap: Map<number, CellBorderConfig>,
  ): void {
    const defaultWidth = theme.borderWidth;
    const defaultColor = theme.borderColor;
    const defaultStyle = theme.borderStyle;

    for (let i = headerCount; i < totalCount; i++) {
      const x = readCellX(buf, i);
      const y = readCellY(buf, i);
      const w = readCellWidth(buf, i);
      const h = readCellHeight(buf, i);

      const config = borderConfigMap.get(i);

      // Top border
      const top = config?.top;
      const topWidth = top ? top.width : defaultWidth;
      const topStyle = top ? top.style : defaultStyle;
      const topColor = top ? top.color : defaultColor;
      if (topStyle !== "none" && topWidth > 0) {
        ctx.fillStyle = topColor;
        ctx.fillRect(x, y, w, topWidth);
      }

      // Right border
      const right = config?.right;
      const rightWidth = right ? right.width : defaultWidth;
      const rightStyle = right ? right.style : defaultStyle;
      const rightColor = right ? right.color : defaultColor;
      if (rightStyle !== "none" && rightWidth > 0) {
        ctx.fillStyle = rightColor;
        ctx.fillRect(x + w - rightWidth, y, rightWidth, h);
      }

      // Bottom border
      const bottom = config?.bottom;
      const bottomWidth = bottom ? bottom.width : defaultWidth;
      const bottomStyle = bottom ? bottom.style : defaultStyle;
      const bottomColor = bottom ? bottom.color : defaultColor;
      if (bottomStyle !== "none" && bottomWidth > 0) {
        ctx.fillStyle = bottomColor;
        ctx.fillRect(x, y + h - bottomWidth, w, bottomWidth);
      }

      // Left border
      const left = config?.left;
      const leftWidth = left ? left.width : defaultWidth;
      const leftStyle = left ? left.style : defaultStyle;
      const leftColor = left ? left.color : defaultColor;
      if (leftStyle !== "none" && leftWidth > 0) {
        ctx.fillStyle = leftColor;
        ctx.fillRect(x, y, leftWidth, h);
      }
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
    headerRowCount?: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const rect = computeSelectionRect(buf, headerCount, totalCount, selection, headerRowCount);
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

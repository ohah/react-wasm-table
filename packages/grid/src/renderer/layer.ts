import type {
  Theme,
  ColumnProps,
  AfterDrawContext,
  NormalizedRange,
  SelectionStyle,
  RenderInstruction,
} from "../types";
import type { CanvasRenderer } from "./canvas-renderer";
import type { CellRendererRegistry } from "./cell-renderer";

// ── Public types ────────────────────────────────────────────────────────

/** Whether the layer draws in content space (auto scroll-translate) or viewport space (screen coords). */
export type LayerSpace = "content" | "viewport";

/** Context passed to every layer's draw() method. */
export interface LayerContext {
  ctx: CanvasRenderingContext2D;
  renderer: CanvasRenderer;
  layoutBuf: Float32Array;
  viewIndices: Uint32Array | number[];
  width: number;
  height: number;
  /** Left edge of the first cell (x coordinate). */
  contentLeft: number;
  /** Right edge of the last cell (max x + width across all cells). */
  contentWidth: number;
  scrollLeft: number;
  scrollTop: number;
  headerHeight: number;
  rowHeight: number;
  headerCount: number;
  totalCellCount: number;
  dataCount: number;
  visibleRowStart: number;
  dataRowCount: number;
  columns: ColumnProps[];
  theme: Theme;
}

/** A composable layer in the render pipeline. */
export interface GridLayer {
  readonly name: string;
  readonly space: LayerSpace;
  draw(context: LayerContext): void;
}

// ── Internal-only extension ─────────────────────────────────────────────

/** Extended context for built-in layers — NOT exported to users. */
export interface InternalLayerContext extends LayerContext {
  _headersWithSort: string[];
  _getInstruction: (cellIdx: number) => RenderInstruction | undefined;
  _cellRendererRegistry: CellRendererRegistry;
  _enableSelection: boolean;
  _selection: NormalizedRange | null;
  _selectionStyle?: SelectionStyle;
  _computeChildLayout?: (input: Float32Array) => Float32Array;
}

// ── Built-in layer factories ────────────────────────────────────────────

/** Header row layer — draws header background + labels. */
export function headerLayer(): GridLayer {
  return {
    name: "header",
    space: "content",
    draw(context: LayerContext) {
      const ctx = context as InternalLayerContext;
      ctx.renderer.drawHeaderFromBuffer(
        ctx.layoutBuf,
        0,
        ctx.headerCount,
        ctx._headersWithSort,
        ctx.theme,
        ctx.headerHeight,
      );
    },
  };
}

/** Data rows layer — draws alternating backgrounds + cell content. */
export function dataLayer(): GridLayer {
  return {
    name: "data",
    space: "content",
    draw(context: LayerContext) {
      const ctx = context as InternalLayerContext;
      ctx.renderer.drawRowsFromBuffer(
        ctx.layoutBuf,
        ctx.headerCount,
        ctx.dataCount,
        ctx._getInstruction,
        ctx.theme,
        ctx.rowHeight,
        ctx._cellRendererRegistry,
        ctx._computeChildLayout,
      );
    },
  };
}

/** Grid lines layer — draws header and data grid lines. */
export function gridLinesLayer(): GridLayer {
  return {
    name: "gridLines",
    space: "content",
    draw(context: LayerContext) {
      context.renderer.drawGridLinesFromBuffer(
        context.layoutBuf,
        context.headerCount,
        context.totalCellCount,
        context.theme,
        context.headerHeight,
        context.rowHeight,
      );
    },
  };
}

/** Selection highlight layer — draws selection rectangle if enabled. */
export function selectionLayer(): GridLayer {
  return {
    name: "selection",
    space: "content",
    draw(context: LayerContext) {
      const ctx = context as InternalLayerContext;
      if (!ctx._enableSelection) return;
      if (!ctx._selection) return;
      ctx.renderer.drawSelection(
        ctx.layoutBuf,
        ctx.headerCount,
        ctx.totalCellCount,
        ctx._selection,
        ctx.theme,
        ctx._selectionStyle,
      );
    },
  };
}

// ── Default layer stack ─────────────────────────────────────────────────

/** Default layer stack matching the pre-layer hardcoded draw order. */
export const DEFAULT_LAYERS: GridLayer[] = [
  headerLayer(),
  dataLayer(),
  gridLinesLayer(),
  selectionLayer(),
];

// ── Utility: wrap onAfterDraw callback as a layer ───────────────────────

/** Wraps an onAfterDraw callback as a viewport-space layer. */
export function createAfterDrawLayer(callback: (ctx: AfterDrawContext) => void): GridLayer {
  return {
    name: "afterDraw",
    space: "viewport",
    draw(context: LayerContext) {
      callback({
        ctx: context.ctx,
        width: context.width,
        height: context.height,
        scrollTop: context.scrollTop,
        scrollLeft: context.scrollLeft,
        headerHeight: context.headerHeight,
        rowHeight: context.rowHeight,
        columns: context.columns,
        visibleRowStart: context.visibleRowStart,
        visibleRowCount: context.dataCount,
        dataRowCount: context.dataRowCount,
      });
    },
  };
}

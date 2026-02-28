import type {
  RenderInstruction,
  TextInstruction,
  BadgeInstruction,
  StubInstruction,
  FlexInstruction,
  BoxInstruction,
  Theme,
  CssRect,
  CssLength,
} from "../types";
import { drawTextCellFromBuffer, drawBadgeFromBuffer, measureText } from "./draw-primitives";
import {
  readCellX,
  readCellY,
  readCellWidth,
  readCellHeight,
  readCellPaddingTop,
  readCellPaddingBottom,
  readCellPaddingLeft,
  readCellPaddingRight,
} from "../adapter/layout-reader";
import { LAYOUT_STRIDE } from "../adapter/layout-reader";

// ── Types ──────────────────────────────────────────────────────────────

/** Context passed to each cell renderer's draw method. */
export interface CellRenderContext {
  ctx: CanvasRenderingContext2D;
  buf: Float32Array;
  cellIdx: number;
  theme: Theme;
}

/** Instruction-like shape: at least a string `type` (allows custom instruction types). */
export type InstructionLike = RenderInstruction | { type: string };

/** A cell renderer that knows how to draw one instruction type onto canvas. */
export interface CellRenderer<T extends InstructionLike = RenderInstruction> {
  readonly type: T["type"];
  draw(instruction: T, context: CellRenderContext): void;
}

// ── Registry ───────────────────────────────────────────────────────────

/** Registry that maps instruction type strings to CellRenderer instances. */
export class CellRendererRegistry {
  private renderers = new Map<string, CellRenderer<any>>();

  /** Register a renderer. If same type already exists, it is overridden. */
  register(renderer: CellRenderer<any>): void {
    this.renderers.set(renderer.type, renderer);
  }

  /** Look up a renderer by instruction type. */
  get(type: string): CellRenderer<any> | undefined {
    return this.renderers.get(type);
  }

  /** Number of registered renderers. */
  get size(): number {
    return this.renderers.size;
  }
}

/** Resolve CssLength to px; refPx used for percentage. */
function lengthToPx(v: CssLength | undefined, refPx: number): number {
  if (v === undefined) return 0;
  if (typeof v === "number") return v;
  const m = String(v).match(/^(\d+(?:\.\d+)?)%$/);
  return m ? (parseFloat(m[1]!) / 100) * refPx : 0;
}

/** Resolve CssRect<CssLength> to { top, right, bottom, left } in px. */
function rectToPx(
  rect: CssRect<CssLength> | undefined,
  refW: number,
  refH: number,
): { top: number; right: number; bottom: number; left: number } {
  if (rect === undefined) return { top: 0, right: 0, bottom: 0, left: 0 };
  if (typeof rect === "number") return { top: rect, right: rect, bottom: rect, left: rect };
  const [a, b, c, d] = rect as [CssLength?, CssLength?, CssLength?, CssLength?];
  if (rect.length === 2) {
    const top = lengthToPx(a, refH);
    const right = lengthToPx(b, refW);
    return { top, right, bottom: top, left: right };
  }
  if (rect.length === 3) {
    const top = lengthToPx(a, refH);
    const right = lengthToPx(b, refW);
    const bottom = lengthToPx(c, refH);
    return { top, right, bottom, left: right };
  }
  return {
    top: lengthToPx(a, refH),
    right: lengthToPx(b, refW),
    bottom: lengthToPx(c, refH),
    left: lengthToPx(d, refW),
  };
}

/**
 * Create a CellRendererRegistry pre-loaded with the 5 built-in renderers.
 * Optional `userRenderers` are merged on top — same type overrides built-in.
 */
export function createCellRendererRegistry(
  userRenderers?: CellRenderer<any>[],
): CellRendererRegistry {
  const registry = new CellRendererRegistry();
  registry.register(textCellRenderer);
  registry.register(badgeCellRenderer);
  registry.register(stubCellRenderer);
  registry.register(boxCellRenderer);
  registry.register(flexCellRenderer);
  if (userRenderers) {
    for (const r of userRenderers) {
      registry.register(r);
    }
  }
  return registry;
}

// ── Built-in renderers ─────────────────────────────────────────────────

/** Renders a text cell. */
export const textCellRenderer: CellRenderer<TextInstruction> = {
  type: "text",
  draw(instruction, { ctx, buf, cellIdx, theme }) {
    drawTextCellFromBuffer(ctx, buf, cellIdx, instruction.value, {
      color: instruction.style?.color ?? theme.cellColor,
      fontWeight: instruction.style?.fontWeight ?? "normal",
      fontSize: instruction.style?.fontSize ?? theme.fontSize,
    });
  },
};

/** Renders a badge cell. */
export const badgeCellRenderer: CellRenderer<BadgeInstruction> = {
  type: "badge",
  draw(instruction, { ctx, buf, cellIdx }) {
    drawBadgeFromBuffer(ctx, buf, cellIdx, instruction.value, instruction.style);
  },
};

/** Renders a stub placeholder for not-yet-implemented components. */
export const stubCellRenderer: CellRenderer<StubInstruction> = {
  type: "stub",
  draw(instruction, { ctx, buf, cellIdx, theme }) {
    drawTextCellFromBuffer(ctx, buf, cellIdx, `[${instruction.component}]`, {
      color: "#999",
      fontWeight: "normal",
      fontSize: theme.fontSize,
    });
  },
};

const FLEX_CHILD_HEIGHT = 22;
const BADGE_PADDING = 6;

/** Measure approximate width of a single instruction for flex layout. */
function measureInstructionWidth(
  ctx: CanvasRenderingContext2D,
  instruction: RenderInstruction,
  theme: Theme,
): number {
  if (instruction.type === "text") {
    const fontSize = instruction.style?.fontSize ?? theme.fontSize;
    return measureText(ctx, instruction.value, fontSize, "system-ui, sans-serif");
  }
  if (instruction.type === "badge") {
    ctx.font = "12px system-ui, sans-serif";
    const tw = ctx.measureText(instruction.value).width;
    return tw + BADGE_PADDING * 2;
  }
  if (instruction.type === "stub" || instruction.type === "box" || instruction.type === "flex") {
    return 60;
  }
  return 0;
}

/** Approximate height for flex child (row layout uses single row). */
function measureInstructionHeight(
  _ctx: CanvasRenderingContext2D,
  instruction: RenderInstruction,
): number {
  return instruction.type === "badge" ||
    instruction.type === "text" ||
    instruction.type === "stub" ||
    instruction.type === "box" ||
    instruction.type === "flex"
    ? FLEX_CHILD_HEIGHT
    : 0;
}

/** Build a single-cell layout buffer for a sub-rect (used for flex children). */
function makeSubCellBuf(x: number, y: number, w: number, h: number): Float32Array {
  const buf = new Float32Array(LAYOUT_STRIDE);
  buf[2] = x;
  buf[3] = y;
  buf[4] = w;
  buf[5] = h;
  buf[6] = 0; // align left
  // padding 0 by default (indices 7-10)
  return buf;
}

/** Renders a box container: background, border, then children in content rect (vertical stack). */
export const boxCellRenderer: CellRenderer<BoxInstruction> = {
  type: "box",
  draw(instruction, context) {
    const { ctx, buf, cellIdx, theme } = context;
    const cellX = readCellX(buf, cellIdx);
    const cellY = readCellY(buf, cellIdx);
    const cellW = readCellWidth(buf, cellIdx);
    const cellH = readCellHeight(buf, cellIdx);

    const padding = rectToPx(instruction.padding, cellW, cellH);
    const border = rectToPx(instruction.borderWidth, cellW, cellH);
    const boxSizing = instruction.boxSizing ?? "border-box";

    let innerX = cellX;
    let innerY = cellY;
    let innerW = cellW;
    let innerH = cellH;
    if (boxSizing === "border-box") {
      innerX += border.left + padding.left;
      innerY += border.top + padding.top;
      innerW -= border.left + border.right + padding.left + padding.right;
      innerH -= border.top + border.bottom + padding.top + padding.bottom;
    }

    if (instruction.backgroundColor) {
      ctx.fillStyle = instruction.backgroundColor;
      ctx.fillRect(cellX, cellY, cellW, cellH);
    }
    const bc = instruction.borderColor ?? theme.borderColor;
    if (border.top > 0 || border.right > 0 || border.bottom > 0 || border.left > 0) {
      ctx.fillStyle = bc;
      if (border.top) ctx.fillRect(cellX, cellY, cellW, border.top);
      if (border.bottom) ctx.fillRect(cellX, cellY + cellH - border.bottom, cellW, border.bottom);
      if (border.left)
        ctx.fillRect(cellX, cellY + border.top, border.left, cellH - border.top - border.bottom);
      if (border.right)
        ctx.fillRect(
          cellX + cellW - border.right,
          cellY + border.top,
          border.right,
          cellH - border.top - border.bottom,
        );
    }

    const children = instruction.children;
    if (children.length === 0) return;

    const childHeights = children.map((c) => measureInstructionHeight(ctx, c));
    let y = innerY;
    for (let i = 0; i < children.length; i++) {
      const child = children[i]!;
      const h = childHeights[i] ?? FLEX_CHILD_HEIGHT;
      const subBuf = makeSubCellBuf(innerX, y, innerW, h);
      const subContext: CellRenderContext = { ctx, buf: subBuf, cellIdx: 0, theme };
      drawChild(child, subContext);
      y += h;
    }
  },
};

/** Renders a flex container: lays out all children in a row with gap and draws each. */
export const flexCellRenderer: CellRenderer<FlexInstruction> = {
  type: "flex",
  draw(instruction, context) {
    const { ctx, buf, cellIdx, theme } = context;
    const children = instruction.children;
    if (children.length === 0) return;

    const cellX = readCellX(buf, cellIdx);
    const cellY = readCellY(buf, cellIdx);
    const cellW = readCellWidth(buf, cellIdx);
    const cellH = readCellHeight(buf, cellIdx);
    const padT = readCellPaddingTop(buf, cellIdx);
    const padB = readCellPaddingBottom(buf, cellIdx);
    const padL = readCellPaddingLeft(buf, cellIdx);
    const padR = readCellPaddingRight(buf, cellIdx);
    const contentW = cellW - padL - padR;
    const contentH = cellH - padT - padB;

    const gap = typeof instruction.gap === "number" ? instruction.gap : 4;
    const flexDir = instruction.flexDirection ?? "row";
    const align = instruction.alignItems ?? "center";
    const justify = instruction.justifyContent ?? "start";

    const isRow = flexDir === "row" || flexDir === "row-reverse";
    const childWidths: number[] = [];
    const childHeights: number[] = [];
    for (const child of children) {
      childWidths.push(measureInstructionWidth(ctx, child, theme));
      childHeights.push(measureInstructionHeight(ctx, child));
    }
    const totalW = childWidths.reduce((a, b) => a + b, 0) + gap * (children.length - 1);
    const totalH = childHeights.reduce((a, b) => a + b, 0) + gap * (children.length - 1);
    const childHeight = Math.min(contentH, FLEX_CHILD_HEIGHT);

    const order =
      flexDir === "row-reverse" || flexDir === "column-reverse"
        ? [...children].reverse()
        : children;
    const widthsOrder =
      flexDir === "row-reverse" || flexDir === "column-reverse"
        ? [...childWidths].reverse()
        : childWidths;
    const heightsOrder =
      flexDir === "row-reverse" || flexDir === "column-reverse"
        ? [...childHeights].reverse()
        : childHeights;

    if (isRow) {
      let startX: number;
      if (justify === "end") {
        startX = cellX + cellW - padR - totalW;
      } else if (justify === "center") {
        startX = cellX + padL + (contentW - totalW) / 2;
      } else {
        startX = cellX + padL;
      }
      let childY: number;
      if (align === "end") {
        childY = cellY + cellH - padB - childHeight;
      } else if (align === "center" || align === "stretch") {
        childY = cellY + padT + (contentH - childHeight) / 2;
      } else {
        childY = cellY + padT;
      }
      let x = startX;
      for (let i = 0; i < order.length; i++) {
        const child = order[i]!;
        const w = widthsOrder[i]!;
        const subBuf = makeSubCellBuf(x, childY, w, childHeight);
        const subContext: CellRenderContext = { ctx, buf: subBuf, cellIdx: 0, theme };
        drawChild(child, subContext);
        x += w + gap;
      }
    } else {
      let startY: number;
      if (justify === "end") {
        startY = cellY + cellH - padB - totalH;
      } else if (justify === "center") {
        startY = cellY + padT + (contentH - totalH) / 2;
      } else {
        startY = cellY + padT;
      }
      let y = startY;
      for (let i = 0; i < order.length; i++) {
        const child = order[i]!;
        const cw = widthsOrder[i] ?? 0;
        const w = align === "stretch" ? contentW : cw;
        const h = heightsOrder[i] ?? FLEX_CHILD_HEIGHT;
        let childX: number;
        if (align === "end") {
          childX = cellX + cellW - padR - w;
        } else if (align === "center" || align === "stretch") {
          childX = cellX + padL + (contentW - w) / 2;
        } else {
          childX = cellX + padL;
        }
        const subBuf = makeSubCellBuf(childX, y, w, h);
        const subContext: CellRenderContext = { ctx, buf: subBuf, cellIdx: 0, theme };
        drawChild(child, subContext);
        y += h + gap;
      }
    }
  },
};

function drawChild(instruction: RenderInstruction, context: CellRenderContext): void {
  if (instruction.type === "text") {
    textCellRenderer.draw(instruction, context);
  } else if (instruction.type === "badge") {
    badgeCellRenderer.draw(instruction, context);
  } else if (instruction.type === "stub") {
    stubCellRenderer.draw(instruction, context);
  } else if (instruction.type === "box") {
    boxCellRenderer.draw(instruction, context);
  } else if (instruction.type === "flex") {
    flexCellRenderer.draw(instruction, context);
  }
}

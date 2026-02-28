import type { CssRect, CssLength, RenderInstruction, Theme } from "../../types";
import { measureText } from "../draw-primitives";
import { LAYOUT_STRIDE } from "../../adapter/layout-reader";

export const FLEX_CHILD_HEIGHT = 22;
export const BADGE_PADDING = 6;

/** Resolve CssLength to px; refPx used for percentage. */
export function lengthToPx(v: CssLength | undefined, refPx: number): number {
  if (v === undefined) return 0;
  if (typeof v === "number") return v;
  const m = String(v).match(/^(\d+(?:\.\d+)?)%$/);
  return m ? (parseFloat(m[1]!) / 100) * refPx : 0;
}

/** Resolve CssRect<CssLength> to { top, right, bottom, left } in px. */
export function rectToPx(
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

/** Measure approximate width of a single instruction for flex layout. */
export function measureInstructionWidth(
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
export function measureInstructionHeight(
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
export function makeSubCellBuf(x: number, y: number, w: number, h: number): Float32Array {
  const buf = new Float32Array(LAYOUT_STRIDE);
  buf[2] = x;
  buf[3] = y;
  buf[4] = w;
  buf[5] = h;
  buf[6] = 0; // align left
  return buf;
}

import type { SwitchInstruction } from "../../types";
import type { CellRenderer } from "./types";
import {
  readCellX,
  readCellY,
  readCellWidth,
  readCellHeight,
  readCellPaddingTop,
  readCellPaddingRight,
  readCellPaddingBottom,
  readCellPaddingLeft,
  readCellRow,
  readCellCol,
} from "../../adapter/layout-reader";
import { evaluateTimingFunction, lerpColor } from "../easing";
import type { TimingFunction } from "../easing";

// ── Per-cell animation state ──────────────────────────────────────────

interface AnimState {
  targetChecked: boolean;
  startTime: number;
  fromProgress: number;
  toProgress: number;
  duration: number;
  timingFunction: TimingFunction;
}

/** Module-level animation state map. Key = "row:col". */
const animationMap = new Map<string, AnimState>();

/** @internal Exposed for testing only. */
export function _getAnimationMap(): Map<string, AnimState> {
  return animationMap;
}

export const switchCellRenderer: CellRenderer<SwitchInstruction> = {
  type: "switch",
  cursor: "pointer",
  draw(instruction, { ctx, buf, cellIdx, invalidate }) {
    const trackColor = instruction.style?.trackColor ?? "#d1d5db";
    const activeTrackColor = instruction.style?.activeTrackColor ?? "#3b82f6";
    const thumbColor = instruction.style?.thumbColor ?? "#fff";
    const trackW = instruction.style?.width ?? 36;
    const trackH = instruction.style?.height ?? 20;
    const duration = instruction.style?.transitionDuration ?? 150;
    const timingFunction = instruction.style?.transitionTimingFunction ?? "ease";
    const { checked, disabled } = instruction;

    const x = readCellX(buf, cellIdx);
    const y = readCellY(buf, cellIdx);
    const w = readCellWidth(buf, cellIdx);
    const h = readCellHeight(buf, cellIdx);
    const padTop = readCellPaddingTop(buf, cellIdx);
    const padRight = readCellPaddingRight(buf, cellIdx);
    const padBottom = readCellPaddingBottom(buf, cellIdx);
    const padLeft = readCellPaddingLeft(buf, cellIdx);

    const contentW = w - padLeft - padRight;
    const contentH = h - padTop - padBottom;

    // Center the track within the content area
    const trackX = x + padLeft + (contentW - trackW) / 2;
    const trackY = y + padTop + (contentH - trackH) / 2;
    const radius = trackH / 2;

    // ── Animation progress (0 = unchecked, 1 = checked) ────────────

    const key = `${readCellRow(buf, cellIdx)}:${readCellCol(buf, cellIdx)}`;
    let progress: number;

    const canAnimate = duration > 0 && invalidate !== undefined;
    const existing = animationMap.get(key);

    if (!existing) {
      // First render — snap without animation
      progress = checked ? 1 : 0;
      animationMap.set(key, {
        targetChecked: checked,
        startTime: 0,
        fromProgress: progress,
        toProgress: progress,
        duration,
        timingFunction,
      });
    } else if (existing.targetChecked !== checked && canAnimate) {
      // Checked state changed — start new animation from current visual position
      const now = performance.now();
      let currentProgress: number;
      if (existing.startTime === 0 || existing.duration <= 0) {
        currentProgress = existing.toProgress;
      } else {
        const elapsed = now - existing.startTime;
        const rawT = Math.min(1, elapsed / existing.duration);
        const easedT = evaluateTimingFunction(existing.timingFunction, rawT);
        currentProgress =
          existing.fromProgress + (existing.toProgress - existing.fromProgress) * easedT;
      }
      existing.targetChecked = checked;
      existing.startTime = now;
      existing.fromProgress = currentProgress;
      existing.toProgress = checked ? 1 : 0;
      existing.duration = duration;
      existing.timingFunction = timingFunction;
      progress = currentProgress;
      // Request next frame to drive the animation
      invalidate!();
    } else if (existing.targetChecked !== checked) {
      // Changed but can't animate — snap
      progress = checked ? 1 : 0;
      existing.targetChecked = checked;
      existing.startTime = 0;
      existing.fromProgress = progress;
      existing.toProgress = progress;
    } else if (existing.startTime > 0 && existing.duration > 0) {
      // Ongoing animation — interpolate
      const elapsed = performance.now() - existing.startTime;
      const rawT = Math.min(1, elapsed / existing.duration);
      const easedT = evaluateTimingFunction(existing.timingFunction, rawT);
      progress = existing.fromProgress + (existing.toProgress - existing.fromProgress) * easedT;
      if (rawT < 1 && invalidate) {
        invalidate();
      }
    } else {
      // No animation in progress — use target
      progress = existing.toProgress;
    }

    // ── Draw ────────────────────────────────────────────────────────

    if (disabled) {
      ctx.save();
      ctx.globalAlpha = 0.4;
    }

    // Draw track (pill shape) with interpolated color
    ctx.beginPath();
    ctx.roundRect(trackX, trackY, trackW, trackH, radius);
    ctx.fillStyle = lerpColor(trackColor, activeTrackColor, progress);
    ctx.fill();

    // Draw thumb (circle) with interpolated position
    const thumbRadius = radius - 2;
    const leftCx = trackX + radius;
    const rightCx = trackX + trackW - radius;
    const thumbCx = leftCx + (rightCx - leftCx) * progress;
    const thumbCy = trackY + radius;
    ctx.beginPath();
    ctx.arc(thumbCx, thumbCy, thumbRadius, 0, Math.PI * 2);
    ctx.fillStyle = thumbColor;
    ctx.fill();

    if (disabled) {
      ctx.restore();
    }
  },
};

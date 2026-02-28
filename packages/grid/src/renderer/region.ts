import type { PinningInfo } from "../resolve-columns";
import { readCellWidth } from "../adapter/layout-reader";

export interface CanvasRegion {
  readonly name: "left" | "center" | "right";
  readonly clipRect: readonly [x: number, y: number, w: number, h: number];
  readonly translateX: number;
}

export interface RegionLayout {
  regions: CanvasRegion[];
  leftWidth: number;
  rightWidth: number;
  totalContentWidth: number;
}

/**
 * Build canvas regions for clip-based frozen column rendering.
 *
 * When pinning is disabled (leftCount=0, rightCount=0), returns a single
 * center region equivalent to the current full-canvas scroll behavior.
 */
export function buildRegions(
  canvasWidth: number,
  canvasHeight: number,
  scrollLeft: number,
  layoutBuf: Float32Array,
  headerCount: number,
  pinningInfo: PinningInfo,
): RegionLayout {
  const { leftCount, rightCount } = pinningInfo;

  // Compute total content width from header cells
  let totalContentWidth = 0;
  for (let i = 0; i < headerCount; i++) {
    totalContentWidth += readCellWidth(layoutBuf, i);
  }

  // No pinning: single center region
  if (leftCount === 0 && rightCount === 0) {
    return {
      regions: [
        {
          name: "center",
          clipRect: [0, 0, canvasWidth, canvasHeight],
          translateX: -scrollLeft,
        },
      ],
      leftWidth: 0,
      rightWidth: 0,
      totalContentWidth,
    };
  }

  // Compute left pinned width from header cells (first leftCount columns)
  let leftWidth = 0;
  for (let i = 0; i < leftCount; i++) {
    leftWidth += readCellWidth(layoutBuf, i);
  }

  // Compute right pinned width from header cells (last rightCount columns)
  let rightWidth = 0;
  for (let i = headerCount - rightCount; i < headerCount; i++) {
    rightWidth += readCellWidth(layoutBuf, i);
  }

  const regions: CanvasRegion[] = [];

  // Left region: no scroll
  if (leftCount > 0) {
    regions.push({
      name: "left",
      clipRect: [0, 0, leftWidth, canvasHeight],
      translateX: 0,
    });
  }

  // Center region: scrollable
  const centerClipX = leftWidth;
  const centerClipW = canvasWidth - leftWidth - rightWidth;
  if (centerClipW > 0) {
    regions.push({
      name: "center",
      clipRect: [centerClipX, 0, centerClipW, canvasHeight],
      translateX: -scrollLeft,
    });
  }

  // Right region: fixed at right edge
  if (rightCount > 0) {
    regions.push({
      name: "right",
      clipRect: [canvasWidth - rightWidth, 0, rightWidth, canvasHeight],
      translateX: canvasWidth - totalContentWidth,
    });
  }

  return { regions, leftWidth, rightWidth, totalContentWidth };
}

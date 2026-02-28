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

/** Row region for vertical clip (header / top / center / bottom). */
export interface RowRegion {
  readonly name: "header" | "top" | "center" | "bottom";
  readonly clipRect: readonly [x: number, y: number, w: number, h: number];
  readonly translateY: number;
}

export interface RowRegionLayout {
  regions: RowRegion[];
  topHeight: number;
  centerHeight: number;
  bottomHeight: number;
  scrollableCount: number;
}

/**
 * Build row regions for clip-based row pinning (top / center / bottom).
 * When pinnedTop=0 and pinnedBottom=0, returns a single center region.
 */
export function buildRowRegions(
  canvasWidth: number,
  canvasHeight: number,
  headerHeight: number,
  rowHeight: number,
  scrollTop: number,
  pinnedTop: number,
  pinnedBottom: number,
  totalRows: number,
): RowRegionLayout {
  const topHeight = pinnedTop * rowHeight;
  const bottomHeight = pinnedBottom * rowHeight;
  const scrollableCount = totalRows - pinnedTop - pinnedBottom;
  const centerHeight = Math.max(0, canvasHeight - headerHeight - topHeight - bottomHeight);

  if (pinnedTop === 0 && pinnedBottom === 0) {
    return {
      regions: [
        {
          name: "center",
          clipRect: [0, 0, canvasWidth, canvasHeight],
          translateY: -scrollTop,
        },
      ],
      topHeight: 0,
      centerHeight: canvasHeight,
      bottomHeight: 0,
      scrollableCount: totalRows,
    };
  }

  const regions: RowRegion[] = [];

  // Header region: always present so header row is visible
  regions.push({
    name: "header",
    clipRect: [0, 0, canvasWidth, headerHeight],
    translateY: 0,
  });

  if (pinnedTop > 0) {
    regions.push({
      name: "top",
      clipRect: [0, headerHeight, canvasWidth, topHeight],
      translateY: 0,
    });
  }

  if (centerHeight > 0) {
    // WASM outputs absolute content y; JS applies scroll via translateY.
    regions.push({
      name: "center",
      clipRect: [0, headerHeight + topHeight, canvasWidth, centerHeight],
      translateY: -scrollTop,
    });
  }

  if (pinnedBottom > 0) {
    const firstBottomContentY = headerHeight + (pinnedTop + scrollableCount) * rowHeight;
    const translateY = canvasHeight - bottomHeight - firstBottomContentY;
    regions.push({
      name: "bottom",
      clipRect: [0, canvasHeight - bottomHeight, canvasWidth, bottomHeight],
      translateY,
    });
  }

  return {
    regions,
    topHeight,
    centerHeight,
    bottomHeight,
    scrollableCount,
  };
}

/**
 * Convert content-space X to viewport (canvas) X for overlay drawing.
 * Used e.g. for column DnD drop indicator.
 */
export function contentToViewportX(
  contentX: number,
  regionLayout: RegionLayout,
  scrollLeft: number,
  canvasWidth: number,
): number {
  const { leftWidth, rightWidth, totalContentWidth } = regionLayout;
  if (contentX < leftWidth) return contentX;
  if (rightWidth > 0 && contentX >= totalContentWidth - rightWidth) {
    return contentX - totalContentWidth + canvasWidth;
  }
  return contentX - scrollLeft;
}

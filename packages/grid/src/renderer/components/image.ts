import type { ImageInstruction } from "../../types";
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
} from "../../adapter/layout-reader";

// ── Image cache ─────────────────────────────────────────────────────────

/** Minimal subset of HTMLImageElement used by the renderer. */
export interface ImageLike {
  src: string;
  crossOrigin: string | null;
  naturalWidth: number;
  naturalHeight: number;
  onload: ((this: unknown, ev: unknown) => void) | null;
  onerror: ((this: unknown, ev: unknown) => void) | null;
}

export interface ImageCacheEntry {
  img: ImageLike;
  loaded: boolean;
  error: boolean;
}

const imageCache = new Map<string, ImageCacheEntry>();

/** Expose cache for testing. @internal */
export function _getImageCache(): Map<string, ImageCacheEntry> {
  return imageCache;
}

interface LoadImageOptions {
  crossOrigin?: "anonymous" | "use-credentials";
  referrerPolicy?: string;
  decoding?: "sync" | "async" | "auto";
  fetchPriority?: "high" | "low" | "auto";
}

function getOrLoadImage(
  src: string,
  opts?: LoadImageOptions,
): ImageCacheEntry | null {
  let entry = imageCache.get(src);
  if (entry) return entry;

  // Non-browser environment guard
  const ImageCtor = (globalThis as any).Image as { new (): HTMLImageElement } | undefined;
  if (!ImageCtor) return null;

  const img = new ImageCtor();
  if (opts?.crossOrigin) {
    img.crossOrigin = opts.crossOrigin;
  }
  if (opts?.referrerPolicy) {
    img.referrerPolicy = opts.referrerPolicy;
  }
  if (opts?.decoding) {
    img.decoding = opts.decoding;
  }
  if (opts?.fetchPriority) {
    (img as any).fetchPriority = opts.fetchPriority;
  }
  entry = { img, loaded: false, error: false };
  imageCache.set(src, entry);

  const cached = entry;
  img.onload = () => {
    cached.loaded = true;
  };
  img.onerror = () => {
    cached.error = true;
  };
  img.src = src;

  return entry;
}

// ── object-fit calculation ──────────────────────────────────────────────

/**
 * Calculate source rect (sx,sy,sw,sh) and destination rect (dx,dy,dw,dh)
 * based on object-fit mode, natural image size, and content box.
 */
function computeObjectFit(
  fit: "contain" | "cover" | "fill" | "none" | "scale-down",
  naturalW: number,
  naturalH: number,
  contentW: number,
  contentH: number,
): { dx: number; dy: number; dw: number; dh: number } {
  if (fit === "fill") {
    return { dx: 0, dy: 0, dw: contentW, dh: contentH };
  }

  if (fit === "none") {
    // Draw at natural size, centered
    const dx = (contentW - naturalW) / 2;
    const dy = (contentH - naturalH) / 2;
    return { dx, dy, dw: naturalW, dh: naturalH };
  }

  const scaleX = contentW / naturalW;
  const scaleY = contentH / naturalH;

  let scale: number;
  if (fit === "contain") {
    scale = Math.min(scaleX, scaleY);
  } else if (fit === "cover") {
    scale = Math.max(scaleX, scaleY);
  } else {
    // scale-down: min of none (1) and contain
    const containScale = Math.min(scaleX, scaleY);
    scale = Math.min(1, containScale);
  }

  const dw = naturalW * scale;
  const dh = naturalH * scale;
  const dx = (contentW - dw) / 2;
  const dy = (contentH - dh) / 2;
  return { dx, dy, dw, dh };
}

// ── Renderer ────────────────────────────────────────────────────────────

export const imageCellRenderer: CellRenderer<ImageInstruction> = {
  type: "image",
  draw(instruction, { ctx, buf, cellIdx }) {
    const x = readCellX(buf, cellIdx);
    const y = readCellY(buf, cellIdx);
    const w = readCellWidth(buf, cellIdx);
    const h = readCellHeight(buf, cellIdx);
    const padTop = readCellPaddingTop(buf, cellIdx);
    const padRight = readCellPaddingRight(buf, cellIdx);
    const padBottom = readCellPaddingBottom(buf, cellIdx);
    const padLeft = readCellPaddingLeft(buf, cellIdx);

    const contentX = x + padLeft;
    const contentY = y + padTop;
    const contentW = w - padLeft - padRight;
    const contentH = h - padTop - padBottom;

    if (contentW <= 0 || contentH <= 0) return;

    const entry = getOrLoadImage(instruction.src, {
      crossOrigin: instruction.crossOrigin,
      referrerPolicy: instruction.referrerPolicy,
      decoding: instruction.decoding,
      fetchPriority: instruction.fetchPriority,
    });
    if (!entry) return;

    // Error → render alt text
    if (entry.error) {
      if (instruction.alt) {
        ctx.font = "12px system-ui, sans-serif";
        ctx.fillStyle = "#999";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          instruction.alt,
          contentX + contentW / 2,
          contentY + contentH / 2,
          contentW,
        );
      }
      return;
    }

    // Not loaded yet → draw nothing (will appear on next redraw)
    if (!entry.loaded) return;

    const objectFit = instruction.style?.objectFit ?? "fill";
    const borderRadius = instruction.style?.borderRadius ?? 0;
    const opacity = instruction.style?.opacity ?? 1;

    // Use explicit width/height if provided, otherwise use content box
    const targetW = instruction.width ?? contentW;
    const targetH = instruction.height ?? contentH;

    const naturalW = entry.img.naturalWidth;
    const naturalH = entry.img.naturalHeight;
    if (naturalW === 0 || naturalH === 0) return;

    const { dx, dy, dw, dh } = computeObjectFit(
      objectFit,
      naturalW,
      naturalH,
      targetW,
      targetH,
    );

    ctx.save();

    // Opacity
    if (opacity < 1) {
      ctx.globalAlpha = opacity;
    }

    // Always clip to content box (cover/none can exceed bounds)
    ctx.beginPath();
    if (borderRadius > 0) {
      ctx.roundRect(contentX, contentY, contentW, contentH, borderRadius);
    } else {
      ctx.rect(contentX, contentY, contentW, contentH);
    }
    ctx.clip();

    ctx.drawImage(
      entry.img,
      contentX + dx,
      contentY + dy,
      dw,
      dh,
    );

    ctx.restore();
  },
};

import type { AvatarInstruction } from "../../types";
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
import { getOrLoadImage } from "./image";

export const avatarCellRenderer: CellRenderer<AvatarInstruction> = {
  type: "avatar",
  draw(instruction, { ctx, buf, cellIdx }) {
    const size = instruction.style?.size ?? 40;
    const bgColor = instruction.style?.backgroundColor ?? "#e5e7eb";
    const textColor = instruction.style?.color ?? "#374151";
    const fontSize = instruction.style?.fontSize ?? 16;
    const borderColor = instruction.style?.borderColor;
    const borderW = instruction.style?.borderWidth ?? 0;

    const x = readCellX(buf, cellIdx);
    const y = readCellY(buf, cellIdx);
    const w = readCellWidth(buf, cellIdx);
    const h = readCellHeight(buf, cellIdx);
    const padT = readCellPaddingTop(buf, cellIdx);
    const padR = readCellPaddingRight(buf, cellIdx);
    const padB = readCellPaddingBottom(buf, cellIdx);
    const padL = readCellPaddingLeft(buf, cellIdx);

    const contentW = w - padL - padR;
    const contentH = h - padT - padB;
    const diameter = Math.min(size, contentW, contentH);
    if (diameter <= 0) return;

    const radius = diameter / 2;
    const cx = x + padL + contentW / 2;
    const cy = y + padT + contentH / 2;

    // Try to load image
    const entry = instruction.src ? getOrLoadImage(instruction.src) : null;
    const hasImage = entry?.loaded && !entry.error;

    ctx.save();

    // Circular clip
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (hasImage && entry) {
      // Draw image filling the circle
      const img = entry.img;
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      if (nw > 0 && nh > 0) {
        // Cover fit
        const scale = Math.max(diameter / nw, diameter / nh);
        const dw = nw * scale;
        const dh = nh * scale;
        ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
      }
    } else {
      // Background circle
      ctx.fillStyle = bgColor;
      ctx.fillRect(cx - radius, cy - radius, diameter, diameter);

      // Initials text
      const initials = getInitials(instruction.name ?? instruction.alt ?? "");
      if (initials) {
        ctx.font = `${fontSize}px system-ui, sans-serif`;
        ctx.fillStyle = textColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(initials, cx, cy);
      }
    }

    ctx.restore();

    // Border (drawn outside clip to avoid clipping)
    if (borderW > 0 && borderColor) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderW;
      ctx.stroke();
    }
  },
};

function getInitials(name: string): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0][0]?.toUpperCase() ?? "";
}

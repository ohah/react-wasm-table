import type { DropdownInstruction, DropdownStyle } from "../../types";
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

// ── Box-shadow CSS shorthand parser ───────────────────────────────────

const DEFAULT_BOX_SHADOW = "0px 2px 8px rgba(0,0,0,0.15)";

/** Parse a CSS box-shadow shorthand into decomposed values. */
export function parseBoxShadow(
  shadow: string,
): { offsetX: number; offsetY: number; blur: number; color: string } | null {
  const s = shadow.trim();
  if (!s) return null;

  // Match: <offsetX> <offsetY> [<blur>] <color>
  // Color can be a named color, #hex, rgb(...), rgba(...), hsl(...), hsla(...)
  const colorPatterns = [
    /rgba?\([^)]*\)/,
    /hsla?\([^)]*\)/,
    /#[0-9a-fA-F]{3,8}/,
    /[a-zA-Z]+/,
  ];

  let colorStr = "";
  let rest = s;

  // Try to extract color from end of string
  for (const pat of colorPatterns) {
    const m = rest.match(new RegExp(`(${pat.source})\\s*$`));
    if (m) {
      colorStr = m[1]!;
      rest = rest.slice(0, m.index!).trim();
      break;
    }
  }

  // Try to extract color from start of string if not found at end
  if (!colorStr) {
    for (const pat of colorPatterns) {
      const m = rest.match(new RegExp(`^\\s*(${pat.source})`));
      if (m) {
        colorStr = m[1]!;
        rest = rest.slice(m[0].length).trim();
        break;
      }
    }
  }

  if (!colorStr) return null;

  // Parse numeric values from remaining string
  const nums = rest.match(/-?[\d.]+/g);
  if (!nums || nums.length < 2) return null;

  return {
    offsetX: parseFloat(nums[0]!),
    offsetY: parseFloat(nums[1]!),
    blur: nums.length >= 3 ? parseFloat(nums[2]!) : 0,
    color: colorStr,
  };
}

// ── Resolved panel style (all defaults applied) ──────────────────────

/** Fully resolved panel style — no optional fields. */
export interface ResolvedPanelStyle {
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  borderRadius: number;
  activeBackgroundColor: string;
  activeBorderColor: string;
  maxVisibleItems: number;
  // Panel (resolved from nested panel + boxShadow parse)
  panelBackgroundColor: string;
  panelBorderColor: string;
  panelBorderRadius: number;
  panelShadowColor: string;
  panelShadowBlur: number;
  panelShadowOffsetX: number;
  panelShadowOffsetY: number;
  panelPadding: number;
  panelMinWidth: number;
  // Option (resolved from nested option)
  itemHeight: number;
  hoverBackgroundColor: string;
  hoverBorderRadius: number;
  selectedColor: string;
  selectedFontWeight: string;
  // Checkmark (resolved from nested checkmark)
  checkmarkSymbol: string;
  checkmarkColor: string;
}

/** Resolve a partial DropdownStyle into a fully-defaulted ResolvedPanelStyle. */
export function resolveDropdownPanelStyle(s?: Partial<DropdownStyle>): ResolvedPanelStyle {
  const fontSize = s?.fontSize ?? 13;
  const fontFamily = s?.fontFamily ?? "system-ui, sans-serif";
  const color = s?.color ?? "#333";
  const backgroundColor = s?.backgroundColor ?? "#fff";
  const borderColor = s?.borderColor ?? "#d1d5db";
  const borderRadius = s?.borderRadius ?? 4;

  // Panel sub-style
  const panel = s?.panel;
  const boxShadow = parseBoxShadow(panel?.boxShadow ?? DEFAULT_BOX_SHADOW);

  // Option sub-style
  const option = s?.option;

  // Checkmark sub-style
  const checkmark = s?.checkmark;

  return {
    fontSize,
    fontFamily,
    color,
    backgroundColor,
    borderColor,
    borderRadius,
    activeBackgroundColor: s?.activeBackgroundColor ?? "#f0f4ff",
    activeBorderColor: s?.activeBorderColor ?? "#3b82f6",
    maxVisibleItems: s?.maxVisibleItems ?? 6,
    // Panel
    panelBackgroundColor: panel?.backgroundColor ?? backgroundColor,
    panelBorderColor: panel?.borderColor ?? borderColor,
    panelBorderRadius: panel?.borderRadius ?? borderRadius,
    panelShadowColor: boxShadow?.color ?? "rgba(0,0,0,0.15)",
    panelShadowBlur: boxShadow?.blur ?? 8,
    panelShadowOffsetX: boxShadow?.offsetX ?? 0,
    panelShadowOffsetY: boxShadow?.offsetY ?? 2,
    panelPadding: panel?.padding ?? 4,
    panelMinWidth: panel?.minWidth ?? 100,
    // Option
    itemHeight: option?.height ?? 30,
    hoverBackgroundColor: option?.hoverBackgroundColor ?? "#f3f4f6",
    hoverBorderRadius: option?.hoverBorderRadius ?? 3,
    selectedColor: option?.selectedColor ?? "#1d4ed8",
    selectedFontWeight: option?.selectedFontWeight ?? "600",
    // Checkmark
    checkmarkSymbol: checkmark?.content ?? "✓",
    checkmarkColor: checkmark?.color ?? "#3b82f6",
  };
}

// ── Dropdown panel state ──────────────────────────────────────────────

/** State for an open dropdown panel overlay. Coordinates are in content space. */
export interface DropdownPanelState {
  /** Cell key "row:col". */
  key: string;
  options: { value: string; label: string }[];
  value: string | undefined;
  hoveredIndex: number;
  onChange: ((value: string) => void) | undefined;
  /** Content-space rect of the trigger button. */
  triggerX: number;
  triggerY: number;
  triggerW: number;
  triggerH: number;
  /** Fully resolved panel style. */
  style: ResolvedPanelStyle;
}

/** Module-level singleton: at most one panel open at a time. */
let openPanel: DropdownPanelState | null = null;

// ── Checkmark width constant ──────────────────────────────────────────

const CHECK_WIDTH = 22;

// ── Public API ────────────────────────────────────────────────────────

export function getDropdownPanelState(): DropdownPanelState | null {
  return openPanel;
}

export function openDropdownPanel(state: DropdownPanelState): void {
  openPanel = state;
}

export function closeDropdownPanel(): void {
  openPanel = null;
}

/** Compute panel rect in content space, with overflow flip. */
function panelRect(p: DropdownPanelState, viewportHeight?: number) {
  const s = p.style;
  const visibleCount = Math.min(p.options.length, s.maxVisibleItems);
  const panelH = visibleCount * s.itemHeight + s.panelPadding * 2;
  const panelW = Math.max(s.panelMinWidth, p.triggerW);
  const panelX = p.triggerX;

  // Default: below trigger
  let panelY = p.triggerY + p.triggerH + 2;
  let flipped = false;

  // Flip above if panel overflows viewport bottom
  if (viewportHeight !== undefined && viewportHeight > 0) {
    if (panelY + panelH > viewportHeight) {
      const aboveY = p.triggerY - panelH - 2;
      if (aboveY >= 0) {
        panelY = aboveY;
        flipped = true;
      }
    }
  }

  return { panelX, panelY, panelW, panelH, visibleCount, flipped };
}

/**
 * Draw the dropdown panel overlay in viewport space.
 * Call after all layers / onAfterDraw so it renders on top.
 */
export function drawDropdownPanel(
  ctx: CanvasRenderingContext2D,
  scrollLeft: number,
  scrollTop: number,
  viewportHeight?: number,
): void {
  const p = openPanel;
  if (!p || p.options.length === 0) return;

  const s = p.style;
  const { panelX, panelY, panelW, panelH, visibleCount } = panelRect(p, viewportHeight);

  // Content → viewport transform
  const vx = panelX - scrollLeft;
  const vy = panelY - scrollTop;

  ctx.save();

  // Shadow
  ctx.shadowColor = s.panelShadowColor;
  ctx.shadowBlur = s.panelShadowBlur;
  ctx.shadowOffsetX = s.panelShadowOffsetX;
  ctx.shadowOffsetY = s.panelShadowOffsetY;

  // Panel background
  ctx.beginPath();
  ctx.roundRect(vx, vy, panelW, panelH, s.panelBorderRadius);
  ctx.fillStyle = s.panelBackgroundColor;
  ctx.fill();

  // Reset shadow before border / items
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Border
  ctx.strokeStyle = s.panelBorderColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Clip to panel
  ctx.beginPath();
  ctx.rect(vx, vy, panelW, panelH);
  ctx.clip();

  // Draw items
  ctx.font = `${s.fontSize}px ${s.fontFamily}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  for (let i = 0; i < visibleCount; i++) {
    const opt = p.options[i]!;
    const itemY = vy + s.panelPadding + i * s.itemHeight;
    const isSelected = opt.value === p.value;
    const isHovered = i === p.hoveredIndex;

    // Hover background
    if (isHovered) {
      ctx.fillStyle = s.hoverBackgroundColor;
      ctx.beginPath();
      ctx.roundRect(vx + 2, itemY, panelW - 4, s.itemHeight, s.hoverBorderRadius);
      ctx.fill();
    }

    // Checkmark for selected item
    if (isSelected) {
      ctx.fillStyle = s.checkmarkColor;
      ctx.font = `${s.fontSize}px ${s.fontFamily}`;
      ctx.fillText(s.checkmarkSymbol, vx + 8, itemY + s.itemHeight / 2);
    }

    // Option label
    ctx.fillStyle = isSelected ? s.selectedColor : s.color;
    ctx.font = `${isSelected ? s.selectedFontWeight + " " : ""}${s.fontSize}px ${s.fontFamily}`;
    ctx.fillText(opt.label, vx + CHECK_WIDTH + 4, itemY + s.itemHeight / 2);
  }

  ctx.restore();
}

/**
 * Hit-test the dropdown panel in viewport coordinates.
 * Returns:
 *   { type: "item", index: number } — an option row
 *   { type: "panel" } — inside panel but not on an item
 *   null — outside panel
 */
export function hitTestDropdownPanel(
  viewportX: number,
  viewportY: number,
  scrollLeft: number,
  scrollTop: number,
  viewportHeight?: number,
): { type: "item"; index: number } | { type: "panel" } | null {
  const p = openPanel;
  if (!p || p.options.length === 0) return null;

  const s = p.style;
  const { panelX, panelY, panelW, panelH, visibleCount } = panelRect(p, viewportHeight);
  const vx = panelX - scrollLeft;
  const vy = panelY - scrollTop;

  if (viewportX < vx || viewportX > vx + panelW || viewportY < vy || viewportY > vy + panelH) {
    return null;
  }

  const localY = viewportY - vy - s.panelPadding;
  const idx = Math.floor(localY / s.itemHeight);
  if (idx >= 0 && idx < visibleCount) {
    return { type: "item", index: idx };
  }
  return { type: "panel" };
}

/** Update hovered index. Returns true if changed. */
export function setDropdownHoveredIndex(index: number): boolean {
  if (!openPanel || openPanel.hoveredIndex === index) return false;
  openPanel.hoveredIndex = index;
  return true;
}

// ── Per-cell position cache (updated each draw frame) ─────────────────

/** Cached trigger button rect in content space, keyed by "row:col". */
const triggerRectMap = new Map<string, { x: number; y: number; w: number; h: number }>();

/** @internal Exposed for testing. */
export function _getTriggerRectMap() {
  return triggerRectMap;
}

// ── Cell renderer ─────────────────────────────────────────────────────

export const dropdownCellRenderer: CellRenderer<DropdownInstruction> = {
  type: "dropdown",
  cursor: "pointer",
  draw(instruction, { ctx, buf, cellIdx, theme }) {
    const fontSize = instruction.style?.fontSize ?? theme.fontSize;
    const fontFamily = instruction.style?.fontFamily ?? theme.fontFamily;
    const color = instruction.style?.color ?? theme.cellColor;
    const bgColor = instruction.style?.backgroundColor ?? "#fff";
    const borderColor = instruction.style?.borderColor ?? "#d1d5db";
    const borderW = instruction.style?.borderWidth ?? 1;
    const borderRadius = instruction.style?.borderRadius ?? 4;
    const activeBgColor = instruction.style?.activeBackgroundColor ?? "#f0f4ff";
    const activeBorderColor = instruction.style?.activeBorderColor ?? "#3b82f6";

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
    const selectH = Math.max(0, Math.min(contentH - 4, fontSize + 12));
    const selectW = Math.max(0, contentW - 4);
    if (selectW === 0 || selectH === 0) return;
    const selectX = x + padL + 2;
    const selectY = y + padT + (contentH - selectH) / 2;

    // Cache trigger rect for panel positioning
    const key = `${readCellRow(buf, cellIdx)}:${readCellCol(buf, cellIdx)}`;
    triggerRectMap.set(key, { x: selectX, y: selectY, w: selectW, h: selectH });

    if (instruction.disabled) {
      ctx.save();
      ctx.globalAlpha = 0.5;
    }

    // Background — highlight if this cell's panel is open
    const isOpen = openPanel?.key === key;
    ctx.beginPath();
    ctx.roundRect(selectX, selectY, selectW, selectH, borderRadius);
    ctx.fillStyle = isOpen ? activeBgColor : bgColor;
    ctx.fill();

    // Border
    if (borderW > 0) {
      ctx.strokeStyle = isOpen ? activeBorderColor : borderColor;
      ctx.lineWidth = borderW;
      ctx.stroke();
    }

    // Current value text or placeholder
    const selectedOption = instruction.options.find((o) => o.value === instruction.value);
    const text = selectedOption?.label ?? instruction.placeholder ?? "";
    const isPlaceholder = !selectedOption && !!instruction.placeholder;
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = isPlaceholder ? "#9ca3af" : color;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";

    // Clip text (leave room for dropdown arrow)
    const arrowSpace = 20;
    ctx.save();
    ctx.beginPath();
    ctx.rect(selectX + 6, selectY, selectW - 12 - arrowSpace, selectH);
    ctx.clip();
    ctx.fillText(text, selectX + 6, selectY + selectH / 2);
    ctx.restore();

    // Dropdown arrow (▼ / ▲ when open)
    const arrowX = selectX + selectW - 16;
    const arrowY = selectY + selectH / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (isOpen) {
      // ▲ when open
      ctx.moveTo(arrowX - 4, arrowY + 2);
      ctx.lineTo(arrowX + 4, arrowY + 2);
      ctx.lineTo(arrowX, arrowY - 3);
    } else {
      // ▼ when closed
      ctx.moveTo(arrowX - 4, arrowY - 2);
      ctx.lineTo(arrowX + 4, arrowY - 2);
      ctx.lineTo(arrowX, arrowY + 3);
    }
    ctx.closePath();
    ctx.fill();

    if (instruction.disabled) {
      ctx.restore();
    }
  },
};

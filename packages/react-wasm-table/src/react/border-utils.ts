import type { CssBorderStyle, CellBorderSide, CellBorderConfig, Theme } from "../types";
import type { CellBorderStyleProps } from "./table-components";

/**
 * Parse a CSS border shorthand string into a CellBorderSide.
 * Supports: "1px solid #ccc", "2px solid red", "none"
 * Returns null if the string cannot be parsed.
 */
export function parseBorderShorthand(value: string): CellBorderSide | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed === "none") {
    return { width: 0, style: "none", color: "" };
  }

  // Match: <width>px <style> <color>
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*px\s+(solid|none)\s+(.+)$/i);
  if (!match) return null;

  const width = parseFloat(match[1]!);
  const style = match[2]!.toLowerCase() as CssBorderStyle;
  const color = match[3]!.trim();

  return { width, style, color };
}

/**
 * Resolve the effective border config for a cell by merging layers:
 * theme defaults < column-level < cell-level (from Td/Th style prop).
 *
 * Returns a CellBorderConfig with only non-default sides set.
 */
export function resolveCellBorder(
  theme: Theme,
  columnBorder?: { color?: string; style?: CssBorderStyle },
  cellStyle?: CellBorderStyleProps,
): CellBorderConfig {
  // Start with theme defaults
  let baseColor = theme.borderColor;
  let baseWidth = theme.borderWidth;
  let baseStyle = theme.borderStyle;

  // Column-level overrides
  if (columnBorder?.color !== undefined) baseColor = columnBorder.color;
  if (columnBorder?.style !== undefined) baseStyle = columnBorder.style;

  if (!cellStyle) {
    // No cell-level override — check if column changed from theme defaults
    if (
      baseColor === theme.borderColor &&
      baseWidth === theme.borderWidth &&
      baseStyle === theme.borderStyle
    ) {
      return {}; // All defaults, no config needed
    }
    const side: CellBorderSide = { width: baseWidth, style: baseStyle, color: baseColor };
    return { top: side, right: side, bottom: side, left: side };
  }

  // Cell-level overrides
  // First apply cell-level base properties
  if (cellStyle.borderColor !== undefined) baseColor = cellStyle.borderColor;
  if (cellStyle.borderStyle !== undefined) baseStyle = cellStyle.borderStyle;
  if (cellStyle.borderWidth !== undefined) {
    baseWidth =
      typeof cellStyle.borderWidth === "number"
        ? cellStyle.borderWidth
        : parseFloat(String(cellStyle.borderWidth)) || baseWidth;
  }

  // Parse shorthand `border` if present (applies to all sides)
  let allSides: CellBorderSide | null = null;
  if (cellStyle.border !== undefined) {
    allSides = parseBorderShorthand(cellStyle.border);
  }

  // Build per-side config
  const baseSide: CellBorderSide = allSides ?? {
    width: baseWidth,
    style: baseStyle,
    color: baseColor,
  };

  const top = cellStyle.borderTop
    ? (parseBorderShorthand(cellStyle.borderTop) ?? baseSide)
    : baseSide;
  const right = cellStyle.borderRight
    ? (parseBorderShorthand(cellStyle.borderRight) ?? baseSide)
    : baseSide;
  const bottom = cellStyle.borderBottom
    ? (parseBorderShorthand(cellStyle.borderBottom) ?? baseSide)
    : baseSide;
  const left = cellStyle.borderLeft
    ? (parseBorderShorthand(cellStyle.borderLeft) ?? baseSide)
    : baseSide;

  return { top, right, bottom, left };
}

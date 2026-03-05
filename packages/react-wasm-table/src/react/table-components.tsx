import type { TableCellContent, CssBorderStyle } from "../types";

/**
 * Config-only structural components for TanStack-compatible Table API.
 * These components do NOT render to DOM — they return null.
 * <Table> traverses children via React.Children to extract structure info.
 */

/** CSS-like border style props for Td/Th/Tr elements. */
export interface CellBorderStyleProps {
  /** Border shorthand (e.g. "1px solid #ccc", "none"). */
  border?: string;
  /** Border top shorthand. */
  borderTop?: string;
  /** Border right shorthand. */
  borderRight?: string;
  /** Border bottom shorthand. */
  borderBottom?: string;
  /** Border left shorthand. */
  borderLeft?: string;
  /** Border color (applies to all sides). */
  borderColor?: string;
  /** Border width (applies to all sides). */
  borderWidth?: string | number;
  /** Border style (applies to all sides). */
  borderStyle?: CssBorderStyle;
}

export interface TheadProps {
  children?: TableCellContent;
}

export interface TbodyProps {
  children?: TableCellContent;
}

export interface TfootProps {
  children?: TableCellContent;
}

export interface TrProps {
  children?: TableCellContent;
  /** Border style for all cells in this row (overridden by cell-level style). */
  style?: CellBorderStyleProps;
}

export interface ThProps {
  colSpan?: number;
  /** Header cell content: ReactNode or RenderInstruction (e.g. flexRender return value). */
  children?: TableCellContent;
  /** Border style for this header cell. */
  style?: CellBorderStyleProps;
}

export interface TdProps {
  colSpan?: number;
  /** Cell content: ReactNode or RenderInstruction (e.g. flexRender return value). */
  children?: TableCellContent;
  /** Border style for this cell. */
  style?: CellBorderStyleProps;
}

export function Thead(_props: TheadProps): null {
  return null;
}

export function Tbody(_props: TbodyProps): null {
  return null;
}

export function Tfoot(_props: TfootProps): null {
  return null;
}

export function Tr(_props: TrProps): null {
  return null;
}

export function Th(_props: ThProps): null {
  return null;
}

export function Td(_props: TdProps): null {
  return null;
}

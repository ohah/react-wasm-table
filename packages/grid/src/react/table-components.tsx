import type { TableCellContent } from "../types";

/**
 * Config-only structural components for TanStack-compatible Table API.
 * These components do NOT render to DOM — they return null.
 * <Table> traverses children via React.Children to extract structure info.
 */

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
}

export interface ThProps {
  colSpan?: number;
  /** Header cell content: ReactNode or RenderInstruction (e.g. flexRender return value). */
  children?: TableCellContent;
}

export interface TdProps {
  colSpan?: number;
  /** Cell content: ReactNode or RenderInstruction (e.g. flexRender return value). */
  children?: TableCellContent;
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

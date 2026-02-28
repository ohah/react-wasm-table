import type { ReactNode } from "react";

/**
 * Config-only structural components for TanStack-compatible Table API.
 * These components do NOT render to DOM — they return null.
 * <Table> traverses children via React.Children to extract structure info.
 */

export interface TheadProps {
  children?: ReactNode;
}

export interface TbodyProps {
  children?: ReactNode;
}

export interface TfootProps {
  children?: ReactNode;
}

export interface TrProps {
  children?: ReactNode;
}

export interface ThProps {
  colSpan?: number;
  children?: ReactNode;
}

export interface TdProps {
  colSpan?: number;
  children?: ReactNode;
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

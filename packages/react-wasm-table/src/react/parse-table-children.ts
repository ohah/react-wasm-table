import { Children, isValidElement, type ReactNode } from "react";
import { Thead, Tbody, Tfoot, Tr, Th, Td } from "./table-components";
import type { CellBorderStyleProps } from "./table-components";

/** Parsed cell info from a Th or Td element. */
export interface ParsedCell {
  colSpan: number;
  content: ReactNode;
  /** React element key (e.g., cell.id = "${rowId}_${columnId}"). */
  key?: string;
  /** Border style from the cell's style prop. */
  borderStyle?: CellBorderStyleProps;
}

/** Parsed row from a Tr element. */
export interface ParsedRow {
  cells: ParsedCell[];
  /** React element key (e.g., row.id). */
  key?: string;
  /** Border style from the row's style prop (applied as default to all cells). */
  borderStyle?: CellBorderStyleProps;
}

/** Result of parsing Table children. */
export interface ParsedTableStructure {
  headerRows: ParsedRow[];
  bodyRows: ParsedRow[];
  footerRows: ParsedRow[];
  hasStructure: boolean;
}

/** Parse Tr children into ParsedRow[] */
function parseTrChildren(children: ReactNode): ParsedRow[] {
  const rows: ParsedRow[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child) || child.type !== Tr) return;
    const trProps = child.props as { children?: ReactNode; style?: CellBorderStyleProps };
    const cells: ParsedCell[] = [];
    Children.forEach(trProps.children, (cellChild) => {
      if (!isValidElement(cellChild)) return;
      if (cellChild.type !== Th && cellChild.type !== Td) return;
      const cellProps = cellChild.props as {
        colSpan?: number;
        children?: ReactNode;
        style?: CellBorderStyleProps;
      };
      cells.push({
        colSpan: cellProps.colSpan ?? 1,
        content: cellProps.children,
        ...(cellChild.key != null && { key: String(cellChild.key) }),
        ...(cellProps.style != null && { borderStyle: cellProps.style }),
      });
    });
    rows.push({
      cells,
      ...(child.key != null && { key: String(child.key) }),
      ...(trProps.style != null && { borderStyle: trProps.style }),
    });
  });
  return rows;
}

/**
 * Parse <Table> children to extract structural information.
 * Looks for Thead/Tbody/Tfoot → Tr → Th/Td hierarchy.
 * Returns hasStructure: false if no structural components are found.
 */
export function parseTableChildren(children: ReactNode): ParsedTableStructure {
  let headerRows: ParsedRow[] = [];
  let bodyRows: ParsedRow[] = [];
  let footerRows: ParsedRow[] = [];
  let hasStructure = false;

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;

    const sectionProps = child.props as { children?: ReactNode };
    if (child.type === Thead) {
      hasStructure = true;
      headerRows = parseTrChildren(sectionProps.children);
    } else if (child.type === Tbody) {
      hasStructure = true;
      bodyRows = parseTrChildren(sectionProps.children);
    } else if (child.type === Tfoot) {
      hasStructure = true;
      footerRows = parseTrChildren(sectionProps.children);
    }
  });

  return { headerRows, bodyRows, footerRows, hasStructure };
}

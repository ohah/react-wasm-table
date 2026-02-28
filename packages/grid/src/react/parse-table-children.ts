import { Children, isValidElement, type ReactNode } from "react";
import { Thead, Tbody, Tfoot, Tr, Th, Td } from "./table-components";

/** Parsed cell info from a Th or Td element. */
export interface ParsedCell {
  colSpan: number;
  content: ReactNode;
  /** React element key (e.g., cell.id = "${rowId}_${columnId}"). */
  key?: string;
}

/** Parsed row from a Tr element. */
export interface ParsedRow {
  cells: ParsedCell[];
  /** React element key (e.g., row.id). */
  key?: string;
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
    const cells: ParsedCell[] = [];
    Children.forEach(child.props.children, (cellChild) => {
      if (!isValidElement(cellChild)) return;
      if (cellChild.type !== Th && cellChild.type !== Td) return;
      cells.push({
        colSpan: cellChild.props.colSpan ?? 1,
        content: cellChild.props.children,
        ...(cellChild.key != null && { key: String(cellChild.key) }),
      });
    });
    rows.push({
      cells,
      ...(child.key != null && { key: String(child.key) }),
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

    if (child.type === Thead) {
      hasStructure = true;
      headerRows = parseTrChildren(child.props.children);
    } else if (child.type === Tbody) {
      hasStructure = true;
      bodyRows = parseTrChildren(child.props.children);
    } else if (child.type === Tfoot) {
      hasStructure = true;
      footerRows = parseTrChildren(child.props.children);
    }
  });

  return { headerRows, bodyRows, footerRows, hasStructure };
}

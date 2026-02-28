import type { GridInstance } from "./grid-instance";
import type { NormalizedRange, CellCoord } from "./types";
import { buildTSV } from "./adapter/selection-manager";

// ── Format builders (range + getText) ───────────────────────────────

/** RFC 4180 CSV escaping: wrap in quotes if value contains comma, newline, or quote. */
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Build a CSV string from a normalized cell range (same semantics as buildTSV). */
export function buildCSV(
  range: NormalizedRange,
  getText: (row: number, col: number) => string,
): string {
  const lines: string[] = [];
  for (let r = range.minRow; r <= range.maxRow; r++) {
    const cells: string[] = [];
    for (let c = range.minCol; c <= range.maxCol; c++) {
      cells.push(escapeCSV(getText(r, c)));
    }
    lines.push(cells.join(","));
  }
  return lines.join("\n");
}

/** Escape HTML entity for use in table cells. */
function escapeHTML(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Build an HTML table fragment from a normalized cell range (Excel-compatible paste). */
export function buildHTML(
  range: NormalizedRange,
  getText: (row: number, col: number) => string,
): string {
  const rows: string[] = [];
  for (let r = range.minRow; r <= range.maxRow; r++) {
    const cells: string[] = [];
    for (let c = range.minCol; c <= range.maxCol; c++) {
      cells.push(`<td>${escapeHTML(getText(r, c))}</td>`);
    }
    rows.push(`<tr>${cells.join("")}</tr>`);
  }
  return `<table><tbody>${rows.join("")}</tbody></table>`;
}

// ── Copy ────────────────────────────────────────────────────────────

export interface CopyToClipboardOptions {
  /** Output format. Default "tsv". */
  format?: "tsv" | "csv" | "html";
  /** Include header row (column header labels). Default false. */
  includeHeaders?: boolean;
}

/**
 * Build clipboard content from table and selection range.
 * Returns the string to write; the caller (e.g. Grid onCopy) writes it via SelectionManager.
 * Use with Grid: onCopy={(_, range) => copyToClipboard(table, range, { format: "csv" })}
 */
export function copyToClipboard<TData>(
  table: GridInstance<TData>,
  selection: NormalizedRange,
  options?: CopyToClipboardOptions,
): string {
  const columns = table.getVisibleLeafColumns();
  const format = options?.format ?? "tsv";
  const includeHeaders = options?.includeHeaders ?? false;

  const getText = (row: number, col: number): string => {
    const colDef = columns[col];
    const id = colDef?.id ?? "";
    const raw = table.getRow(row).getValue(id);
    return String(raw ?? "");
  };

  let body: string;
  switch (format) {
    case "csv":
      body = buildCSV(selection, getText);
      break;
    case "html":
      body = buildHTML(selection, getText);
      break;
    default:
      body = buildTSV(selection, getText);
  }

  if (!includeHeaders || columns.length === 0) {
    return body;
  }

  const headerLabels = columns
    .slice(selection.minCol, selection.maxCol + 1)
    .map((c) => (typeof c.columnDef?.header === "string" ? c.columnDef.header : c.id));
  const headerRow =
    format === "csv"
      ? headerLabels.map(escapeCSV).join(",")
      : format === "html"
        ? `<tr>${headerLabels.map((h) => `<td>${escapeHTML(h)}</td>`).join("")}</tr>`
        : headerLabels.join("\t");

  if (format === "html") {
    const bodyRows = body.replace(/^<table><tbody>/, "").replace(/<\/tbody><\/table>$/, "");
    return `<table><tbody>${headerRow}${bodyRows}</tbody></table>`;
  }
  return `${headerRow}\n${body}`;
}

// ── Paste ────────────────────────────────────────────────────────────

/**
 * Parse clipboard text (TSV or CSV) into a 2D array of cell strings.
 * Detects delimiter from first line: tab → TSV, otherwise CSV.
 */
export function parseClipboardText(text: string): string[][] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const firstLine = trimmed.split(/\r?\n/)[0] ?? "";
  const hasTab = firstLine.includes("\t");
  const delimiter = hasTab ? "\t" : ",";

  const lines = trimmed.split(/\r?\n/);
  const rows: string[][] = [];

  for (const line of lines) {
    const cells = parseDelimitedLine(line, delimiter);
    rows.push(cells);
  }

  return rows;
}

/** Parse a single line; for CSV handles quoted fields. */
function parseDelimitedLine(line: string, delimiter: string): string[] {
  if (delimiter === "\t") {
    return line.split("\t").map((s) => s.trim());
  }
  const result: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let cell = "";
      i += 1;
      while (i < line.length) {
        if (line[i] === '"') {
          i += 1;
          if (line[i] === '"') {
            cell += '"';
            i += 1;
          } else {
            break;
          }
        } else {
          cell += line[i];
          i += 1;
        }
      }
      result.push(cell);
      if (line[i] === ",") i += 1;
    } else {
      let end = line.indexOf(",", i);
      if (end === -1) end = line.length;
      result.push(line.slice(i, end).trim());
      i = end + (end < line.length ? 1 : 0);
    }
  }
  return result;
}

export interface PasteFromClipboardResult {
  /** Parsed 2D array of cell values. */
  cells: string[][];
  /** Target cell (top-left of paste region). */
  target: CellCoord;
  /** Column IDs for columns starting at target.col (for applying paste to table). */
  columnIds: string[];
}

/**
 * Parse clipboard text and return cells + target + column IDs for the visible columns at target.
 * Use in onPaste: const { cells, target, columnIds } = pasteFromClipboard(table, text, target); then apply to your data.
 */
export function pasteFromClipboard<TData>(
  table: GridInstance<TData>,
  text: string,
  target: CellCoord,
): PasteFromClipboardResult {
  const cells = parseClipboardText(text);
  const columns = table.getVisibleLeafColumns();
  const columnIds = columns.slice(target.col).map((c) => c.id);
  return { cells, target, columnIds };
}

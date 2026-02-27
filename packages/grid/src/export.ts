import type { Row, RowModel } from "./row-model";

/** Options for exporting row model data. */
export interface ExportOptions {
  /** Column IDs to include (default: all columns from first row). */
  columns?: string[];
  /** Include a header row (default: true). */
  includeHeaders?: boolean;
  /** Custom value formatter. */
  formatValue?: (value: unknown, columnId: string, row: Row<any>) => string;
}

// ── CSV ──────────────────────────────────────────────────────────────

/** RFC 4180 CSV escaping: wrap in quotes if value contains comma, newline, or quote. */
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Export a RowModel to CSV string (RFC 4180). */
export function exportToCSV<TData>(
  rowModel: RowModel<TData>,
  options?: ExportOptions,
): string {
  return exportDelimited(rowModel, ",", escapeCSV, options);
}

// ── TSV ──────────────────────────────────────────────────────────────

/** TSV escaping: replace tabs and newlines. */
function escapeTSV(value: string): string {
  return value.replace(/\t/g, " ").replace(/\n/g, " ").replace(/\r/g, " ");
}

/** Export a RowModel to TSV string. */
export function exportToTSV<TData>(
  rowModel: RowModel<TData>,
  options?: ExportOptions,
): string {
  return exportDelimited(rowModel, "\t", escapeTSV, options);
}

// ── JSON ─────────────────────────────────────────────────────────────

/** Export a RowModel to an array of plain objects. */
export function exportToJSON<TData>(
  rowModel: RowModel<TData>,
  options?: Pick<ExportOptions, "columns">,
): Record<string, unknown>[] {
  const rows = rowModel.rows;
  if (rows.length === 0) return [];

  const columnIds = options?.columns ?? Object.keys(rows[0]!.getAllCellValues());

  return rows.map((row) => {
    const record: Record<string, unknown> = {};
    for (const id of columnIds) {
      record[id] = row.getValue(id);
    }
    return record;
  });
}

// ── Internal ─────────────────────────────────────────────────────────

function exportDelimited<TData>(
  rowModel: RowModel<TData>,
  delimiter: string,
  escape: (value: string) => string,
  options?: ExportOptions,
): string {
  const rows = rowModel.rows;
  const includeHeaders = options?.includeHeaders ?? true;
  const formatValue = options?.formatValue;

  if (rows.length === 0) {
    if (!includeHeaders) return "";
    const columnIds = options?.columns ?? [];
    return columnIds.length > 0 ? columnIds.map(escape).join(delimiter) : "";
  }

  const columnIds = options?.columns ?? Object.keys(rows[0]!.getAllCellValues());
  const lines: string[] = [];

  if (includeHeaders) {
    lines.push(columnIds.map(escape).join(delimiter));
  }

  for (const row of rows) {
    const cells = columnIds.map((id) => {
      const raw = row.getValue(id);
      const str = formatValue ? formatValue(raw, id, row) : String(raw ?? "");
      return escape(str);
    });
    lines.push(cells.join(delimiter));
  }

  return lines.join("\n");
}

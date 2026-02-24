import type { ColumnDef } from "../types";

interface TableRowProps {
  row: unknown[];
  columns: ColumnDef[];
  rowHeight: number;
}

export function TableRow({ row, columns, rowHeight }: TableRowProps) {
  return (
    <tr style={{ height: rowHeight }}>
      {columns.map((col, colIndex) => {
        const value = row[colIndex];
        return (
          <td key={col.key} style={{ width: col.width }}>
            {col.cell ? col.cell(value, row) : String(value ?? "")}
          </td>
        );
      })}
    </tr>
  );
}

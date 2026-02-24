import type { ColumnDef, VirtualSlice } from "../types";
import { TableRow } from "./TableRow";

interface TableBodyProps {
  rows: unknown[][];
  columns: ColumnDef[];
  rowHeight: number;
  virtualSlice: VirtualSlice | null;
}

export function TableBody({ rows, columns, rowHeight, virtualSlice }: TableBodyProps) {
  return (
    <tbody>
      {virtualSlice && (
        <tr style={{ height: virtualSlice.offsetY }} aria-hidden="true">
          <td colSpan={columns.length} />
        </tr>
      )}
      {rows.map((row, index) => (
        <TableRow
          key={virtualSlice ? virtualSlice.startIndex + index : index}
          row={row}
          columns={columns}
          rowHeight={rowHeight}
        />
      ))}
      {virtualSlice && (
        <tr
          style={{
            height: virtualSlice.totalHeight - virtualSlice.offsetY - rows.length * rowHeight,
          }}
          aria-hidden="true"
        >
          <td colSpan={columns.length} />
        </tr>
      )}
    </tbody>
  );
}

import type { ColumnDef, SortDirection } from "../types";

interface TableHeaderProps {
  columns: ColumnDef[];
  onSort?: (columnIndex: number) => void;
  getSortDirection?: (columnIndex: number) => SortDirection | null;
}

function SortIndicator({ direction }: { direction: SortDirection | null }) {
  if (!direction) return null;
  return <span>{direction === "asc" ? " ▲" : " ▼"}</span>;
}

export function TableHeader({ columns, onSort, getSortDirection }: TableHeaderProps) {
  return (
    <thead>
      <tr>
        {columns.map((col, index) => (
          <th
            key={col.key}
            style={{
              width: col.width,
              cursor: col.sortable !== false ? "pointer" : "default",
            }}
            onClick={() => {
              if (col.sortable !== false && onSort) {
                onSort(index);
              }
            }}
          >
            {col.header}
            {getSortDirection && <SortIndicator direction={getSortDirection(index)} />}
          </th>
        ))}
      </tr>
    </thead>
  );
}

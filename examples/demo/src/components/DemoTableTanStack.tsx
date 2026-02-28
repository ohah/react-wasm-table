import { useMemo } from "react";
import {
  Table,
  useReactTable,
  flexRender,
  getCoreRowModel,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  type GridColumnDef,
  type SortingState,
  type SortingUpdater,
  type ColumnFiltersState,
  type ColumnFiltersUpdater,
  type ColumnVisibilityState,
  type ColumnVisibilityUpdater,
  type ColumnSizingState,
  type ColumnSizingUpdater,
  type ColumnPinningState,
  type ColumnPinningUpdater,
  type RowPinningState,
  type RowPinningUpdater,
  type ColumnOrderState,
  type ColumnOrderUpdater,
} from "@ohah/react-wasm-table";

export interface DemoTableTanStackProps<T> {
  data: T[];
  columns: GridColumnDef<T>[];
  width: number;
  height: number;
  rowHeight?: number;
  headerHeight?: number;
  // State (same as Grid) — when provided, TanStack table uses them
  sorting?: SortingState;
  onSortingChange?: (updater: SortingUpdater) => void;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: (updater: ColumnFiltersUpdater) => void;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  columnVisibility?: ColumnVisibilityState;
  onColumnVisibilityChange?: (updater: ColumnVisibilityUpdater) => void;
  columnSizing?: ColumnSizingState;
  onColumnSizingChange?: (updater: ColumnSizingUpdater) => void;
  columnPinning?: ColumnPinningState;
  onColumnPinningChange?: (updater: ColumnPinningUpdater) => void;
  rowPinning?: RowPinningState;
  onRowPinningChange?: (updater: RowPinningUpdater) => void;
  columnOrder?: ColumnOrderState;
  onColumnOrderChange?: (updater: ColumnOrderUpdater) => void;
  getRowId?: (row: T, index: number) => string;
  enableColumnDnD?: boolean;
}

function getColumnId(def: GridColumnDef<unknown>): string {
  const d = def as { id?: string; accessorKey?: string };
  if (d.id) return d.id;
  if (d.accessorKey) return String(d.accessorKey);
  return "";
}

export function DemoTableTanStack<T>({
  data,
  columns,
  width,
  height,
  rowHeight,
  headerHeight,
  sorting,
  onSortingChange,
  columnFilters,
  onColumnFiltersChange,
  globalFilter,
  onGlobalFilterChange,
  columnVisibility,
  onColumnVisibilityChange,
  columnSizing,
  onColumnSizingChange,
  columnPinning,
  onColumnPinningChange,
  rowPinning,
  onRowPinningChange,
  columnOrder,
  onColumnOrderChange,
  getRowId,
  enableColumnDnD,
}: DemoTableTanStackProps<T>) {
  const orderedColumns = useMemo(
    () => (columnOrder?.length ? reorderColumnsBy(columns, columnOrder) : columns),
    [columns, columnOrder],
  );

  const state = useMemo(() => {
    const s: Record<string, unknown> = {};
    if (sorting != null) s.sorting = sorting;
    if (columnFilters != null) s.columnFilters = columnFilters;
    if (globalFilter != null) s.globalFilter = globalFilter;
    if (columnVisibility != null) s.columnVisibility = columnVisibility;
    if (columnSizing != null) s.columnSizing = columnSizing;
    if (columnPinning != null) s.columnPinning = columnPinning;
    if (rowPinning != null) s.rowPinning = rowPinning;
    return s;
  }, [
    sorting,
    columnFilters,
    globalFilter,
    columnVisibility,
    columnSizing,
    columnPinning,
    rowPinning,
  ]);

  const table = useReactTable({
    data,
    columns: orderedColumns,
    getCoreRowModel: getCoreRowModel(),
    state,
    onSortingChange: onSortingChange ?? (() => {}),
    onColumnFiltersChange: onColumnFiltersChange ?? (() => {}),
    onGlobalFilterChange: onGlobalFilterChange ?? (() => {}),
    onColumnVisibilityChange: onColumnVisibilityChange ?? (() => {}),
    onColumnSizingChange: onColumnSizingChange ?? (() => {}),
    onColumnPinningChange: onColumnPinningChange ?? (() => {}),
    onRowPinningChange: onRowPinningChange ?? (() => {}),
    getRowId,
  });

  return (
    <Table
      table={table}
      width={width}
      height={height}
      rowHeight={rowHeight}
      headerHeight={headerHeight}
      enableColumnDnD={enableColumnDnD}
      columnOrder={columnOrder}
      onColumnOrderChange={onColumnOrderChange}
    >
      <Thead>
        {table.getHeaderGroups().map((hg) => (
          <Tr key={hg.id}>
            {hg.headers.map((h) => (
              <Th key={h.id} colSpan={h.colSpan}>
                {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
              </Th>
            ))}
          </Tr>
        ))}
      </Thead>
      <Tbody>
        {table.getRowModel().rows.map((row) => (
          <Tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <Td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Td>
            ))}
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}

/** Reorder flat column defs by columnOrder. Columns not in columnOrder are appended. */
export function reorderColumnsBy<T>(
  columns: GridColumnDef<T>[],
  columnOrder: string[],
): GridColumnDef<T>[] {
  if (!columnOrder.length) return columns;
  const byId = new Map<string, GridColumnDef<T>>();
  for (const c of columns) {
    const id = getColumnId(c as GridColumnDef<unknown>);
    if (id) byId.set(id, c);
  }
  const ordered: GridColumnDef<T>[] = [];
  for (const id of columnOrder) {
    const c = byId.get(id);
    if (c) ordered.push(c);
  }
  for (const c of columns) {
    const id = getColumnId(c as GridColumnDef<unknown>);
    if (id && !columnOrder.includes(id)) ordered.push(c);
  }
  return ordered;
}

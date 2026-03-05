import type { GridColumn, GridInstance } from "./grid-instance";
import type { CellContext } from "./tanstack-types";
import type { Row } from "./row-model";

/** Represents a single cell in a row (TanStack-compatible). */
export interface Cell<TData, TValue = unknown> {
  /** Cell ID in format "{rowId}_{columnId}". */
  id: string;
  /** The row this cell belongs to. */
  row: Row<TData>;
  /** The column this cell belongs to. */
  column: GridColumn<TData, TValue>;
  /** Get the cell's resolved value. */
  getValue: () => TValue;
  /** Get the cell context for rendering. */
  getContext: () => CellContext<TData, TValue>;
}

/** Build a Cell object for a given row and column. */
export function buildCell<TData, TValue>(
  row: Row<TData>,
  column: GridColumn<TData, TValue>,
  table?: GridInstance<TData>,
): Cell<TData, TValue> {
  const cell: Cell<TData, TValue> = {
    id: `${row.id}_${column.id}`,
    row,
    column,
    getValue: () => row.getValue(column.id) as TValue,
    getContext: () => ({
      getValue: () => row.getValue(column.id) as TValue,
      renderValue: () => (row.getValue(column.id) as TValue) ?? null,
      row: {
        id: row.id,
        original: row.original,
        index: row.index,
        getValue: (columnId: string) => row.getValue(columnId),
        getAllCellValues: () => row.getAllCellValues(),
      },
      column: {
        id: column.id,
        columnDef: column.columnDef,
      },
      cell,
      table,
    }),
  };
  return cell;
}

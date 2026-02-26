import type {
  AccessorKeyColumnDef,
  AccessorFnColumnDef,
  DisplayColumnDef,
  GroupColumnDef,
  ColumnDefBase,
} from "./tanstack-types";

/** Column helper type — mirrors TanStack's createColumnHelper API. */
export interface ColumnHelper<TData> {
  /** Define a column by accessor key (property name) with proper type inference. */
  accessor<K extends keyof TData & string>(
    accessor: K,
    column: ColumnDefBase<TData, TData[K]>,
  ): AccessorKeyColumnDef<TData, TData[K]>;

  /** Define a column by accessor function with proper type inference. */
  accessor<TValue>(
    accessor: (row: TData, index: number) => TValue,
    column: ColumnDefBase<TData, TValue> & { id: string },
  ): AccessorFnColumnDef<TData, TValue>;

  /** Define a display-only column (no data accessor). */
  display(column: DisplayColumnDef<TData>): DisplayColumnDef<TData>;

  /** Define a group column (contains sub-columns). */
  group(
    column: Omit<GroupColumnDef<TData>, "accessorKey" | "accessorFn">,
  ): GroupColumnDef<TData>;
}

/**
 * Create a typed column helper for defining grid columns.
 * Follows TanStack Table's createColumnHelper pattern.
 *
 * @example
 * ```ts
 * const helper = createColumnHelper<Person>();
 *
 * const columns = [
 *   helper.accessor('firstName', { header: 'First Name', size: 150 }),
 *   helper.accessor((row) => row.age * 2, { id: 'doubleAge', header: 'Double Age' }),
 *   helper.display({ id: 'actions', header: 'Actions' }),
 *   helper.group({ header: 'Name', columns: [...] }),
 * ];
 * ```
 */
export function createColumnHelper<TData>(): ColumnHelper<TData> {
  return {
    accessor: (accessor: any, column: any) => {
      if (typeof accessor === "function") {
        return {
          ...column,
          accessorFn: accessor,
        };
      }
      return {
        ...column,
        accessorKey: accessor,
      };
    },
    display: (column) => column,
    group: (column) => column as GroupColumnDef<TData>,
  };
}

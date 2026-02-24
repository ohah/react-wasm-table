/** Column definition for the table. */
export interface ColumnDef<T = unknown> {
  /** Unique key identifying this column. */
  key: string;
  /** Header text to display. */
  header: string;
  /** Column width in pixels. */
  width?: number;
  /** Whether this column is sortable. */
  sortable?: boolean;
  /** Whether this column is filterable. */
  filterable?: boolean;
  /** Custom cell renderer. */
  cell?: (value: unknown, row: T) => React.ReactNode;
}

/** Sort direction. */
export type SortDirection = "asc" | "desc";

/** Sort configuration for a column. */
export interface SortConfig {
  columnIndex: number;
  direction: SortDirection;
}

/** Filter operator types. */
export type FilterOperator = "eq" | "neq" | "contains" | "gt" | "lt" | "gte" | "lte";

/** A single filter condition. */
export interface FilterCondition {
  columnKey: string;
  operator: FilterOperator;
  value: unknown;
}

/** Virtual scroll slice metadata. */
export interface VirtualSlice {
  startIndex: number;
  endIndex: number;
  offsetY: number;
  totalHeight: number;
  visibleCount: number;
}

/** Result from a table query. */
export interface TableResult {
  rows: unknown[][];
  totalCount: number;
  filteredCount: number;
  virtualSlice: VirtualSlice;
}

/** Props for the Table component. */
export interface TableProps<T = unknown> {
  /** Column definitions. */
  columns: ColumnDef<T>[];
  /** Data rows as arrays of values. */
  data: T[][];
  /** Row height in pixels. @default 40 */
  rowHeight?: number;
  /** Height of the table viewport in pixels. @default 600 */
  height?: number;
  /** Number of overscan rows above/below the viewport. @default 5 */
  overscan?: number;
  /** Called when sort changes. */
  onSortChange?: (sorts: SortConfig[]) => void;
  /** Called when filter changes. */
  onFilterChange?: (filters: FilterCondition[]) => void;
  /** Additional CSS class name. */
  className?: string;
}

/** WASM TableEngine interface. */
export interface WasmTableEngine {
  setColumns(columns: JsColumnDef[]): void;
  setData(data: unknown[][]): void;
  rowCount(): number;
  setScrollConfig(rowHeight: number, viewportHeight: number, overscan: number): void;
  setSort(configs: JsSortConfig[]): void;
  setFilters(conditions: JsFilterCondition[]): void;
  query(scrollTop: number): TableResult;
}

/** JS-side column def for WASM. */
export interface JsColumnDef {
  key: string;
  header: string;
  width?: number;
  sortable: boolean;
  filterable: boolean;
}

/** JS-side sort config for WASM. */
export interface JsSortConfig {
  columnIndex: number;
  direction: "Ascending" | "Descending";
}

/** JS-side filter condition for WASM. */
export interface JsFilterCondition {
  columnKey: string;
  operator: string;
  value: unknown;
}

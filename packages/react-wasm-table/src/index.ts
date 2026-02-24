// Components
export { Table } from "./components/Table";
export { TableHeader } from "./components/TableHeader";
export { TableBody } from "./components/TableBody";
export { TableRow } from "./components/TableRow";

// Context
export { WasmProvider, useWasm } from "./context";

// Hooks
export { useTable } from "./hooks/use-table";
export { useVirtualScroll } from "./hooks/use-virtual-scroll";
export { useSorting } from "./hooks/use-sorting";

// WASM loader
export { initWasm, createTableEngine, isWasmReady } from "./wasm-loader";

// Types
export type {
  ColumnDef,
  SortDirection,
  SortConfig,
  FilterOperator,
  FilterCondition,
  VirtualSlice,
  TableResult,
  TableProps,
} from "./types";

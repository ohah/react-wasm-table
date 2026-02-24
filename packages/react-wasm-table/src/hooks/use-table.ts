import { useCallback, useEffect, useRef, useState } from "react";
import { createTableEngine } from "../wasm-loader";
import { useWasm } from "../context";
import type {
  ColumnDef,
  FilterCondition,
  SortConfig,
  TableResult,
  WasmTableEngine,
} from "../types";

interface UseTableOptions {
  columns: ColumnDef[];
  data: unknown[][];
  rowHeight?: number;
  viewportHeight?: number;
  overscan?: number;
}

interface UseTableReturn {
  result: TableResult | null;
  sortConfigs: SortConfig[];
  filterConditions: FilterCondition[];
  setSortConfigs: (configs: SortConfig[]) => void;
  setFilterConditions: (conditions: FilterCondition[]) => void;
  handleScroll: (scrollTop: number) => void;
  ready: boolean;
}

export function useTable({
  columns,
  data,
  rowHeight = 40,
  viewportHeight = 600,
  overscan = 5,
}: UseTableOptions): UseTableReturn {
  const { ready } = useWasm();
  const engineRef = useRef<WasmTableEngine | null>(null);
  const [result, setResult] = useState<TableResult | null>(null);
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([]);
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const scrollTopRef = useRef(0);

  // Initialize engine when WASM is ready
  useEffect(() => {
    if (!ready) return;
    engineRef.current = createTableEngine();
  }, [ready]);

  // Update engine when data/columns change
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.setColumns(
      columns.map((c) => ({
        key: c.key,
        header: c.header,
        width: c.width,
        sortable: c.sortable ?? true,
        filterable: c.filterable ?? true,
      })),
    );
    engine.setData(data);
    engine.setScrollConfig(rowHeight, viewportHeight, overscan);

    // Re-query with current scroll position
    setResult(engine.query(scrollTopRef.current));
  }, [columns, data, rowHeight, viewportHeight, overscan, ready]);

  // Update sort
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.setSort(
      sortConfigs.map((s) => ({
        columnIndex: s.columnIndex,
        direction: s.direction === "asc" ? "Ascending" : "Descending",
      })),
    );
    setResult(engine.query(scrollTopRef.current));
  }, [sortConfigs]);

  // Update filters
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.setFilters(
      filterConditions.map((f) => ({
        columnKey: f.columnKey,
        operator: f.operator,
        value: f.value,
      })),
    );
    setResult(engine.query(scrollTopRef.current));
  }, [filterConditions]);

  const handleScroll = useCallback((scrollTop: number) => {
    scrollTopRef.current = scrollTop;
    const engine = engineRef.current;
    if (!engine) return;
    setResult(engine.query(scrollTop));
  }, []);

  return {
    result,
    sortConfigs,
    filterConditions,
    setSortConfigs,
    setFilterConditions,
    handleScroll,
    ready,
  };
}

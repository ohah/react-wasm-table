import { useRef, useEffect } from "react";
import type { WasmTableEngine } from "../../types";
import type { ColumnRegistry } from "../../adapter/column-registry";
import { StringTable } from "../../adapter/string-table";
import { ingestData } from "../../adapter/data-ingestor";

const OVERSCAN = 5;

export interface UseDataIngestionParams {
  engine: WasmTableEngine | null;
  data: Record<string, unknown>[];
  columnRegistry: ColumnRegistry;
  rowHeight: number;
  height: number;
  headerHeight: number;
  invalidate: () => void;
}

export function useDataIngestion({
  engine,
  data,
  columnRegistry,
  rowHeight,
  height,
  headerHeight,
  invalidate,
}: UseDataIngestionParams) {
  const stringTableRef = useRef(new StringTable());
  const prevColumnKeyRef = useRef("");
  const prevDataLenRef = useRef(0);

  useEffect(() => {
    if (!engine) return;

    // Full ingestion — runs when React deps change (data, engine, etc.)
    const ingest = (columns: ReturnType<ColumnRegistry["getAll"]>) => {
      if (columns.length === 0) return;
      const columnIds = columns.map((c) => c.id);
      prevColumnKeyRef.current = columnIds.join("\0");
      ingestData(engine, data, columnIds);
      engine.setColumnarScrollConfig(rowHeight, height - headerHeight, OVERSCAN);

      // Streaming optimization: use append for incremental data growth
      if (prevDataLenRef.current > 0 && data.length > prevDataLenRef.current) {
        stringTableRef.current.append(data, columnIds, prevDataLenRef.current);
      } else {
        stringTableRef.current.populate(data, columnIds);
      }
      prevDataLenRef.current = data.length;
      invalidate();
    };

    ingest(columnRegistry.getAll());

    // Column change listener — only re-ingest if column ID order changed
    // (skip on size-only changes from drag resize)
    const onColumnChange = () => {
      const columns = columnRegistry.getAll();
      if (columns.length === 0) return;
      const columnIds = columns.map((c) => c.id);
      const key = columnIds.join("\0");
      if (key !== prevColumnKeyRef.current) {
        ingest(columns);
      }
    };

    return columnRegistry.onChange(onColumnChange);
  }, [engine, data, columnRegistry, rowHeight, height, headerHeight, invalidate]);

  return { stringTableRef };
}

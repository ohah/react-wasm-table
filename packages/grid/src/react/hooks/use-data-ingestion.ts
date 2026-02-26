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

  useEffect(() => {
    if (!engine) return;
    const columns = columnRegistry.getAll();
    if (columns.length === 0) return;

    const columnIds = columns.map((c) => c.id);

    // Columnar ingestion: Object[] → typed arrays → WASM (no serde for numerics)
    ingestData(engine, data, columnIds);
    engine.setColumnarScrollConfig(rowHeight, height - headerHeight, OVERSCAN);

    // Populate JS-side string table for display
    stringTableRef.current.populate(data, columnIds);

    invalidate();
  }, [engine, data, columnRegistry, rowHeight, height, headerHeight, invalidate]);

  return { stringTableRef };
}

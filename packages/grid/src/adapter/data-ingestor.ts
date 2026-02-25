import type { WasmTableEngine } from "../types";

/** Detected column type for ingestion. */
export type ColumnDataType = "float64" | "bool" | "string";

/**
 * Detect the data type for each column by sampling the first non-null value.
 */
export function classifyColumns(
  data: Record<string, unknown>[],
  columnIds: string[],
): ColumnDataType[] {
  return columnIds.map((id) => {
    for (const row of data) {
      const v = row[id];
      if (v === null || v === undefined) continue;
      if (typeof v === "boolean") return "bool";
      if (typeof v === "number") return "float64";
      return "string";
    }
    return "string"; // default for all-null columns
  });
}

/**
 * Build a Float64Array from a numeric column.
 * null/undefined → NaN (sentinel).
 */
export function buildFloat64Column(data: Record<string, unknown>[], colId: string): Float64Array {
  const arr = new Float64Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const v = data[i]![colId];
    arr[i] = typeof v === "number" ? v : Number.NaN;
  }
  return arr;
}

/**
 * Build a Float64Array for a boolean column.
 * true → 1.0, false → 0.0, null/undefined → NaN.
 */
export function buildBoolColumn(data: Record<string, unknown>[], colId: string): Float64Array {
  const arr = new Float64Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const v = data[i]![colId];
    if (v === true) arr[i] = 1.0;
    else if (v === false) arr[i] = 0.0;
    else arr[i] = Number.NaN;
  }
  return arr;
}

/**
 * Build interned string column data.
 * Returns [uniqueStrings, idArray] where idArray maps each row to a unique string index.
 * Empty string is always ID 0 (null sentinel).
 */
export function buildStringColumn(
  data: Record<string, unknown>[],
  colId: string,
): [string[], Uint32Array] {
  const lookup = new Map<string, number>();
  lookup.set("", 0); // null sentinel
  const unique: string[] = [""];
  const ids = new Uint32Array(data.length);

  for (let i = 0; i < data.length; i++) {
    const v = data[i]![colId];
    const s = v == null ? "" : String(v);
    let id = lookup.get(s);
    if (id === undefined) {
      id = unique.length;
      unique.push(s);
      lookup.set(s, id);
    }
    ids[i] = id;
  }

  return [unique, ids];
}

/**
 * Full ingestion orchestrator: classify → build typed arrays → push to WASM engine.
 * Bypasses serde for numeric and boolean columns.
 */
export function ingestData(
  engine: WasmTableEngine,
  data: Record<string, unknown>[],
  columnIds: string[],
): void {
  const types = classifyColumns(data, columnIds);
  const colCount = columnIds.length;
  const rowCount = data.length;

  engine.initColumnar(colCount, rowCount);

  for (let i = 0; i < colCount; i++) {
    const colId = columnIds[i]!;
    switch (types[i]) {
      case "float64": {
        const values = buildFloat64Column(data, colId);
        engine.ingestFloat64Column(i, values);
        break;
      }
      case "bool": {
        const values = buildBoolColumn(data, colId);
        engine.ingestBoolColumn(i, values);
        break;
      }
      case "string": {
        const [unique, ids] = buildStringColumn(data, colId);
        engine.ingestStringColumn(i, unique, ids);
        break;
      }
    }
  }

  engine.finalizeColumnar();
}

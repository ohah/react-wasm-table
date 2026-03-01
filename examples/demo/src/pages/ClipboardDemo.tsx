import { useState, useMemo, useCallback, useRef } from "react";
import {
  Grid,
  createColumnHelper,
  useGridTable,
  getCoreRowModel,
  copyToClipboard,
  pasteFromClipboard,
  type NormalizedRange,
  type GridColumnDef,
  type SortingState,
  type ViewIndicesRef,
} from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

type SmallRow = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<SmallRow>();

type ParseResult = { ok: true; value: unknown } | { ok: false; error: string };

/**
 * Parse pasted string to the same type as the existing cell value.
 * Returns error if type doesn't match (e.g. non-numeric string into number column) so caller can abort paste.
 */
function parsePasteValue(raw: string, existing: unknown, columnId: string): ParseResult {
  if (typeof existing === "number") {
    const s = String(raw).replace(/,/g, "").trim();
    if (s === "") return { ok: true, value: existing };
    const n = Number(s);
    if (!Number.isFinite(n)) {
      return { ok: false, error: `'${columnId}': '${raw}' is not a valid number` };
    }
    return { ok: true, value: n };
  }
  if (typeof existing === "boolean") {
    const s = raw.toLowerCase().trim();
    if (s === "true" || s === "1") return { ok: true, value: true };
    if (s === "false" || s === "0" || s === "") return { ok: true, value: false };
    return { ok: false, error: `'${columnId}': '${raw}' is not true/false` };
  }
  return { ok: true, value: raw };
}

export function ClipboardDemo() {
  const [data, setData] = useState<SmallRow[]>(() => generateSmallData() as SmallRow[]);
  const [selection, setSelection] = useState<NormalizedRange | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [copyFormat, setCopyFormat] = useState<"tsv" | "csv" | "html">("tsv");
  const [includeHeaders, setIncludeHeaders] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const columns = useMemo<GridColumnDef<SmallRow, any>[]>(
    () => [
      helper.accessor("name", { header: "Name", size: 180, padding: [0, 8], enableSorting: true }),
      helper.accessor("dept", {
        header: "Department",
        size: 140,
        padding: [0, 8],
        enableSorting: true,
      }),
      helper.accessor("salary", {
        header: "Salary",
        size: 120,
        align: "right",
        padding: [0, 8],
        enableSorting: true,
      }),
      helper.accessor("score", {
        header: "Score",
        size: 100,
        align: "right",
        padding: [0, 8],
        enableSorting: true,
      }),
    ],
    [],
  );

  const viewIndicesRef = useRef<Uint32Array | number[] | null>(null) as ViewIndicesRef;

  const table = useGridTable<SmallRow>({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    viewIndicesRef,
  });

  const onCopy = useCallback(
    (_tsv: string, range: NormalizedRange) => {
      const out = copyToClipboard(table, range, {
        format: copyFormat,
        includeHeaders: includeHeaders,
      });
      setLog((prev) =>
        [
          `Copy: ${range.maxRow - range.minRow + 1} rows as ${copyFormat.toUpperCase()}`,
          ...prev,
        ].slice(0, 8),
      );
      return out;
    },
    [table, copyFormat, includeHeaders],
  );

  const onPaste = useCallback(
    (text: string, target: { row: number; col: number }) => {
      const { cells, target: t, columnIds } = pasteFromClipboard(table, text, target);
      if (cells.length === 0 || columnIds.length === 0) return;

      const prev = data;
      const updates: { dataIndex: number; key: string; value: unknown }[] = [];
      for (let r = 0; r < cells.length; r++) {
        const viewRow = t.row + r;
        if (viewRow >= prev.length) break;
        const row = table.getRow(viewRow);
        const dataIndex = parseInt(row.id, 10);
        if (dataIndex < 0 || dataIndex >= prev.length) continue;
        const existing = prev[dataIndex] as Record<string, unknown>;
        for (let c = 0; c < cells[r]!.length && c < columnIds.length; c++) {
          const key = columnIds[c]!;
          const raw = cells[r]![c]!;
          const current = existing[key];
          const result = parsePasteValue(raw, current, key);
          if (!result.ok) {
            setLog((logPrev) =>
              [`Paste error (row ${viewRow}, col ${c}): ${result.error}`, ...logPrev].slice(0, 8),
            );
            return;
          }
          updates.push({ dataIndex, key, value: result.value });
        }
      }

      setData((prevData) => {
        const next = prevData.map((row) => ({ ...row }));
        for (const u of updates) {
          (next[u.dataIndex] as any)[u.key] = u.value;
        }
        return next;
      });
      setLog((prev) =>
        [`Paste: ${cells.length}×${cells[0]?.length ?? 0} at (${t.row},${t.col})`, ...prev].slice(
          0,
          8,
        ),
      );
    },
    [table, data],
  );

  return (
    <>
      <h1>Clipboard Utilities</h1>
      <p>
        <code>copyToClipboard</code> and <code>pasteFromClipboard</code> with Grid{" "}
        <code>onCopy</code> / <code>onPaste</code>. Select cells and use Ctrl/Cmd+C to copy
        (TSV/CSV/HTML). Focus the grid and Ctrl/Cmd+V to paste from clipboard. Column headers are
        sortable — copy/paste use view order (sorted rows map to the correct data rows).
      </p>

      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          Copy format:
          <select
            value={copyFormat}
            onChange={(e) => setCopyFormat(e.target.value as "tsv" | "csv" | "html")}
            style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #ccc" }}
          >
            <option value="tsv">TSV</option>
            <option value="csv">CSV</option>
            <option value="html">HTML (Excel)</option>
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={includeHeaders}
            onChange={(e) => setIncludeHeaders(e.target.checked)}
          />
          Include headers
        </label>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <section style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, marginBottom: 6 }}>Grid API</h4>
            <Grid
              data={data}
              width={560}
              height={460}
              columns={columns}
              sorting={sorting}
              onSortingChange={setSorting}
              selection={selection}
              onSelectionChange={setSelection}
              onCopy={onCopy}
              onPaste={onPaste}
              viewIndicesRef={viewIndicesRef}
            />
          </section>
        </div>
        <div style={{ minWidth: 200 }}>
          <div
            style={{
              padding: 12,
              background: "#f5f5f5",
              borderRadius: 4,
              fontSize: 13,
            }}
          >
            <strong>Log</strong>
            {log.length === 0 && (
              <div style={{ color: "#999", marginTop: 6 }}>Copy or paste to see log</div>
            )}
            {log.map((entry, i) => (
              <div key={i} style={{ marginTop: 4, color: "#333" }}>
                {entry}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

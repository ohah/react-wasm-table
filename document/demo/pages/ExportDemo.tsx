import { useState, useMemo, useCallback } from "react";
import {
  Grid,
  createColumnHelper,
  buildRowModel,
  exportToCSV,
  exportToTSV,
  exportToJSON,
  type SortingState,
  type GridColumnDef,
} from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

type SmallRow = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<SmallRow>();

export function ExportDemo() {
  const data = useMemo(() => generateSmallData() as SmallRow[], []);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [output, setOutput] = useState("");
  const [format, setFormat] = useState<"csv" | "tsv" | "json">("csv");
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  const columns = useMemo(
    () => [
      helper.accessor("name", {
        header: "Name",
        size: 180,
        enableSorting: true,
        padding: [0, 8],
      }),
      helper.accessor("dept", {
        header: "Department",
        size: 140,
        enableSorting: true,
        padding: [0, 8],
      }),
      helper.accessor("salary", {
        header: "Salary",
        size: 120,
        enableSorting: true,
        align: "right",
        padding: [0, 8],
      }),
      helper.accessor("score", {
        header: "Score",
        size: 100,
        enableSorting: true,
        align: "right",
        padding: [0, 8],
      }),
    ],
    [],
  );

  // Build a RowModel from current data + sorting
  // For demo: sorting is visual only (WASM-side), so we show unsorted export.
  // Real apps would use table.getRowModel() from useGridTable.
  const rowModel = useMemo(
    () => buildRowModel(data, null, columns as GridColumnDef<SmallRow, any>[]),
    [data, columns],
  );

  const allColumnIds = useMemo(() => ["name", "dept", "salary", "score"], []);

  const doExport = useCallback(() => {
    const opts = {
      columns: selectedColumns.length > 0 ? selectedColumns : undefined,
      includeHeaders,
    };
    let result: string;
    if (format === "csv") {
      result = exportToCSV(rowModel, opts);
    } else if (format === "tsv") {
      result = exportToTSV(rowModel, opts);
    } else {
      const json = exportToJSON(rowModel, {
        columns: selectedColumns.length > 0 ? selectedColumns : undefined,
      });
      result = JSON.stringify(json, null, 2);
    }
    setOutput(result);
  }, [format, rowModel, selectedColumns, includeHeaders]);

  const doDownload = useCallback(() => {
    if (!output) return;
    const mimeTypes = {
      csv: "text/csv",
      tsv: "text/tab-separated-values",
      json: "application/json",
    };
    const blob = new Blob([output], { type: mimeTypes[format] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [output, format]);

  const toggleColumn = (id: string) => {
    setSelectedColumns((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  return (
    <>
      <h1>Data Export</h1>
      <p>
        Export grid data using <code>exportToCSV</code>, <code>exportToTSV</code>, or{" "}
        <code>exportToJSON</code>. These functions consume a <code>RowModel</code> — use{" "}
        <code>buildRowModel()</code> directly or <code>table.getRowModel()</code> for
        sorted/filtered data.
      </p>

      <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "flex-start" }}>
        <div>
          <section style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, marginBottom: 6 }}>Grid API</h4>
            <Grid
              data={data}
              width={560}
              height={340}
              columns={columns}
              sorting={sorting}
              onSortingChange={setSorting}
            />
          </section>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Format selector */}
          <div>
            <div style={{ fontSize: 12, color: "var(--demo-muted-4)", marginBottom: 4 }}>Format</div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["csv", "tsv", "json"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  style={{
                    padding: "4px 12px",
                    border: "1px solid var(--demo-border-2)",
                    borderRadius: 4,
                    background: format === f ? "#1976d2" : "#fff",
                    color: format === f ? "#fff" : "#333",
                    cursor: "pointer",
                    fontWeight: format === f ? 600 : 400,
                  }}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Column selection */}
          <div>
            <div style={{ fontSize: 12, color: "var(--demo-muted-4)", marginBottom: 4 }}>
              Columns{" "}
              {selectedColumns.length > 0 ? `(${selectedColumns.length} selected)` : "(all)"}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {allColumnIds.map((id) => (
                <label
                  key={id}
                  style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}
                >
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(id)}
                    onChange={() => toggleColumn(id)}
                  />
                  {id}
                </label>
              ))}
            </div>
          </div>

          {/* Options */}
          {format !== "json" && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={includeHeaders}
                onChange={(e) => setIncludeHeaders(e.target.checked)}
              />
              Include headers
            </label>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={doExport}
              style={{
                padding: "6px 16px",
                background: "#1976d2",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Export
            </button>
            <button
              onClick={doDownload}
              disabled={!output}
              style={{
                padding: "6px 16px",
                background: output ? "#4caf50" : "#ccc",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: output ? "pointer" : "default",
                fontWeight: 600,
              }}
            >
              Download
            </button>
            <button
              onClick={() => {
                if (output) {
                  navigator.clipboard.writeText(output);
                }
              }}
              disabled={!output}
              style={{
                padding: "6px 16px",
                background: output ? "#ff9800" : "#ccc",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: output ? "pointer" : "default",
                fontWeight: 600,
              }}
            >
              Copy
            </button>
          </div>
        </div>
      </div>

      {/* Code snippet */}
      <pre
        style={{
          background: "var(--demo-code-bg)",
          color: "var(--demo-code-fg)",
          padding: 12,
          borderRadius: 4,
          fontSize: 12,
          overflowX: "auto",
          marginBottom: 12,
        }}
      >
        {`import { buildRowModel, exportTo${format.toUpperCase()} } from "@ohah/react-wasm-table";\n\n`}
        {`const rowModel = buildRowModel(data, null, columns);\n`}
        {format === "json"
          ? `const result = exportToJSON(rowModel${selectedColumns.length > 0 ? `, { columns: ${JSON.stringify(selectedColumns)} }` : ""});\n`
          : `const result = exportTo${format.toUpperCase()}(rowModel, {\n`}
        {format !== "json" && `  includeHeaders: ${includeHeaders},\n`}
        {format !== "json" &&
          selectedColumns.length > 0 &&
          `  columns: ${JSON.stringify(selectedColumns)},\n`}
        {format !== "json" && `});\n`}
      </pre>

      {/* Output preview */}
      {output && (
        <pre
          style={{
            background: "var(--demo-code-block-bg)",
            color: "var(--demo-code-block-fg)",
            padding: 12,
            borderRadius: 4,
            fontSize: 12,
            maxHeight: 300,
            overflowY: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {output}
        </pre>
      )}
    </>
  );
}

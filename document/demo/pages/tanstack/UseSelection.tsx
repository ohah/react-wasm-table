import { useState, useMemo, useCallback } from "react";
import {
  Table,
  useReactTable,
  flexRender,
  getCoreRowModel,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  createColumnHelper,
  type NormalizedRange,
} from "@ohah/react-wasm-table";
import { generateSmallData } from "../../data";
import { CodeSnippet } from "../../components/CodeSnippet";

type SmallRow = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<SmallRow>();

const btnStyle: React.CSSProperties = {
  padding: "4px 12px",
  borderRadius: 4,
  border: "1px solid var(--demo-border-2)",
  background: "var(--demo-card-bg)",
  cursor: "pointer",
  fontSize: 13,
};

export function TanStackUseSelection() {
  const data = useMemo(() => generateSmallData(), []);
  const [selection, setSelection] = useState<NormalizedRange | null>(null);
  const [copyLog, setCopyLog] = useState<string[]>([]);
  const [guardEnabled, setGuardEnabled] = useState(false);
  const MAX_ROW = 5;
  const [copyFormat, setCopyFormat] = useState<"tsv" | "json">("tsv");
  const [salarySelectable, setSalarySelectable] = useState(true);

  const columns = useMemo(
    () => [
      helper.accessor("name", { header: "Name", size: 180, padding: [0, 8] }),
      helper.accessor("dept", { header: "Department", size: 140, padding: [0, 8] }),
      helper.accessor("salary", {
        header: "Salary",
        size: 120,
        align: "right",
        padding: [0, 8],
        enableSelection: salarySelectable,
      }),
      helper.accessor("score", { header: "Score", size: 100, align: "right", padding: [0, 8] }),
    ],
    [salarySelectable],
  );

  const onBeforeSelectionChange = useCallback(
    (next: NormalizedRange | null) => {
      if (!guardEnabled) return;
      if (next && next.maxRow > MAX_ROW) return false;
    },
    [guardEnabled],
  );

  const onCopy = useCallback(
    (tsv: string, range: NormalizedRange) => {
      if (copyFormat === "json") {
        const rows = tsv.split("\n").map((line) => line.split("\t"));
        setCopyLog((prev) => [`[JSON] ${rows.length} rows copied`, ...prev].slice(0, 10));
        return JSON.stringify(rows, null, 2);
      }
      setCopyLog((prev) =>
        [`[TSV] ${range.maxRow - range.minRow + 1} rows copied`, ...prev].slice(0, 10),
      );
    },
    [copyFormat],
  );

  const table = useReactTable({
    data: data as SmallRow[],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const selectAll = useCallback(() => {
    setSelection({ minRow: 0, maxRow: data.length - 1, minCol: 0, maxCol: columns.length - 1 });
  }, [data.length, columns.length]);

  return (
    <>
      <h1>useSelection Hook</h1>
      <p>
        Demonstrates controlled selection, <code>onBeforeSelectionChange</code> guard, custom{" "}
        <code>onCopy</code>, and per-column <code>enableSelection</code>.
      </p>

      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={guardEnabled}
            onChange={(e) => setGuardEnabled(e.target.checked)}
          />
          Selection guard (rows 0-{MAX_ROW} only)
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={salarySelectable}
            onChange={(e) => setSalarySelectable(e.target.checked)}
          />
          Salary column selectable
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          Copy format:
          <select
            value={copyFormat}
            onChange={(e) => setCopyFormat(e.target.value as "tsv" | "json")}
            style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid var(--demo-border-2)" }}
          >
            <option value="tsv">TSV</option>
            <option value="json">JSON</option>
          </select>
        </label>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={selectAll} style={btnStyle}>
          Select All
        </button>
        <button onClick={() => setSelection(null)} style={btnStyle}>
          Clear Selection
        </button>
        <button
          onClick={() => setSelection({ minRow: 0, maxRow: 2, minCol: 0, maxCol: 1 })}
          style={btnStyle}
        >
          Select rows 0-2, cols 0-1
        </button>
      </div>

      <Table
        table={table}
        width={560}
        height={340}
        selection={selection}
        onSelectionChange={setSelection}
        onBeforeSelectionChange={onBeforeSelectionChange}
        onCopy={onCopy}
      >
        <Thead>
          {table.getHeaderGroups().map((hg) => (
            <Tr key={hg.id}>
              {hg.headers.map((h) => (
                <Th key={h.id} colSpan={h.colSpan}>
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </Th>
              ))}
            </Tr>
          ))}
        </Thead>
        <Tbody>
          {table.getRowModel().rows.map((row) => (
            <Tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <Td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>

      <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
        <div style={{ padding: 12, background: "var(--demo-panel-bg)", borderRadius: 4, fontSize: 13, flex: 1 }}>
          <strong>Selection state:</strong>
          <pre style={{ margin: "4px 0 0", fontSize: 12 }}>
            {selection ? JSON.stringify(selection, null, 2) : "null"}
          </pre>
        </div>
        <div style={{ padding: 12, background: "var(--demo-panel-bg)", borderRadius: 4, fontSize: 13, flex: 1 }}>
          <strong>Copy log:</strong>
          {copyLog.length === 0 && (
            <div style={{ color: "var(--demo-muted-5)", marginTop: 4 }}>Select cells and Ctrl/Cmd+C</div>
          )}
          {copyLog.map((entry, i) => (
            <div key={i} style={{ color: "var(--demo-muted-2)", marginTop: 2 }}>
              {entry}
            </div>
          ))}
        </div>
      </div>
      <CodeSnippet>{`const [selection, setSelection] = useState<NormalizedRange | null>(null);

const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

<Table
  table={table}
  width={560}
  height={340}
  selection={selection}
  onSelectionChange={setSelection}
  onBeforeSelectionChange={(next) => guardEnabled && next && next.maxRow > 5 ? false : undefined}
  onCopy={(tsv, range) => { setCopyLog(prev => [...]); return copyFormat === "json" ? JSON.stringify(rows) : tsv; }}
>
  <Thead>
    {table.getHeaderGroups().map((hg) => (
      <Tr key={hg.id}>
        {hg.headers.map((h) => (
          <Th key={h.id} colSpan={h.colSpan}>
            {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
          </Th>
        ))}
      </Tr>
    ))}
  </Thead>
  <Tbody>
    {table.getRowModel().rows.map((row) => (
      <Tr key={row.id}>
        {row.getVisibleCells().map((cell) => (
          <Td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Td>
        ))}
      </Tr>
    ))}
  </Tbody>
</Table>`}</CodeSnippet>
    </>
  );
}

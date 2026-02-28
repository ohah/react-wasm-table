import { useState, useMemo, useCallback, useRef } from "react";
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
  copyToClipboard,
  type SortingState,
  type NormalizedRange,
} from "@ohah/react-wasm-table";
import { generateSmallData } from "../../data";
import { CodeSnippet } from "../../components/CodeSnippet";

type SmallRow = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<SmallRow>();

const columns = [
  helper.accessor("name", { header: "Name", size: 180, enableSorting: true, padding: [0, 8] }),
  helper.accessor("dept", {
    header: "Department",
    size: 140,
    enableSorting: true,
    padding: [0, 8],
  }),
  helper.accessor("salary", { header: "Salary", size: 120, align: "right", padding: [0, 8] }),
  helper.accessor("score", { header: "Score", size: 100, align: "right", padding: [0, 8] }),
];

export function TanStackClipboard() {
  const data = useMemo(() => generateSmallData() as SmallRow[], []);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selection, setSelection] = useState<NormalizedRange | null>(null);
  const [copyLog, setCopyLog] = useState<string[]>([]);
  const [format, setFormat] = useState<"tsv" | "csv">("tsv");

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  const onCopy = useCallback(
    (_raw: string, range: NormalizedRange) => {
      const out = copyToClipboard(table, range, { format, includeHeaders: true });
      setCopyLog((prev) =>
        [`Copy: ${range.maxRow - range.minRow + 1} rows (${format})`, ...prev].slice(0, 10),
      );
      return out;
    },
    [table, format],
  );

  return (
    <>
      <h1>TanStack API: Clipboard</h1>
      <p style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>
        useReactTable + Table. Selection + onCopy via copyToClipboard(table, range, opts).
      </p>
      <div style={{ marginBottom: 12 }}>
        <label>
          Format:{" "}
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as "tsv" | "csv")}
            style={{ padding: "4px 8px" }}
          >
            <option value="tsv">TSV</option>
            <option value="csv">CSV</option>
          </select>
        </label>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <Table
          table={table}
          width={560}
          height={340}
          selection={selection}
          onSelectionChange={setSelection}
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
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ padding: 12, background: "#f9f9f9", borderRadius: 4, fontSize: 13 }}>
            <strong>Copy log</strong>
            {copyLog.map((line, i) => (
              <div key={i} style={{ marginTop: 4 }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
      <CodeSnippet>{`const onCopy = useCallback(
  (_raw: string, range: NormalizedRange) => {
    const out = copyToClipboard(table, range, { format, includeHeaders: true });
    setCopyLog(prev => [\`Copy: \${range.maxRow - range.minRow + 1} rows (\${format})\`, ...prev].slice(0, 10));
    return out;  // returned string is written to clipboard
  },
  [table, format],
);

<Table table={table} selection={selection} onSelectionChange={setSelection} onCopy={onCopy} />`}</CodeSnippet>
    </>
  );
}

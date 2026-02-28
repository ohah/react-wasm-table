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
  exportToCSV,
  exportToTSV,
  exportToJSON,
  type SortingState,
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
];

export function TanStackExport() {
  const data = useMemo(() => generateSmallData() as SmallRow[], []);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [output, setOutput] = useState("");
  const [format, setFormat] = useState<"csv" | "tsv" | "json">("csv");

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  const doExport = useCallback(() => {
    const rowModel = table.getTotalRowModel();
    if (format === "csv") setOutput(exportToCSV(rowModel, { includeHeaders: true }));
    else if (format === "tsv") setOutput(exportToTSV(rowModel, { includeHeaders: true }));
    else setOutput(JSON.stringify(exportToJSON(rowModel), null, 2));
  }, [table, format]);

  return (
    <>
      <h1>TanStack API: Export</h1>
      <p style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>
        useReactTable + Table. Export current view (sorted) via table.getRowModel() +
        exportToCSV/TSV/JSON.
      </p>
      <div style={{ marginBottom: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as "csv" | "tsv" | "json")}
          style={{ padding: "4px 8px" }}
        >
          <option value="csv">CSV</option>
          <option value="tsv">TSV</option>
          <option value="json">JSON</option>
        </select>
        <button
          onClick={doExport}
          style={{
            padding: "6px 16px",
            borderRadius: 4,
            border: "1px solid #1976d2",
            background: "#1976d2",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Export
        </button>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <Table table={table} width={560} height={280}>
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
        <div style={{ flex: 1, minWidth: 200 }}>
          <pre
            style={{
              margin: 0,
              padding: 12,
              background: "#f5f5f5",
              borderRadius: 4,
              fontSize: 12,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              maxHeight: 320,
              overflow: "auto",
            }}
          >
            {output || "Click Export to see output."}
          </pre>
        </div>
      </div>
      <CodeSnippet>{`const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel(), state: { sorting }, onSortingChange: setSorting });

const doExport = () => {
  const rowModel = table.getTotalRowModel();
  if (format === "csv") setOutput(exportToCSV(rowModel, { includeHeaders: true }));
  else if (format === "tsv") setOutput(exportToTSV(rowModel, { includeHeaders: true }));
  else setOutput(JSON.stringify(exportToJSON(rowModel), null, 2));
};

// table.getTotalRowModel() returns all rows (ignoring virtual range) for export`}</CodeSnippet>
    </>
  );
}

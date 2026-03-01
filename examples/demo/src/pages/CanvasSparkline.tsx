import { useMemo, useState } from "react";
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
  Sparkline,
} from "@ohah/react-wasm-table";

type Row = { name: string; trend: number[] };
const helper = createColumnHelper<Row>();

const sampleData: Row[] = [
  { name: "Revenue", trend: [20, 34, 28, 45, 52, 38, 60, 55, 70, 65] },
  { name: "Users", trend: [100, 120, 115, 140, 180, 165, 200, 190, 220, 250] },
  { name: "CPU %", trend: [45, 62, 58, 70, 55, 48, 65, 72, 68, 60] },
  { name: "Latency", trend: [120, 95, 110, 88, 75, 90, 82, 78, 85, 70] },
];

const btnBase: React.CSSProperties = {
  padding: "4px 12px",
  border: "1px solid #ccc",
  borderRadius: 4,
  background: "#fff",
  cursor: "pointer",
  fontSize: 13,
};
const btnActive: React.CSSProperties = {
  ...btnBase,
  background: "#1976d2",
  color: "#fff",
  border: "1px solid #1976d2",
};

export function CanvasSparkline() {
  const [variant, setVariant] = useState<"line" | "area">("line");
  const [color, setColor] = useState("#1565c0");

  const columns = useMemo(
    () => [
      helper.accessor("name", { header: "Metric", size: 100, padding: [0, 8] }),
      helper.accessor("trend", {
        header: "Trend",
        size: 200,
        padding: [4, 12],
        cell: (info) => (
          <Sparkline data={info.getValue()} variant={variant} color={color} strokeWidth={1.5} />
        ),
      }),
    ],
    [variant, color],
  );

  const table = useReactTable({
    data: sampleData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <h1>Canvas: Sparkline</h1>
      <p>
        <code>Sparkline</code> draws a mini line chart from a <code>data</code> array (y-values).
        Supports <code>variant</code> (line | area), <code>color</code>, <code>strokeWidth</code>,
        and <code>style</code>.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
        <div>
          <strong>Variant:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {(["line", "area"] as const).map((v) => (
              <button
                key={v}
                style={variant === v ? btnActive : btnBase}
                onClick={() => setVariant(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div>
          <strong>Color:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
            {["#1565c0", "#2e7d32", "#c62828", "#f9a825"].map((c) => (
              <button
                key={c}
                style={{
                  ...(color === c ? btnActive : btnBase),
                  background: color === c ? c : undefined,
                  borderColor: c,
                }}
                onClick={() => setColor(c)}
              >
                {c === "#1565c0"
                  ? "Blue"
                  : c === "#2e7d32"
                    ? "Green"
                    : c === "#c62828"
                      ? "Red"
                      : "Orange"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Table (TanStack API)</h2>
        <Table table={table} width={360} height={240} rowHeight={44}>
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
      </section>
    </>
  );
}

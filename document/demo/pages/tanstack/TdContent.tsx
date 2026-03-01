import { useState, useMemo } from "react";
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
  Text,
  Badge,
  type SortingState,
} from "@ohah/react-wasm-table";
import { generateSmallData } from "../../data";
import { CodeSnippet } from "../../components/CodeSnippet";

type SmallRow = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<SmallRow>();

// ─── Pattern A: column.cell (cellDef) ─────────────────────────────────
// Cell callbacks receive real row.original → cross-column conditional rendering
const columnsA = [
  helper.accessor("name", {
    header: "Name",
    size: 180,
    enableSorting: true,
    padding: [0, 8],
    cell: (info) => {
      const row = info.row.original;
      return row.score >= 90 ? (
        <Text value={info.getValue()} fontWeight="bold" color="#1565c0" />
      ) : (
        <Text value={info.getValue()} />
      );
    },
  }),
  helper.accessor("dept", {
    header: "Department",
    size: 140,
    enableSorting: true,
    padding: [0, 8],
    cell: (info) => (
      <Badge value={info.getValue()} color="#333" backgroundColor="#e0e0e0" borderRadius={4} />
    ),
  }),
  helper.accessor("salary", {
    header: "Salary",
    size: 120,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
    cell: (info) => {
      const row = info.row.original;
      const color = row.score >= 90 ? "#2e7d32" : row.score >= 75 ? "#ed6c02" : "#d32f2f";
      return (
        <Text value={`$${info.getValue().toLocaleString()}`} fontWeight="bold" color={color} />
      );
    },
  }),
  helper.accessor("score", {
    header: "Score",
    size: 100,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
    cell: (info) => {
      const val = info.getValue();
      return (
        <Badge
          value={String(val)}
          color="white"
          backgroundColor={val >= 90 ? "#4caf50" : val >= 75 ? "#ff9800" : "#f44336"}
          borderRadius={4}
        />
      );
    },
  }),
];

// ─── Pattern B: <Td> children via row model map ──────────────────────
// No column.cell → Td children become the source of truth
const columnsB = [
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

export function TanStackTdContent() {
  const data = useMemo(() => generateSmallData() as SmallRow[], []);
  const [sortingA, setSortingA] = useState<SortingState>([]);
  const [sortingB, setSortingB] = useState<SortingState>([]);

  const tableA = useReactTable({
    data,
    columns: columnsA,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting: sortingA },
    onSortingChange: setSortingA,
  });

  const tableB = useReactTable({
    data,
    columns: columnsB,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting: sortingB },
    onSortingChange: setSortingB,
  });

  return (
    <>
      <h1>Td Content → Canvas</h1>

      {/* ── Pattern A: column.cell (cellDef) ── */}
      <h2 style={{ fontSize: 16, marginTop: 24 }}>Pattern A: column.cell callback (cellDef)</h2>
      <p style={{ fontSize: 13, color: "var(--demo-muted)", marginBottom: 8 }}>
        Cell callbacks receive real <code>row.original</code>. No <code>&lt;Td&gt;</code> children
        needed for rendering &mdash; the column definition drives the canvas output.
      </p>
      <ul
        style={{ fontSize: 12, color: "var(--demo-muted-4)", marginBottom: 12, paddingLeft: 20, lineHeight: 1.6 }}
      >
        <li>
          <strong>Name</strong>: bold blue when score &ge; 90 (<code>row.original.score</code>)
        </li>
        <li>
          <strong>Salary</strong>: color by score (cross-column)
        </li>
      </ul>

      <Table table={tableA} width={560} height={200}>
        <Thead>
          {tableA.getHeaderGroups().map((hg) => (
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
          {tableA.getRowModel().rows.map((row) => (
            <Tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <Td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>

      <CodeSnippet title="Pattern A: column.cell receives real CellContext">{`helper.accessor("salary", {
  cell: (info) => {
    const row = info.row.original;  // real row data!
    const color = row.score >= 90 ? "#2e7d32"
               : row.score >= 75 ? "#ed6c02" : "#d32f2f";
    return <Text value={\`$\${info.getValue().toLocaleString()}\`}
                 fontWeight="bold" color={color} />;
  },
});

// Resolution: column.cell callback → resolveInstruction → canvas`}</CodeSnippet>

      {/* ── Pattern B: <Td> children via row model ── */}
      <h2 style={{ fontSize: 16, marginTop: 32 }}>Pattern B: &lt;Td&gt; children via row model</h2>
      <p style={{ fontSize: 13, color: "var(--demo-muted)", marginBottom: 8 }}>
        Columns have <strong>no</strong> <code>cell</code> callback. Instead,{" "}
        <code>&lt;Td&gt;</code> children from the row model map are parsed and drawn on canvas. This
        is the TanStack Table idiom:
        <code> flexRender(cell.column.columnDef.cell, cell.getContext())</code> inside{" "}
        <code>&lt;Td&gt;</code>.
      </p>

      <Table table={tableB} width={560} height={200}>
        <Thead>
          {tableB.getHeaderGroups().map((hg) => (
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
          {tableB.getRowModel().rows.map((row) => (
            <Tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <Td key={cell.id}>
                  {/* Td children become canvas content via parsedBodyContent */}
                  {cell.column.id === "salary" ? (
                    <Text value={`$${row.original.salary.toLocaleString()}`} fontWeight="bold" />
                  ) : cell.column.id === "score" ? (
                    <Badge
                      value={String(row.original.score)}
                      color="white"
                      backgroundColor={
                        row.original.score >= 90
                          ? "#4caf50"
                          : row.original.score >= 75
                            ? "#ff9800"
                            : "#f44336"
                      }
                      borderRadius={4}
                    />
                  ) : (
                    String(row.getValue(cell.column.id) ?? "")
                  )}
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>

      <CodeSnippet title="Pattern B: Td children → canvas (parsedBodyContent)">{`// No column.cell needed — Td children ARE the render instructions
const columns = [
  helper.accessor("name", { header: "Name", size: 180 }),
  helper.accessor("salary", { header: "Salary", size: 120, align: "right" }),
  helper.accessor("score", { header: "Score", size: 100, align: "right" }),
];

<Table table={table} width={560} height={200}>
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
          <Td key={cell.id}>
            {/* This JSX is parsed → resolveInstruction → canvas */}
            {cell.column.id === "salary"
              ? <Text value={\`$\${row.original.salary.toLocaleString()}\`} fontWeight="bold" />
              : String(row.getValue(cell.column.id) ?? "")}
          </Td>
        ))}
      </Tr>
    ))}
  </Tbody>
</Table>`}</CodeSnippet>

      <CodeSnippet title="Resolution priority (getInstruction)">{`// 1. parsedBodyContent  — <Td> JSX children (highest priority)
// 2. cellDef            — column.cell callback (real CellContext)
// 3. StringTable        — default text fallback

// Pattern A uses priority #2 (cellDef)
// Pattern B uses priority #1 (parsedBodyContent)`}</CodeSnippet>
    </>
  );
}

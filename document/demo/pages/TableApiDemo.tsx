import { useState, useMemo } from "react";
import {
  Table,
  useReactTable,
  flexRender,
  createColumnHelper,
  getCoreRowModel,
  Text,
  Badge,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  type SortingState,
  type ColumnSizingState,
} from "@ohah/react-wasm-table";

type Person = {
  firstName: string;
  lastName: string;
  age: number;
  department: string;
  status: string;
  salary: number;
};

const DEPARTMENTS = ["Engineering", "Product", "Design", "Marketing", "Sales", "HR"];
const STATUSES = ["Active", "On Leave", "Inactive"];

function generatePeople(count: number): Person[] {
  const rng = (seed: number) => {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  };
  const rand = rng(42);
  const firstNames = [
    "Alice",
    "Bob",
    "Charlie",
    "Diana",
    "Eve",
    "Frank",
    "Grace",
    "Hank",
    "Ivy",
    "Jack",
    "Karen",
    "Leo",
  ];
  const lastNames = [
    "Kim",
    "Lee",
    "Park",
    "Choi",
    "Smith",
    "Johnson",
    "Brown",
    "Garcia",
    "Miller",
    "Davis",
  ];

  return Array.from({ length: count }, () => ({
    firstName: firstNames[Math.floor(rand() * firstNames.length)]!,
    lastName: lastNames[Math.floor(rand() * lastNames.length)]!,
    age: 22 + Math.floor(rand() * 40),
    department: DEPARTMENTS[Math.floor(rand() * DEPARTMENTS.length)]!,
    status: STATUSES[Math.floor(rand() * STATUSES.length)]!,
    salary: 40000 + Math.floor(rand() * 160000),
  }));
}

const helper = createColumnHelper<Person>();

const columns = [
  helper.accessor("firstName", {
    header: "First Name",
    size: 140,
    enableSorting: true,
    enableResizing: true,
    padding: [0, 8],
  }),
  helper.accessor("lastName", {
    header: "Last Name",
    size: 140,
    enableSorting: true,
    enableResizing: true,
    padding: [0, 8],
  }),
  helper.accessor("age", {
    header: "Age",
    size: 80,
    enableSorting: true,
    enableResizing: true,
    align: "right",
    padding: [0, 8],
    cell: (info) => <Text value={String(info.getValue())} fontWeight="bold" />,
  }),
  helper.accessor("department", {
    header: "Department",
    size: 140,
    enableSorting: true,
    enableResizing: true,
    padding: [0, 8],
    cell: (info) => (
      <Badge value={info.getValue()} color="#333" backgroundColor="#e3f2fd" borderRadius={4} />
    ),
  }),
  helper.accessor("status", {
    header: "Status",
    size: 100,
    enableSorting: true,
    enableResizing: true,
    padding: [0, 8],
    cell: (info) => {
      const v = info.getValue();
      const bg = v === "Active" ? "#4caf50" : v === "On Leave" ? "#ff9800" : "#9e9e9e";
      return <Badge value={v} color="white" backgroundColor={bg} borderRadius={4} />;
    },
  }),
  helper.accessor("salary", {
    header: "Salary",
    size: 120,
    enableSorting: true,
    enableResizing: true,
    align: "right",
    padding: [0, 8],
    cell: (info) => (
      <Text
        value={`$${info.getValue().toLocaleString()}`}
        fontWeight="bold"
        color={info.getValue() > 100000 ? "#2e7d32" : "#333"}
      />
    ),
  }),
];

const codeExample = `import {
  Table, useReactTable, flexRender,
  createColumnHelper, getCoreRowModel,
  Thead, Tbody, Tr, Th, Td,
} from "@ohah/react-wasm-table";

const [sorting, setSorting] = useState([]);
const [columnSizing, setColumnSizing] = useState({});

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  state: { sorting, columnSizing },
  // TanStack updater pattern: pass useState setter directly
  onSortingChange: setSorting,
  onColumnSizingChange: setColumnSizing,
});

<Table table={table} width={800} height={500}>
  <Thead>
    {table.getHeaderGroups().map(hg => (
      <Tr key={hg.id}>
        {hg.headers.map(h => (
          <Th key={h.id} colSpan={h.colSpan}>
            {flexRender(h.column.columnDef.header, h.getContext())}
          </Th>
        ))}
      </Tr>
    ))}
  </Thead>
  <Tbody>
    {table.getRowModel().rows.map(row => (
      <Tr key={row.id}>
        {row.getVisibleCells().map(cell => (
          <Td key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </Td>
        ))}
      </Tr>
    ))}
  </Tbody>
</Table>`;

export function TableApiDemo() {
  const data = useMemo(() => generatePeople(10_000), []);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting, columnSizing },
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
  });

  return (
    <>
      <h1>Table Component API (TanStack-compatible)</h1>
      <p>
        Uses <code>useReactTable</code> + <code>flexRender</code> + structural components (
        <code>&lt;Table&gt;</code>, <code>&lt;Thead&gt;</code>, <code>&lt;Tbody&gt;</code>,
        <code>&lt;Tr&gt;</code>, <code>&lt;Th&gt;</code>, <code>&lt;Td&gt;</code>) — identical to
        TanStack Table's API pattern, but rendering on canvas.
      </p>

      <div style={{ marginBottom: 16 }}>
        <strong>Features demonstrated:</strong>
        <ul style={{ margin: "4px 0", paddingLeft: 20, fontSize: 14 }}>
          <li>
            <code>useReactTable()</code> — TanStack-compatible table instance
          </li>
          <li>
            <code>flexRender()</code> — resolve header/cell render functions
          </li>
          <li>
            <code>&lt;Table table=&#123;table&#125;&gt;</code> — instance-driven rendering
          </li>
          <li>
            <code>table.getHeaderGroups()</code> — declarative header iteration
          </li>
          <li>
            <code>row.getVisibleCells()</code> — cell-level access
          </li>
          <li>
            <code>onSortingChange: setSorting</code> — updater pattern (direct useState setter)
          </li>
          <li>
            <code>onColumnSizingChange: setColumnSizing</code> — column resize with updater
          </li>
          <li>Sorting and resize events do not conflict (resizeJustEnded guard)</li>
        </ul>
      </div>

      {sorting.length > 0 && (
        <p style={{ color: "#1976d2", fontSize: 14 }}>
          Sorted by: <strong>{sorting[0]!.id}</strong> ({sorting[0]!.desc ? "desc" : "asc"}){" · "}
          <button
            onClick={() => setSorting([])}
            style={{
              background: "none",
              border: "none",
              color: "#d32f2f",
              cursor: "pointer",
              textDecoration: "underline",
              fontSize: 14,
            }}
          >
            Clear
          </button>
        </p>
      )}

      {Object.keys(columnSizing).length > 0 && (
        <p style={{ color: "#7b1fa2", fontSize: 14 }}>
          Resized columns:{" "}
          {Object.entries(columnSizing)
            .map(([id, size]) => `${id}: ${size}px`)
            .join(", ")}
          {" · "}
          <button
            onClick={() => setColumnSizing({})}
            style={{
              background: "none",
              border: "none",
              color: "#d32f2f",
              cursor: "pointer",
              textDecoration: "underline",
              fontSize: 14,
            }}
          >
            Reset
          </button>
        </p>
      )}

      <Table table={table} width={960} height={500}>
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
          {table
            .getRowModel()
            .rows.slice(0, 5)
            .map((row) => (
              <Tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <Td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Td>
                ))}
              </Tr>
            ))}
        </Tbody>
      </Table>

      <details style={{ marginTop: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 14 }}>View Code</summary>
        <pre
          style={{
            background: "var(--demo-code-bg)",
          color: "var(--demo-code-fg)",
            padding: 12,
            borderRadius: 4,
            fontSize: 12,
            overflow: "auto",
            maxHeight: 400,
          }}
        >
          {codeExample}
        </pre>
      </details>
    </>
  );
}

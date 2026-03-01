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

const columns = [
  helper.accessor("name", { header: "Name", size: 180, enableSorting: true, padding: [0, 8] }),
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
    cell: (info) => (
      <Text
        value={`$${info.getValue().toLocaleString()}`}
        fontWeight="bold"
        color={info.getValue() > 85000 ? "#2e7d32" : "#333"}
      />
    ),
  }),
  helper.accessor("score", {
    header: "Score",
    size: 100,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
    cell: (info) => (
      <Badge
        value={String(info.getValue())}
        color="white"
        backgroundColor={
          info.getValue() >= 90 ? "#4caf50" : info.getValue() >= 75 ? "#ff9800" : "#9e9e9e"
        }
        borderRadius={4}
      />
    ),
  }),
];

export function TanStackCustomRenderer() {
  const data = useMemo(() => generateSmallData() as SmallRow[], []);
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  return (
    <>
      <h1>Custom Cell Renderer</h1>
      <p>
        Register custom <code>CellRenderer</code> instances via the <code>cellRenderers</code> prop.
        Built-in types (text, badge, stub, flex) can also be overridden.
      </p>
      <Table table={table} width={560} height={480}>
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
      <CodeSnippet>{`// column.cell with React canvas components (Badge, Text)
helper.accessor("dept", {
  cell: (info) => <Badge value={info.getValue()} color="#333" backgroundColor="#e0e0e0" borderRadius={4} />,
});
helper.accessor("salary", {
  cell: (info) => (
    <Text value={\`$\${info.getValue().toLocaleString()}\`} fontWeight="bold" color={info.getValue() > 85000 ? "#2e7d32" : "#333"} />
  ),
});

<Table table={table} width={560} height={480}>
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

import { useMemo } from "react";
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
} from "@ohah/react-wasm-table";
import { generateSmallData } from "../../data";
import { CodeSnippet } from "../../components/CodeSnippet";

type SmallRow = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<SmallRow>();

const columns = [
  helper.accessor("name", { header: "Name", size: 180, padding: [0, 8] }),
  helper.accessor("dept", { header: "Department", size: 140, padding: [0, 8] }),
  helper.accessor("salary", { header: "Salary", size: 120, align: "right", padding: [0, 8] }),
  helper.accessor("score", { header: "Score", size: 100, align: "right", padding: [0, 8] }),
];

export function TanStackSelection() {
  const data = useMemo(() => generateSmallData(), []);

  const table = useReactTable({
    data: data as SmallRow[],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <h1>TanStack API: Selection</h1>
      <p style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>
        useReactTable + Table only (no selection UI on this route).
      </p>
      <Table table={table} width={800} height={340}>
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
      <CodeSnippet>{`const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
});

<Table table={table} width={800} height={340}>
  <Thead>...</Thead>
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

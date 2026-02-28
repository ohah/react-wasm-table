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
  type SortingState,
  type NormalizedRange,
} from "@ohah/react-wasm-table";
import { generateSmallData } from "../../data";
import { CodeSnippet } from "../../components/CodeSnippet";

type SmallRow = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<SmallRow>();

const columns = [
  helper.accessor("name", { header: "Name", size: 180, enableSorting: true, padding: [0, 8] }),
  helper.accessor("dept", { header: "Department", size: 140, padding: [0, 8] }),
  helper.accessor("salary", { header: "Salary", size: 120, align: "right", padding: [0, 8] }),
  helper.accessor("score", { header: "Score", size: 100, align: "right", padding: [0, 8] }),
];

interface LogEntry {
  id: number;
  time: string;
  event: string;
  detail: string;
}

export function TanStackEventCallbacks() {
  const data = useMemo(() => generateSmallData() as SmallRow[], []);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selection, setSelection] = useState<NormalizedRange | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const nextId = useRef(0);

  const logEvent = useCallback((event: string, detail: string) => {
    const now = new Date();
    const time = `${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}.${now.getMilliseconds().toString().padStart(3, "0")}`;
    setLog((prev) => [{ id: nextId.current++, time, event, detail }, ...prev].slice(0, 50));
  }, []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  return (
    <>
      <h1>TanStack API: Event Callbacks</h1>
      <p style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>
        useReactTable + Table. onCellClick, onHeaderClick, onBeforeSortChange,
        onBeforeSelectionChange, selection.
      </p>
      <div style={{ display: "flex", gap: 16 }}>
        <Table
          table={table}
          width={560}
          height={380}
          selection={selection}
          onSelectionChange={setSelection}
          onCellClick={(e) => logEvent("onCellClick", `row ${e.cell.row} col ${e.cell.col}`)}
          onHeaderClick={(e) => logEvent("onHeaderClick", `col ${e.colIndex}`)}
          onBeforeSortChange={(next) => {
            logEvent("onBeforeSortChange", JSON.stringify(next));
            return true;
          }}
          onBeforeSelectionChange={(next) => {
            logEvent("onBeforeSelectionChange", next ? JSON.stringify(next) : "null");
            return true;
          }}
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
        <div
          style={{
            flex: 1,
            maxHeight: 380,
            overflowY: "auto",
            background: "#1e1e1e",
            color: "#d4d4d4",
            padding: 8,
            fontSize: 12,
            fontFamily: "monospace",
          }}
        >
          {log.map((e) => (
            <div key={e.id}>
              {e.time} {e.event}: {e.detail}
            </div>
          ))}
        </div>
      </div>
      <CodeSnippet>{`<Table
  table={table}
  selection={selection}
  onSelectionChange={setSelection}
  onCellClick={(e) => logEvent("onCellClick", \`row \${e.cell.row} col \${e.cell.col}\`)}
  onHeaderClick={(e) => logEvent("onHeaderClick", \`col \${e.colIndex}\`)}
  onBeforeSortChange={(next) => { logEvent("onBeforeSortChange", JSON.stringify(next)); return true; }}
  onBeforeSelectionChange={(next) => { logEvent("onBeforeSelectionChange", next ? JSON.stringify(next) : "null"); return true; }}
>
  <Thead>...</Thead>
  <Tbody>...</Tbody>
</Table>`}</CodeSnippet>
    </>
  );
}

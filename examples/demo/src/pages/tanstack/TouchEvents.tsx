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
  type GridTouchEvent,
  type SortingState,
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
  type: string;
  detail: string;
  blocked: boolean;
}

export function TanStackTouchEvents() {
  const data = useMemo(() => generateSmallData() as SmallRow[], []);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const nextId = useRef(0);

  const [blockTouchStart, setBlockTouchStart] = useState(false);
  const [blockTouchMove, setBlockTouchMove] = useState(false);
  const [blockTouchEnd, setBlockTouchEnd] = useState(false);

  const addLog = useCallback((type: string, detail: string, blocked: boolean) => {
    setLog((prev) => [{ id: nextId.current++, type, detail, blocked }, ...prev].slice(0, 60));
  }, []);

  const onTouchStart = useCallback(
    (event: GridTouchEvent) => {
      const ht = event.hitTest;
      const htDesc =
        ht.type === "cell"
          ? `cell(${ht.cell!.row},${ht.cell!.col})`
          : ht.type === "header"
            ? `header(${ht.colIndex})`
            : ht.type;
      addLog("onTouchStart", `${htDesc} touches=${event.touchCount}`, blockTouchStart);
      if (blockTouchStart) event.preventDefault();
    },
    [blockTouchStart, addLog],
  );

  const onTouchMove = useCallback(
    (event: GridTouchEvent) => {
      addLog("onTouchMove", `touches=${event.touchCount}`, blockTouchMove);
      if (blockTouchMove) event.preventDefault();
    },
    [blockTouchMove, addLog],
  );

  const onTouchEnd = useCallback(
    (event: GridTouchEvent) => {
      addLog("onTouchEnd", `touches=${event.touchCount}`, blockTouchEnd);
      if (blockTouchEnd) event.preventDefault();
    },
    [blockTouchEnd, addLog],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  return (
    <>
      <h1>TanStack API: Touch Events</h1>
      <p style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>
        useReactTable + Table. onTouchStart, onTouchMove, onTouchEnd. Toggle block to
        preventDefault.
      </p>
      <div style={{ marginBottom: 12, display: "flex", gap: 16 }}>
        <label>
          <input
            type="checkbox"
            checked={blockTouchStart}
            onChange={(e) => setBlockTouchStart(e.target.checked)}
          />{" "}
          Block TouchStart
        </label>
        <label>
          <input
            type="checkbox"
            checked={blockTouchMove}
            onChange={(e) => setBlockTouchMove(e.target.checked)}
          />{" "}
          Block TouchMove
        </label>
        <label>
          <input
            type="checkbox"
            checked={blockTouchEnd}
            onChange={(e) => setBlockTouchEnd(e.target.checked)}
          />{" "}
          Block TouchEnd
        </label>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <Table
          table={table}
          width={560}
          height={340}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
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
            maxHeight: 340,
            overflowY: "auto",
            background: "#1e1e1e",
            color: "#d4d4d4",
            padding: 8,
            fontSize: 12,
            fontFamily: "monospace",
          }}
        >
          {log.map((e) => (
            <div key={e.id} style={{ color: e.blocked ? "#f44336" : undefined }}>
              [{e.type}] {e.detail}
            </div>
          ))}
        </div>
      </div>
      <CodeSnippet>{`const onTouchStart = useCallback((event: GridTouchEvent) => {
  const ht = event.hitTest;
  const htDesc = ht.type === "cell" ? \`cell(\${ht.cell!.row},\${ht.cell!.col})\` : ht.type === "header" ? \`header(\${ht.colIndex})\` : ht.type;
  addLog("onTouchStart", htDesc + " touches=" + event.touchCount, blockTouchStart);
  if (blockTouchStart) event.preventDefault();
}, [blockTouchStart, addLog]);

<Table
  table={table}
  onTouchStart={onTouchStart}
  onTouchMove={onTouchMove}
  onTouchEnd={onTouchEnd}
/>`}</CodeSnippet>
    </>
  );
}

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
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
  EventManager,
  SelectionManager,
  EditorManager,
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

export function TanStackAdapterDI() {
  const data = useMemo(() => generateSmallData() as SmallRow[], []);
  const [useDI, setUseDI] = useState(true);
  const [selectionInfo, setSelectionInfo] = useState("none");

  const [eventManager] = useState(() => new EventManager());
  const [selectionManager] = useState(() => new SelectionManager());
  const [editorManager] = useState(() => new EditorManager());

  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);
  useEffect(() => {
    if (!useDI) {
      setSelectionInfo("none (DI disabled)");
      return;
    }
    pollRef.current = setInterval(() => {
      const norm = selectionManager.getNormalized();
      setSelectionInfo(
        norm ? `row ${norm.minRow}-${norm.maxRow}, col ${norm.minCol}-${norm.maxCol}` : "none",
      );
    }, 100);
    return () => clearInterval(pollRef.current);
  }, [useDI, selectionManager]);

  const clearSelection = useCallback(() => {
    selectionManager.clear();
    setSelectionInfo("none");
  }, [selectionManager]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <h1>Adapter DI (Step 0-5)</h1>
      <p>
        Inject external <code>EventManager</code>, <code>SelectionManager</code>, and{" "}
        <code>EditorManager</code> instances via props. Useful for sharing state between multiple
        grids, testing, or building custom integrations.
      </p>
      <div style={{ display: "flex", gap: 16, marginBottom: 12, alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={useDI} onChange={(e) => setUseDI(e.target.checked)} />
          Enable Adapter DI
        </label>
        {useDI && (
          <button
            onClick={clearSelection}
            style={{
              padding: "4px 12px",
              border: "1px solid #ccc",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Clear Selection (external)
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <Table
          table={table}
          width={560}
          height={360}
          eventManager={useDI ? eventManager : undefined}
          selectionManager={useDI ? selectionManager : undefined}
          editorManager={useDI ? editorManager : undefined}
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
            padding: 12,
            background: "#f9f9f9",
            borderRadius: 4,
            fontSize: 13,
            minWidth: 220,
          }}
        >
          <strong>Selection (from manager):</strong> {selectionInfo}
        </div>
      </div>
      <CodeSnippet>{`const [eventManager] = useState(() => new EventManager());
const [selectionManager] = useState(() => new SelectionManager());
const [editorManager] = useState(() => new EditorManager());

<Table
  table={table}
  width={560}
  height={340}
  eventManager={useDI ? eventManager : undefined}
  selectionManager={useDI ? selectionManager : undefined}
  editorManager={useDI ? editorManager : undefined}
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

// Clear selection from outside: selectionManager.clear()`}</CodeSnippet>
    </>
  );
}

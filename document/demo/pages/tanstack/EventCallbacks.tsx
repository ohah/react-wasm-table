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

type SmallRow = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<SmallRow>();

interface LogEntry {
  id: number;
  type: string;
  detail: string;
  blocked: boolean;
}

const MAX_LOG = 80;

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

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function TanStackEventCallbacks() {
  const data = useMemo(() => generateSmallData(), []);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selection, setSelection] = useState<NormalizedRange | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const nextId = useRef(0);

  const [blockCellClick, setBlockCellClick] = useState(false);
  const [blockDblClick, setBlockDblClick] = useState(false);
  const [blockHeaderClick, setBlockHeaderClick] = useState(false);
  const [blockKeyDown, setBlockKeyDown] = useState(false);
  const [blockSort, setBlockSort] = useState(false);
  const [blockSelection, setBlockSelection] = useState(false);
  const [blockMouseDown, setBlockMouseDown] = useState(false);
  const [blockScroll, setBlockScroll] = useState(false);

  const lastMoveLog = useRef(0);
  const lastScrollLog = useRef(0);

  const addLog = useCallback((type: string, detail: string, blocked: boolean) => {
    setLog((prev) => {
      const entry: LogEntry = { id: nextId.current++, type, detail, blocked };
      const next = [entry, ...prev];
      return next.length > MAX_LOG ? next.slice(0, MAX_LOG) : next;
    });
  }, []);

  const table = useReactTable({
    data: data as SmallRow[],
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  return (
    <>
      <h1>Event Callbacks</h1>
      <p>
        All event callbacks receive enriched events with native DOM event, content/viewport
        coordinates, and modifier keys. Call <code>event.preventDefault()</code> to cancel default
        behavior.
      </p>

      <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
        <Toggle label="Block onCellClick" checked={blockCellClick} onChange={setBlockCellClick} />
        <Toggle
          label="Block onCellDoubleClick"
          checked={blockDblClick}
          onChange={setBlockDblClick}
        />
        <Toggle
          label="Block onHeaderClick"
          checked={blockHeaderClick}
          onChange={setBlockHeaderClick}
        />
        <Toggle label="Block onKeyDown" checked={blockKeyDown} onChange={setBlockKeyDown} />
        <Toggle
          label="Block onCellMouseDown"
          checked={blockMouseDown}
          onChange={setBlockMouseDown}
        />
        <Toggle label="Block onScroll" checked={blockScroll} onChange={setBlockScroll} />
        <Toggle label="Block onBeforeSortChange" checked={blockSort} onChange={setBlockSort} />
        <Toggle
          label="Block onBeforeSelectionChange"
          checked={blockSelection}
          onChange={setBlockSelection}
        />
      </div>

      <pre
        style={{
          background: "var(--demo-code-bg)",
          color: "var(--demo-code-fg)",
          padding: 12,
          borderRadius: 4,
          fontSize: 12,
          overflowX: "auto",
        }}
      >
        {`<Table\n`}
        {`  onCellClick={(e) => { ${blockCellClick ? "e.preventDefault();" : "/* observe */"} }}\n`}
        {`  onCellDoubleClick={(e) => { ${blockDblClick ? "e.preventDefault();" : "/* observe */"} }}\n`}
        {`  onHeaderClick={(e) => { ${blockHeaderClick ? "e.preventDefault();" : "/* observe */"} }}\n`}
        {`  onKeyDown={(e) => { ${blockKeyDown ? "e.preventDefault();" : "/* observe */"} }}\n`}
        {`  onCellMouseDown={(e) => { ${blockMouseDown ? "e.preventDefault();" : "/* observe */"} }}\n`}
        {`  onCellMouseMove={(e) => { /* viewport coords */ }}\n`}
        {`  onCellMouseUp={() => { /* drag end */ }}\n`}
        {`  onScroll={(e) => { ${blockScroll ? "e.preventDefault();" : "/* deltaY, deltaX */"} }}\n`}
        {`  onCanvasEvent={(e) => { /* low-level: e.type, e.hitTest */ }}\n`}
        {`  onBeforeSortChange={(next) => { ${blockSort ? "return false;" : "/* observe */"} }}\n`}
        {`  onBeforeSelectionChange={(next) => { ${blockSelection ? "return false;" : "/* observe */"} }}\n`}
        {`/>`}
      </pre>

      <div style={{ display: "flex", gap: 16 }}>
        <div>
          <section style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, marginBottom: 6 }}>TanStack API</h4>
            <Table
              table={table}
              width={560}
              height={340}
              sorting={sorting}
              onSortingChange={setSorting}
              selection={selection}
              onSelectionChange={setSelection}
              onCellClick={(e) => {
                addLog("onCellClick", `row=${e.cell.row}, col=${e.cell.col}`, blockCellClick);
                if (blockCellClick) e.preventDefault();
              }}
              onCellDoubleClick={(e) => {
                addLog("onCellDoubleClick", `row=${e.cell.row}, col=${e.cell.col}`, blockDblClick);
                if (blockDblClick) e.preventDefault();
              }}
              onHeaderClick={(e) => {
                addLog("onHeaderClick", `colIndex=${e.colIndex}`, blockHeaderClick);
                if (blockHeaderClick) e.preventDefault();
              }}
              onKeyDown={(e) => {
                addLog("onKeyDown", `key=${e.key}`, blockKeyDown);
                if (blockKeyDown) e.preventDefault();
              }}
              onCellMouseDown={(e) => {
                addLog(
                  "onCellMouseDown",
                  `row=${e.cell.row}, col=${e.cell.col} shift=${e.shiftKey}`,
                  blockMouseDown,
                );
                if (blockMouseDown) e.preventDefault();
              }}
              onCellMouseMove={(e) => {
                const now = Date.now();
                if (now - lastMoveLog.current < 100) return;
                lastMoveLog.current = now;
                addLog(
                  "onCellMouseMove",
                  `row=${e.cell.row}, col=${e.cell.col} viewport=(${e.viewportX.toFixed(0)},${e.viewportY.toFixed(0)})`,
                  false,
                );
              }}
              onCellMouseUp={() => addLog("onCellMouseUp", "", false)}
              onScroll={(e) => {
                const now = Date.now();
                if (now - lastScrollLog.current < 200) return;
                lastScrollLog.current = now;
                addLog(
                  "onScroll",
                  `deltaY=${e.deltaY.toFixed(0)}, deltaX=${e.deltaX.toFixed(0)} native=${e.nativeEvent ? "WheelEvent" : "null(touch)"}`,
                  blockScroll,
                );
                if (blockScroll) e.preventDefault();
              }}
              onCanvasEvent={(e) => {
                if (e.type === "mousemove" || e.type === "mouseup") return;
                const ht = e.hitTest;
                const htDesc =
                  ht.type === "cell"
                    ? `cell(${ht.cell!.row},${ht.cell!.col})`
                    : ht.type === "header"
                      ? `header(${ht.colIndex})`
                      : ht.type === "resize-handle"
                        ? `resize(${ht.colIndex})`
                        : "empty";
                addLog("onCanvasEvent", `${e.type} ${htDesc}`, false);
              }}
              onBeforeSortChange={(next) => {
                const desc =
                  next.length > 0 ? `${next[0]!.id} ${next[0]!.desc ? "desc" : "asc"}` : "clear";
                addLog("onBeforeSortChange", desc, blockSort);
                if (blockSort) return false;
              }}
              onBeforeSelectionChange={(next) => {
                const desc = next
                  ? `row ${next.minRow}-${next.maxRow}, col ${next.minCol}-${next.maxCol}`
                  : "null (clear)";
                addLog("onBeforeSelectionChange", desc, blockSelection);
                if (blockSelection) return false;
              }}
            >
              <Thead>
                {table.getHeaderGroups().map((hg) => (
                  <Tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <Th key={h.id} colSpan={h.colSpan}>
                        {h.isPlaceholder
                          ? null
                          : flexRender(h.column.columnDef.header, h.getContext())}
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
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Td>
                    ))}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </section>
        </div>

        <div
          style={{
            flex: 1,
            maxHeight: 340,
            overflowY: "auto",
            background: "var(--demo-code-block-bg)",
            color: "var(--demo-code-block-fg)",
            borderRadius: 4,
            padding: 8,
            fontSize: 12,
            fontFamily: "monospace",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 4,
              color: "var(--demo-muted-4)",
            }}
          >
            <span>Event Log</span>
            <button
              onClick={() => setLog([])}
              style={{
                background: "none",
                border: "1px solid var(--demo-border-2)",
                color: "#aaa",
                borderRadius: 3,
                padding: "1px 6px",
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              Clear
            </button>
          </div>
          {log.length === 0 && (
            <div style={{ color: "var(--demo-muted)" }}>Click cells or headers...</div>
          )}
          {log.map((entry) => (
            <div key={entry.id} style={{ marginBottom: 2 }}>
              <span style={{ color: entry.blocked ? "#f44" : "#4ec9b0" }}>
                {entry.blocked ? "BLOCKED" : "PASS"}
              </span>{" "}
              <span
                style={{
                  color: entry.type === "onCanvasEvent" ? "#c586c0" : "#dcdcaa",
                }}
              >
                {entry.type}
              </span>{" "}
              <span style={{ color: "#9cdcfe" }}>{entry.detail}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          display: "flex",
          gap: 24,
          fontSize: 13,
          color: "var(--demo-muted-2)",
        }}
      >
        <div>
          <strong>Sorting:</strong>{" "}
          {sorting.length > 0 ? `${sorting[0]!.id} (${sorting[0]!.desc ? "desc" : "asc"})` : "none"}
        </div>
        <div>
          <strong>Selection:</strong>{" "}
          {selection
            ? `row ${selection.minRow}-${selection.maxRow}, col ${selection.minCol}-${selection.maxCol}`
            : "none"}
        </div>
      </div>
    </>
  );
}

import { useState, useMemo, useCallback, useRef } from "react";
import {
  Grid,
  createColumnHelper,
  type SortingState,
  type NormalizedRange,
  type GridCellEvent,
  type GridHeaderEvent,
  type GridKeyboardEvent,
} from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

type SmallRow = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<SmallRow>();

interface LogEntry {
  id: number;
  type: string;
  detail: string;
  blocked: boolean;
}

const MAX_LOG = 50;

export function EventCallbacks() {
  const data = useMemo(() => generateSmallData(), []);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selection, setSelection] = useState<NormalizedRange | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const nextId = useRef(0);

  // Toggle states for blocking
  const [blockCellClick, setBlockCellClick] = useState(false);
  const [blockDblClick, setBlockDblClick] = useState(false);
  const [blockHeaderClick, setBlockHeaderClick] = useState(false);
  const [blockKeyDown, setBlockKeyDown] = useState(false);
  const [blockSort, setBlockSort] = useState(false);
  const [blockSelection, setBlockSelection] = useState(false);

  const addLog = useCallback((type: string, detail: string, blocked: boolean) => {
    setLog((prev) => {
      const entry: LogEntry = { id: nextId.current++, type, detail, blocked };
      const next = [entry, ...prev];
      return next.length > MAX_LOG ? next.slice(0, MAX_LOG) : next;
    });
  }, []);

  const columns = useMemo(
    () => [
      helper.accessor("name", {
        header: "Name",
        size: 180,
        enableSorting: true,
        padding: [0, 8],
      }),
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
    ],
    [],
  );

  const onCellClick = useCallback(
    (event: GridCellEvent) => {
      addLog("onCellClick", `row=${event.cell.row}, col=${event.cell.col}`, blockCellClick);
      if (blockCellClick) event.preventDefault();
    },
    [blockCellClick, addLog],
  );

  const onCellDoubleClick = useCallback(
    (event: GridCellEvent) => {
      addLog("onCellDoubleClick", `row=${event.cell.row}, col=${event.cell.col}`, blockDblClick);
      if (blockDblClick) event.preventDefault();
    },
    [blockDblClick, addLog],
  );

  const onHeaderClick = useCallback(
    (event: GridHeaderEvent) => {
      addLog("onHeaderClick", `colIndex=${event.colIndex}`, blockHeaderClick);
      if (blockHeaderClick) event.preventDefault();
    },
    [blockHeaderClick, addLog],
  );

  const onKeyDown = useCallback(
    (event: GridKeyboardEvent) => {
      addLog("onKeyDown", `key=${event.key}`, blockKeyDown);
      if (blockKeyDown) event.preventDefault();
    },
    [blockKeyDown, addLog],
  );

  const onBeforeSortChange = useCallback(
    (next: SortingState) => {
      const desc = next.length > 0 ? `${next[0]!.id} ${next[0]!.desc ? "desc" : "asc"}` : "clear";
      addLog("onBeforeSortChange", desc, blockSort);
      if (blockSort) return false;
    },
    [blockSort, addLog],
  );

  const onBeforeSelectionChange = useCallback(
    (next: NormalizedRange | null) => {
      const desc = next
        ? `row ${next.minRow}-${next.maxRow}, col ${next.minCol}-${next.maxCol}`
        : "null (clear)";
      addLog("onBeforeSelectionChange", desc, blockSelection);
      if (blockSelection) return false;
    },
    [blockSelection, addLog],
  );

  return (
    <>
      <h1>Event Callbacks</h1>
      <p>
        All event callbacks receive enriched events. Call <code>event.preventDefault()</code> to
        cancel default behavior.
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
        <Toggle label="Block onBeforeSortChange" checked={blockSort} onChange={setBlockSort} />
        <Toggle
          label="Block onBeforeSelectionChange"
          checked={blockSelection}
          onChange={setBlockSelection}
        />
      </div>

      <pre
        style={{
          background: "#f5f5f5",
          padding: 12,
          borderRadius: 4,
          fontSize: 12,
          overflowX: "auto",
        }}
      >
        {`<Grid\n`}
        {`  onCellClick={(e) => { ${blockCellClick ? "e.preventDefault();" : "/* observe */"} }}\n`}
        {`  onHeaderClick={(e) => { ${blockHeaderClick ? "e.preventDefault();" : "/* observe */"} }}\n`}
        {`  onBeforeSortChange={(next) => { ${blockSort ? "return false;" : "/* observe */"} }}\n`}
        {`  onBeforeSelectionChange={(next) => { ${blockSelection ? "return false;" : "/* observe */"} }}\n`}
        {`/>`}
      </pre>

      <div style={{ display: "flex", gap: 16 }}>
        <div>
          <Grid
            data={data}
            width={560}
            height={340}
            columns={columns}
            sorting={sorting}
            onSortingChange={setSorting}
            selection={selection}
            onSelectionChange={setSelection}
            onCellClick={onCellClick}
            onCellDoubleClick={onCellDoubleClick}
            onHeaderClick={onHeaderClick}
            onKeyDown={onKeyDown}
            onBeforeSortChange={onBeforeSortChange}
            onBeforeSelectionChange={onBeforeSelectionChange}
          />
        </div>

        <div
          style={{
            flex: 1,
            maxHeight: 340,
            overflowY: "auto",
            background: "#1e1e1e",
            color: "#d4d4d4",
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
              color: "#888",
            }}
          >
            <span>Event Log</span>
            <button
              onClick={() => setLog([])}
              style={{
                background: "none",
                border: "1px solid #555",
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
          {log.length === 0 && <div style={{ color: "#666" }}>Click cells or headers...</div>}
          {log.map((entry) => (
            <div key={entry.id} style={{ marginBottom: 2 }}>
              <span style={{ color: entry.blocked ? "#f44" : "#4ec9b0" }}>
                {entry.blocked ? "BLOCKED" : "PASS"}
              </span>{" "}
              <span style={{ color: "#dcdcaa" }}>{entry.type}</span>{" "}
              <span style={{ color: "#9cdcfe" }}>{entry.detail}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 24, fontSize: 13, color: "#555" }}>
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

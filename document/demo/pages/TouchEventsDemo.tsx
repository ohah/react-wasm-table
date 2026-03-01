import { useState, useMemo, useCallback, useRef } from "react";
import {
  Grid,
  createColumnHelper,
  type GridTouchEvent,
  type GridCellEvent,
  type GridHeaderEvent,
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

const MAX_LOG = 80;

export function TouchEventsDemo() {
  const data = useMemo(() => generateSmallData(), []);
  const [log, setLog] = useState<LogEntry[]>([]);
  const nextId = useRef(0);

  const [blockTouchStart, setBlockTouchStart] = useState(false);
  const [blockTouchMove, setBlockTouchMove] = useState(false);
  const [blockTouchEnd, setBlockTouchEnd] = useState(false);

  const addLog = useCallback((type: string, detail: string, blocked: boolean) => {
    setLog((prev) => {
      const entry: LogEntry = { id: nextId.current++, type, detail, blocked };
      const next = [entry, ...prev];
      return next.length > MAX_LOG ? next.slice(0, MAX_LOG) : next;
    });
  }, []);

  const columns = useMemo(
    () => [
      helper.accessor("name", { header: "Name", size: 180, enableSorting: true, padding: [0, 8] }),
      helper.accessor("dept", { header: "Department", size: 140, padding: [0, 8] }),
      helper.accessor("salary", {
        header: "Salary",
        size: 120,
        align: "right",
        padding: [0, 8],
      }),
      helper.accessor("score", {
        header: "Score",
        size: 100,
        align: "right",
        padding: [0, 8],
      }),
    ],
    [],
  );

  const onTouchStart = useCallback(
    (event: GridTouchEvent) => {
      const ht = event.hitTest;
      const htDesc =
        ht.type === "cell"
          ? `cell(${ht.cell!.row},${ht.cell!.col})`
          : ht.type === "header"
            ? `header(${ht.colIndex})`
            : ht.type;
      addLog(
        "onTouchStart",
        `${htDesc} viewport=(${event.touch.viewportX.toFixed(0)},${event.touch.viewportY.toFixed(0)}) touches=${event.touchCount}`,
        blockTouchStart,
      );
      if (blockTouchStart) event.preventDefault();
    },
    [blockTouchStart, addLog],
  );

  const onTouchMove = useCallback(
    (event: GridTouchEvent) => {
      const ht = event.hitTest;
      const htDesc =
        ht.type === "cell"
          ? `cell(${ht.cell!.row},${ht.cell!.col})`
          : ht.type === "header"
            ? `header(${ht.colIndex})`
            : ht.type;
      addLog(
        "onTouchMove",
        `${htDesc} content=(${event.touch.contentX.toFixed(0)},${event.touch.contentY.toFixed(0)})`,
        blockTouchMove,
      );
      if (blockTouchMove) event.preventDefault();
    },
    [blockTouchMove, addLog],
  );

  const onTouchEnd = useCallback(
    (event: GridTouchEvent) => {
      const ht = event.hitTest;
      const htDesc =
        ht.type === "cell"
          ? `cell(${ht.cell!.row},${ht.cell!.col})`
          : ht.type === "header"
            ? `header(${ht.colIndex})`
            : ht.type;
      addLog("onTouchEnd", `${htDesc} touches=${event.touchCount}`, blockTouchEnd);
      if (blockTouchEnd) event.preventDefault();
    },
    [blockTouchEnd, addLog],
  );

  const onCellClick = useCallback(
    (event: GridCellEvent) => {
      addLog("onCellClick", `row=${event.cell.row}, col=${event.cell.col}`, false);
    },
    [addLog],
  );

  const onHeaderClick = useCallback(
    (event: GridHeaderEvent) => {
      addLog("onHeaderClick", `colIndex=${event.colIndex}`, false);
    },
    [addLog],
  );

  return (
    <>
      <h1>Touch Events</h1>
      <p>
        Touch events (<code>onTouchStart</code>, <code>onTouchMove</code>, <code>onTouchEnd</code>)
        expose the native <code>TouchEvent</code>, content/viewport coordinates, and hit-test
        results. Call <code>event.preventDefault()</code> to cancel internal touch handling (scroll,
        tap-to-click, selection drag).
      </p>
      <p style={{ fontSize: 13, color: "var(--demo-muted-4)" }}>
        Use Chrome DevTools device emulation or a real touch device to test. Mouse events are shown
        too (tap triggers onCellClick).
      </p>

      <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
        <Toggle
          label="Block onTouchStart"
          checked={blockTouchStart}
          onChange={setBlockTouchStart}
        />
        <Toggle label="Block onTouchMove" checked={blockTouchMove} onChange={setBlockTouchMove} />
        <Toggle label="Block onTouchEnd" checked={blockTouchEnd} onChange={setBlockTouchEnd} />
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
        {`<Grid\n`}
        {`  onTouchStart={(e) => {\n`}
        {`    console.log(e.hitTest, e.touch, e.touchCount);\n`}
        {`    ${blockTouchStart ? "e.preventDefault(); // blocks scroll + tap" : "// observe"}\n`}
        {`  }}\n`}
        {`  onTouchMove={(e) => { ${blockTouchMove ? "e.preventDefault();" : "/* observe */"} }}\n`}
        {`  onTouchEnd={(e) => { ${blockTouchEnd ? "e.preventDefault();" : "/* observe */"} }}\n`}
        {`/>`}
      </pre>

      <div style={{ display: "flex", gap: 16 }}>
        <div>
          <section style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, marginBottom: 6 }}>Grid API</h4>
            <Grid
              data={data}
              width={560}
              height={340}
              columns={columns}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onCellClick={onCellClick}
              onHeaderClick={onHeaderClick}
            />
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
            <span>Touch Event Log</span>
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
          {log.length === 0 && <div style={{ color: "var(--demo-muted)" }}>Touch the grid...</div>}
          {log.map((entry) => (
            <div key={entry.id} style={{ marginBottom: 2 }}>
              <span style={{ color: entry.blocked ? "#f44" : "#4ec9b0" }}>
                {entry.blocked ? "BLOCKED" : "PASS"}
              </span>{" "}
              <span
                style={{
                  color: entry.type.startsWith("onTouch") ? "#c586c0" : "#dcdcaa",
                }}
              >
                {entry.type}
              </span>{" "}
              <span style={{ color: "#9cdcfe" }}>{entry.detail}</span>
            </div>
          ))}
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

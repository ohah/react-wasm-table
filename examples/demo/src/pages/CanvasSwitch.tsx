import { useState, useMemo, useCallback } from "react";
import { Grid, createColumnHelper, Switch, type GridCellEvent } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

type Row = { name: string; dept: string; salary: number; score: number; active: boolean };
const helper = createColumnHelper<Row>();

const btnBase: React.CSSProperties = {
  padding: "4px 12px",
  border: "1px solid #ccc",
  borderRadius: 4,
  background: "#fff",
  cursor: "pointer",
  fontSize: 13,
};
const btnActive: React.CSSProperties = {
  ...btnBase,
  background: "#1976d2",
  color: "#fff",
  border: "1px solid #1976d2",
};

interface LogEntry {
  id: number;
  event: string;
  value: string;
  cell: string;
}
let logId = 0;

type TimingFn = "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out";

export function CanvasSwitch() {
  const [data, setData] = useState(() =>
    (generateSmallData() as Omit<Row, "active">[]).map((r) => ({
      ...r,
      active: r.score > 50,
    })),
  );
  const [disabled, setDisabled] = useState(false);
  const [activeColor, setActiveColor] = useState("#3b82f6");
  const [transitionDuration, setTransitionDuration] = useState(150);
  const [timingFunction, setTimingFunction] = useState<TimingFn>("ease");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((event: string, value: string, e: GridCellEvent) => {
    setLogs((prev) => [
      { id: ++logId, event, value, cell: `(${e.cell.row},${e.cell.col})` },
      ...prev.slice(0, 19),
    ]);
  }, []);

  const columns = useMemo(
    () => [
      helper.accessor("name", { header: "Name", size: 140, padding: [0, 8] }),
      helper.display({
        id: "toggle",
        header: "Active",
        size: 120,
        cell: (info) => {
          const checked = info.row.original.active;
          return (
            <Switch
              checked={checked}
              disabled={disabled}
              activeTrackColor={activeColor}
              transitionDuration={transitionDuration}
              transitionTimingFunction={timingFunction}
              onClick={(e) => {
                e.preventDefault();
                addLog("onClick", String(!checked), e);
                const rowIndex = info.row.index;
                setData((prev) =>
                  prev.map((r, i) => (i === rowIndex ? { ...r, active: !r.active } : r)),
                );
              }}
              onMouseEnter={(e) => addLog("onMouseEnter", String(checked), e)}
              onMouseLeave={(e) => addLog("onMouseLeave", String(checked), e)}
            />
          );
        },
      }),
    ],
    [disabled, activeColor, transitionDuration, timingFunction, addLog],
  );

  return (
    <>
      <h1>Canvas: Switch</h1>
      <p>
        <code>Switch</code> draws a toggle switch (pill track + circle thumb) with smooth animation.
        Click a switch to toggle it. Supports <code>checked</code>, <code>disabled</code>,{" "}
        <code>activeTrackColor</code>, <code>transitionDuration</code>,{" "}
        <code>transitionTimingFunction</code>.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
        <div>
          <strong>disabled:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {[false, true].map((v) => (
              <button
                key={String(v)}
                style={disabled === v ? btnActive : btnBase}
                onClick={() => setDisabled(v)}
              >
                {String(v)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <strong>activeTrackColor:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {["#3b82f6", "#10b981", "#f59e0b", "#ef4444"].map((c) => (
              <button
                key={c}
                style={activeColor === c ? btnActive : btnBase}
                onClick={() => setActiveColor(c)}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    background: c,
                    verticalAlign: "middle",
                  }}
                />
              </button>
            ))}
          </div>
        </div>
        <div>
          <strong>transitionDuration:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
            {[0, 150, 300].map((ms) => (
              <button
                key={ms}
                style={transitionDuration === ms ? btnActive : btnBase}
                onClick={() => setTransitionDuration(ms)}
              >
                {ms}ms
              </button>
            ))}
          </div>
        </div>
        <div>
          <strong>timingFunction:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {(["linear", "ease", "ease-in", "ease-out", "ease-in-out"] as TimingFn[]).map((fn) => (
              <button
                key={fn}
                style={timingFunction === fn ? btnActive : btnBase}
                onClick={() => setTimingFunction(fn)}
              >
                {fn}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Grid API</h2>
          <Grid data={data} columns={columns} width={280} height={460} rowHeight={40} />
        </section>

        <section style={{ minWidth: 260, maxWidth: 360 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>
            Event Log{" "}
            <button
              onClick={() => setLogs([])}
              style={{ ...btnBase, fontSize: 12, padding: "2px 8px", marginLeft: 8 }}
            >
              Clear
            </button>
          </h2>
          <p style={{ fontSize: 13, color: "#666", margin: "0 0 8px" }}>
            Click or hover over Switch cells to see events.
          </p>
          <div
            style={{
              height: 400,
              overflow: "auto",
              border: "1px solid #e0e0e0",
              borderRadius: 6,
              fontSize: 12,
              fontFamily: "monospace",
              background: "#fafafa",
            }}
          >
            {logs.length === 0 && (
              <div style={{ padding: 16, color: "#999", textAlign: "center" }}>No events yet</div>
            )}
            {logs.map((log) => (
              <div
                key={log.id}
                style={{
                  padding: "4px 10px",
                  borderBottom: "1px solid #f0f0f0",
                  display: "flex",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    color: log.event.includes("Enter")
                      ? "#2e7d32"
                      : log.event.includes("Leave")
                        ? "#c62828"
                        : "#1565c0",
                    fontWeight: 600,
                    minWidth: 100,
                  }}
                >
                  {log.event}
                </span>
                <span style={{ color: "#333" }}>{log.value}</span>
                <span style={{ color: "#999" }}>{log.cell}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

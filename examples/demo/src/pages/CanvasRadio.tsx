import { useState, useMemo, useCallback } from "react";
import { Grid, createColumnHelper, Radio, Label, type GridCellEvent } from "@ohah/react-wasm-table";

type Row = { id: number; name: string; plan: string };
const helper = createColumnHelper<Row>();

const PLANS = ["Free", "Basic", "Pro", "Enterprise"];

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

const USERS = [
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
  "Kate",
  "Leo",
  "Mia",
  "Nick",
  "Olivia",
  "Paul",
  "Quinn",
  "Rose",
  "Sam",
  "Tina",
  "Uma",
  "Victor",
  "Wendy",
  "Xander",
  "Yuki",
];

function generateData(): Row[] {
  return USERS.map((name, i) => ({
    id: i,
    name,
    plan: PLANS[i % PLANS.length]!,
  }));
}

export function CanvasRadio() {
  const [data, setData] = useState(generateData);
  const [disabled, setDisabled] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((event: string, value: string, e: GridCellEvent) => {
    setLogs((prev) => [
      { id: ++logId, event, value, cell: `(${e.cell.row},${e.cell.col})` },
      ...prev.slice(0, 29),
    ]);
  }, []);

  const columns = useMemo(
    () => [
      helper.accessor("name", { header: "User", size: 120, padding: [0, 8] }),
      ...PLANS.map((plan) =>
        helper.display({
          id: `plan-${plan}`,
          header: plan,
          size: 100,
          cell: (info) => {
            const checked = info.row.original.plan === plan;
            return (
              <Radio
                checked={checked}
                disabled={disabled}
                onClick={(e) => {
                  e.preventDefault();
                  if (disabled) return;
                  addLog("onClick", plan, e);
                  const rowIndex = info.row.index;
                  setData((prev) => prev.map((r, i) => (i === rowIndex ? { ...r, plan } : r)));
                }}
                onMouseEnter={(e) => addLog("onMouseEnter", plan, e)}
                onMouseLeave={(e) => addLog("onMouseLeave", plan, e)}
              >
                <Label value={plan} fontSize={12} />
              </Radio>
            );
          },
        }),
      ),
    ],
    [disabled, addLog],
  );

  return (
    <>
      <h1>Canvas: Radio</h1>
      <p>
        <code>Radio</code> self-draws a radio indicator on canvas. Use <code>Label</code> as
        children for associated text. Only one plan per row can be selected.
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={btnBase} onClick={() => setData(generateData)}>
            Reset
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Plan Selection ({data.length} users)</h2>
          <Grid
            data={data}
            columns={columns}
            width={550}
            height={400}
            rowHeight={36}
            overflowY="auto"
          />
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
            Click radio buttons to change plan. Events are logged below.
          </p>
          <div
            style={{
              height: 340,
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
                    minWidth: 110,
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

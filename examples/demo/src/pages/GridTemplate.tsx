import { useState, useMemo } from "react";
import { Grid, Column } from "@ohah/react-wasm-table";
import type { CssGridAutoFlow } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

const PRESETS = [
  { label: "1fr 1fr 1fr", value: "1fr 1fr 1fr" },
  { label: "200px 1fr 1fr", value: "200px 1fr 1fr" },
  { label: "1fr 2fr 1fr", value: "1fr 2fr 1fr" },
  { label: "repeat(3, 1fr)", value: "repeat(3, 1fr)" },
  { label: "minmax(100px, 1fr) 2fr 1fr", value: "minmax(100px, 1fr) 2fr 1fr" },
];

const FLOW_OPTIONS: CssGridAutoFlow[] = ["row", "column", "row dense", "column dense"];

const GAP_OPTIONS = [0, 8, 16];

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
  borderColor: "#1976d2",
};

export function GridTemplate() {
  const [templateCols, setTemplateCols] = useState("1fr 1fr 1fr");
  const [autoFlow, setAutoFlow] = useState<CssGridAutoFlow>("row");
  const [gapValue, setGapValue] = useState(0);
  const data = useMemo(() => generateSmallData(), []);

  return (
    <>
      <h1>display: grid</h1>
      <p>
        Uses CSS Grid layout via Taffy. The <code>gridTemplateColumns</code> prop defines column
        track sizes, replacing fixed <code>width</code> on each Column.
      </p>

      <div style={{ marginBottom: 12 }}>
        <strong>gridTemplateColumns:</strong>
        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
          {PRESETS.map((p) => (
            <button
              key={p.value}
              data-testid={`preset-${p.value}`}
              style={templateCols === p.value ? btnActive : btnBase}
              onClick={() => setTemplateCols(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong>gridAutoFlow:</strong>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          {FLOW_OPTIONS.map((f) => (
            <button
              key={f}
              data-testid={`flow-${f}`}
              style={autoFlow === f ? btnActive : btnBase}
              onClick={() => setAutoFlow(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <strong>gap:</strong>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          {GAP_OPTIONS.map((g) => (
            <button
              key={g}
              data-testid={`gap-${g}`}
              style={gapValue === g ? btnActive : btnBase}
              onClick={() => setGapValue(g)}
            >
              {g}px
            </button>
          ))}
        </div>
      </div>

      <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4, fontSize: 13 }}>
        {`<Grid display="grid"
  gridTemplateColumns="${templateCols}"
  gridAutoFlow="${autoFlow}"
  gap={${gapValue}} ...>
  <Column id="name" header="Name" />
  <Column id="dept" header="Department" />
  <Column id="salary" header="Salary" align="right" />
</Grid>`}
      </pre>

      <Grid
        data={data}
        width={800}
        height={400}
        display="grid"
        gridTemplateColumns={templateCols}
        gridAutoFlow={autoFlow}
        gap={gapValue}
      >
        <Column id="name" header="Name" />
        <Column id="dept" header="Department" />
        <Column id="salary" header="Salary" align="right" />
      </Grid>
    </>
  );
}

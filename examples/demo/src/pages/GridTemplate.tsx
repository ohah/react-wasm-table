import { useState, useMemo } from "react";
import { Grid, createColumnHelper } from "@ohah/react-wasm-table";
import type { CssGridAutoFlow } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";
import { CssGrid } from "../components/CssGrid";

type SmallRow = { name: string; dept: string; salary: number };
const helper = createColumnHelper<SmallRow>();

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
  border: "1px solid #1976d2",
};

const columns = [
  helper.accessor("name", { header: "Name", padding: [0, 8] }),
  helper.accessor("dept", { header: "Department", padding: [0, 8] }),
  helper.accessor("salary", { header: "Salary", align: "right", padding: [0, 8] }),
];

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
  gap={${gapValue}}
  columns={columns} />`}
      </pre>

      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#666" }}>
            Grid API — Canvas (WASM/Taffy)
          </h3>
          <Grid
            data={data}
            width={800}
            height={520}
            display="grid"
            gridTemplateColumns={templateCols}
            gridAutoFlow={autoFlow}
            gap={gapValue}
            columns={columns}
          />
        </div>
        <div style={{ width: 1, background: "#e0e0e0", alignSelf: "stretch", margin: "0 16px" }} />
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#666" }}>CSS (Browser)</h3>
          <CssGrid
            data={data}
            width={800}
            height={520}
            display="grid"
            gridTemplateColumns={templateCols}
            gridAutoFlow={autoFlow}
            gap={gapValue}
            columns={columns}
          />
        </div>
      </div>
    </>
  );
}

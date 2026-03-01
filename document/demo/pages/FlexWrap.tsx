import { useState, useMemo } from "react";
import { Grid, createColumnHelper, type CssFlexWrap } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

type SmallRow = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<SmallRow>();

const options: CssFlexWrap[] = ["nowrap", "wrap", "wrap-reverse"];

const btnBase: React.CSSProperties = {
  padding: "4px 12px",
  border: "1px solid var(--demo-border-2)",
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
  helper.accessor("name", { header: "Name", size: 200, padding: [0, 8] }),
  helper.accessor("dept", { header: "Department", size: 200, padding: [0, 8] }),
  helper.accessor("salary", { header: "Salary", size: 200, align: "right", padding: [0, 8] }),
  helper.accessor("score", { header: "Score", size: 200, align: "right", padding: [0, 8] }),
];

export function FlexWrap() {
  const [wrap, setWrap] = useState<CssFlexWrap>("nowrap");
  const data = useMemo(() => generateSmallData(), []);

  return (
    <>
      <h1>flex-wrap</h1>
      <p>Controls whether columns wrap to the next line when they overflow the container.</p>

      <div style={{ marginBottom: 16 }}>
        <strong>flex-wrap:</strong>
        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
          {options.map((v) => (
            <button
              key={v}
              data-testid={`wrap-${v}`}
              style={wrap === v ? btnActive : btnBase}
              onClick={() => setWrap(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <pre
        style={{
          background: "var(--demo-code-bg)",
          color: "var(--demo-code-fg)",
          padding: 12,
          borderRadius: 4,
          fontSize: 13,
        }}
      >
        {`<Grid flexWrap="${wrap}" width={500} columns={columns} ...>
  (4 columns × 200px = 800px > 500px container)`}
      </pre>

      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "var(--demo-muted)" }}>
            Grid API — Canvas (WASM/Taffy)
          </h3>
          <Grid data={data} width={500} height={400} flexWrap={wrap} columns={columns} />
        </div>
      </div>
    </>
  );
}

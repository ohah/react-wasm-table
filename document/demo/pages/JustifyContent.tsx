import { useState, useMemo } from "react";
import { Grid, createColumnHelper, type CssJustifyContent } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

type SmallRow = { name: string; dept: string; salary: number };
const helper = createColumnHelper<SmallRow>();

const options: CssJustifyContent[] = [
  "start",
  "end",
  "flex-start",
  "flex-end",
  "center",
  "stretch",
  "space-between",
  "space-evenly",
  "space-around",
];

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
  helper.accessor("name", { header: "Name", size: 150, padding: [0, 8] }),
  helper.accessor("dept", { header: "Department", size: 120, padding: [0, 8] }),
  helper.accessor("salary", { header: "Salary", size: 100, align: "right", padding: [0, 8] }),
];

export function JustifyContent() {
  const [justify, setJustify] = useState<CssJustifyContent>("start");
  const data = useMemo(() => generateSmallData(), []);

  return (
    <>
      <h1>justify-content</h1>
      <p>Controls distribution of columns along the main axis.</p>

      <div style={{ marginBottom: 16 }}>
        <strong>justify-content:</strong>
        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
          {options.map((v) => (
            <button
              key={v}
              data-testid={`justify-${v}`}
              style={justify === v ? btnActive : btnBase}
              onClick={() => setJustify(v)}
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
        {`<Grid justifyContent="${justify}" width={800} columns={columns} ...>
// Total column width: 370px < 800px container`}
      </pre>

      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "var(--demo-muted)" }}>
            Grid API — Canvas (WASM/Taffy)
          </h3>
          <Grid data={data} width={800} height={400} justifyContent={justify} columns={columns} />
        </div>
      </div>
    </>
  );
}

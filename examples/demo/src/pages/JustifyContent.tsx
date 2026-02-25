import { useState, useMemo } from "react";
import { Grid, Column, type CssJustifyContent } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";
import { CssGrid, CssColumn } from "../components/CssGrid";

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

      <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4, fontSize: 13 }}>
        {`<Grid justifyContent="${justify}" width={800} ...>
  <Column id="name" width={150} />
  <Column id="dept" width={120} />
  <Column id="salary" width={100} />
</Grid>
// Total column width: 370px < 800px container`}
      </pre>

      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#666" }}>Canvas (WASM/Taffy)</h3>
          <Grid data={data} width={800} height={400} justifyContent={justify}>
            <Column id="name" width={150} header="Name" padding={[0, 8]} />
            <Column id="dept" width={120} header="Department" padding={[0, 8]} />
            <Column id="salary" width={100} header="Salary" align="right" padding={[0, 8]} />
          </Grid>
        </div>
        <div style={{ width: 1, background: "#e0e0e0", alignSelf: "stretch", margin: "0 16px" }} />
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#666" }}>CSS (Browser)</h3>
          <CssGrid data={data} width={800} height={400} justifyContent={justify}>
            <CssColumn id="name" width={150} header="Name" />
            <CssColumn id="dept" width={120} header="Department" />
            <CssColumn id="salary" width={100} header="Salary" align="right" />
          </CssGrid>
        </div>
      </div>
    </>
  );
}

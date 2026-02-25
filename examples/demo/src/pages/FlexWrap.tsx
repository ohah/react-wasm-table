import { useState, useMemo } from "react";
import { Grid, Column, type CssFlexWrap } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

const options: CssFlexWrap[] = ["nowrap", "wrap", "wrap-reverse"];

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

      <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4, fontSize: 13 }}>
        {`<Grid flexWrap="${wrap}" width={500} ...>
  <Column width={200} /> × 4 (total 800px > 500px container)
</Grid>`}
      </pre>

      <Grid data={data} width={500} height={400} flexWrap={wrap}>
        <Column id="name" width={200} header="Name" />
        <Column id="dept" width={200} header="Department" />
        <Column id="salary" width={200} header="Salary" align="right" />
        <Column id="score" width={200} header="Score" align="right" />
      </Grid>
    </>
  );
}

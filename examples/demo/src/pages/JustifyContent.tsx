import { useState, useMemo } from "react";
import { Grid, Column, type CssJustifyContent } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

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
  borderColor: "#1976d2",
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

      <Grid data={data} width={800} height={400} justifyContent={justify}>
        <Column id="name" width={150} header="Name" />
        <Column id="dept" width={120} header="Department" />
        <Column id="salary" width={100} header="Salary" align="right" />
      </Grid>
    </>
  );
}

import { useState, useMemo } from "react";
import { Grid, Column, type CssJustifyContent } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

const options: CssJustifyContent[] = [
  "start", "end", "flex-start", "flex-end", "center",
  "stretch", "space-between", "space-evenly", "space-around",
];

export function JustifyContent() {
  const [justify, setJustify] = useState<CssJustifyContent>("start");
  const data = useMemo(() => generateSmallData(), []);

  return (
    <>
      <h1>justify-content</h1>
      <p>Controls distribution of columns along the main axis.</p>

      <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <label>
          <strong>justify-content:</strong>{" "}
          <select
            value={justify}
            onChange={(e) => setJustify(e.target.value as CssJustifyContent)}
            style={{ fontSize: 14, padding: "4px 8px" }}
          >
            {options.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>
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

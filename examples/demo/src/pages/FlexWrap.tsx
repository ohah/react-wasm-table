import { useState, useMemo } from "react";
import { Grid, Column, type CssFlexWrap } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

const options: CssFlexWrap[] = ["nowrap", "wrap", "wrap-reverse"];

export function FlexWrap() {
  const [wrap, setWrap] = useState<CssFlexWrap>("nowrap");
  const data = useMemo(() => generateSmallData(), []);

  return (
    <>
      <h1>flex-wrap</h1>
      <p>Controls whether columns wrap to the next line when they overflow the container.</p>

      <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <label>
          <strong>flex-wrap:</strong>{" "}
          <select
            value={wrap}
            onChange={(e) => setWrap(e.target.value as CssFlexWrap)}
            style={{ fontSize: 14, padding: "4px 8px" }}
          >
            {options.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
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

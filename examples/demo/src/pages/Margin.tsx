import { useState, useMemo } from "react";
import { Grid, Column } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

export function Margin() {
  const [marginValue, setMarginValue] = useState(0);
  const data = useMemo(() => generateSmallData(), []);

  return (
    <>
      <h1>margin</h1>
      <p>
        Margin on columns adds space outside each column. Unlike gap (which is uniform),
        margin can be set individually per column.
      </p>

      <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <label>
          <strong>Column margin (col 2 only):</strong>{" "}
          <input
            type="range"
            min={0}
            max={30}
            step={1}
            value={marginValue}
            onChange={(e) => setMarginValue(Number(e.target.value))}
          />{" "}
          {marginValue}px
        </label>
      </div>

      <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4, fontSize: 13 }}>
{`<Grid ...>
  <Column id="name" width={180} />
  <Column id="dept" width={120} margin={${marginValue}} />
  <Column id="salary" width={100} />
</Grid>`}
      </pre>

      <Grid data={data} width={800} height={400}>
        <Column id="name" width={180} header="Name" />
        <Column id="dept" width={120} header="Department" margin={marginValue} />
        <Column id="salary" width={100} header="Salary" align="right" />
        <Column id="score" width={80} header="Score" align="right" />
      </Grid>
    </>
  );
}

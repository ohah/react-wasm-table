import { useState, useMemo } from "react";
import { Grid, Column } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

export function Gap() {
  const [gapValue, setGapValue] = useState(0);
  const data = useMemo(() => generateSmallData(), []);

  return (
    <>
      <h1>gap</h1>
      <p>Sets the spacing between columns (flex items). Equivalent to CSS column-gap.</p>

      <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <label>
          <strong>gap:</strong>{" "}
          <input
            type="range"
            min={0}
            max={40}
            step={1}
            value={gapValue}
            onChange={(e) => setGapValue(Number(e.target.value))}
          />{" "}
          {gapValue}px
        </label>
      </div>

      <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4, fontSize: 13 }}>
        {`<Grid gap={${gapValue}} ...>
  <Column id="name" width={180} />
  <Column id="dept" width={120} />
  <Column id="salary" width={100} />
  <Column id="score" width={80} />
</Grid>`}
      </pre>

      <Grid data={data} width={800} height={400} gap={gapValue}>
        <Column id="name" width={180} header="Name" />
        <Column id="dept" width={120} header="Department" />
        <Column id="salary" width={100} header="Salary" align="right" />
        <Column id="score" width={80} header="Score" align="right" />
      </Grid>
    </>
  );
}

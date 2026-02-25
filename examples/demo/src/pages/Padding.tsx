import { useState, useMemo } from "react";
import { Grid, Column } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

export function Padding() {
  const [cellPad, setCellPad] = useState(0);
  const [containerPad, setContainerPad] = useState(0);
  const data = useMemo(() => generateSmallData(), []);

  return (
    <>
      <h1>padding</h1>
      <p>
        Padding on <strong>columns</strong> (flex children) affects the inner content area of each
        cell. Padding on the <strong>Grid</strong> (container) adds space around all columns.
      </p>

      <div style={{ marginBottom: 16, display: "flex", gap: 20, flexWrap: "wrap" }}>
        <label>
          <strong>Column padding:</strong>{" "}
          <input
            type="range"
            min={0}
            max={24}
            step={1}
            value={cellPad}
            onChange={(e) => setCellPad(Number(e.target.value))}
          />{" "}
          {cellPad}px
        </label>
        <label>
          <strong>Container padding:</strong>{" "}
          <input
            type="range"
            min={0}
            max={40}
            step={1}
            value={containerPad}
            onChange={(e) => setContainerPad(Number(e.target.value))}
          />{" "}
          {containerPad}px
        </label>
      </div>

      <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4, fontSize: 13 }}>
        {`<Grid padding={${containerPad}} ...>
  <Column id="name" width={180} padding={${cellPad}} />
  <Column id="dept" width={120} padding={${cellPad}} />
  <Column id="salary" width={100} padding={${cellPad}} />
</Grid>`}
      </pre>

      <Grid data={data} width={800} height={400} padding={containerPad}>
        <Column id="name" width={180} header="Name" padding={cellPad} />
        <Column id="dept" width={120} header="Department" padding={cellPad} />
        <Column id="salary" width={100} header="Salary" align="right" padding={cellPad} />
        <Column id="score" width={80} header="Score" align="right" padding={cellPad} />
      </Grid>
    </>
  );
}

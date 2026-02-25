import { useState, useMemo } from "react";
import { Grid, Column, type CssFlexDirection } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

const options: CssFlexDirection[] = ["row", "column", "row-reverse", "column-reverse"];

export function FlexDirection() {
  const [direction, setDirection] = useState<CssFlexDirection>("row");
  const data = useMemo(() => generateSmallData(), []);

  return (
    <>
      <h1>flex-direction</h1>
      <p>Controls the direction of the main axis for column layout.</p>

      <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <label>
          <strong>flex-direction:</strong>{" "}
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as CssFlexDirection)}
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
        {`<Grid flexDirection="${direction}" ...>
  <Column id="name" width={180} />
  <Column id="dept" width={120} />
  <Column id="salary" width={100} />
</Grid>`}
      </pre>

      <Grid
        data={data}
        width={800}
        height={direction === "row" || direction === "row-reverse" ? 400 : 600}
        flexDirection={direction}
      >
        <Column id="name" width={180} header="Name" />
        <Column id="dept" width={120} header="Department" />
        <Column id="salary" width={100} header="Salary" align="right" />
        <Column id="score" width={80} header="Score" align="right" />
      </Grid>
    </>
  );
}

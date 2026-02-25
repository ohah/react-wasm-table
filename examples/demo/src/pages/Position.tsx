import { useState, useMemo } from "react";
import { Grid, Column, type CssPosition } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

const positionOptions: CssPosition[] = ["relative", "absolute"];

export function Position() {
  const [pos, setPos] = useState<CssPosition>("relative");
  const [insetLeft, setInsetLeft] = useState(0);
  const [insetTop, setInsetTop] = useState(0);
  const data = useMemo(() => generateSmallData(), []);

  return (
    <>
      <h1>position + inset</h1>
      <p>
        <code>position: relative</code> offsets a column from its normal position.
        <code>position: absolute</code> positions it relative to the container.
        Use inset (top/right/bottom/left) to control the offset.
      </p>

      <div style={{ marginBottom: 16, display: "flex", gap: 20, flexWrap: "wrap" }}>
        <label>
          <strong>Position (col 2):</strong>{" "}
          <select
            value={pos}
            onChange={(e) => setPos(e.target.value as CssPosition)}
            style={{ fontSize: 14, padding: "4px 8px" }}
          >
            {positionOptions.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          <strong>insetLeft:</strong>{" "}
          <input
            type="range"
            min={-50}
            max={100}
            step={5}
            value={insetLeft}
            onChange={(e) => setInsetLeft(Number(e.target.value))}
          />{" "}
          {insetLeft}px
        </label>
        <label>
          <strong>insetTop:</strong>{" "}
          <input
            type="range"
            min={-50}
            max={100}
            step={5}
            value={insetTop}
            onChange={(e) => setInsetTop(Number(e.target.value))}
          />{" "}
          {insetTop}px
        </label>
      </div>

      <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4, fontSize: 13 }}>
{`<Grid ...>
  <Column id="name" width={180} />
  <Column id="dept" width={120} position="${pos}" insetLeft={${insetLeft}} insetTop={${insetTop}} />
  <Column id="salary" width={100} />
</Grid>`}
      </pre>

      <Grid data={data} width={800} height={400}>
        <Column id="name" width={180} header="Name" />
        <Column
          id="dept"
          width={120}
          header="Dept (positioned)"
          position={pos}
          insetLeft={insetLeft}
          insetTop={insetTop}
        />
        <Column id="salary" width={100} header="Salary" align="right" />
        <Column id="score" width={80} header="Score" align="right" />
      </Grid>
    </>
  );
}

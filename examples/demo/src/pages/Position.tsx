import { useState, useMemo } from "react";
import { Grid, Column, type CssPosition } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";
import { CssGrid, CssColumn } from "../components/CssGrid";

const positionOptions: CssPosition[] = ["relative", "absolute"];

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
        <code>position: absolute</code> positions it relative to the container. Use inset
        (top/right/bottom/left) to control the offset.
      </p>

      <div style={{ marginBottom: 16, display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div>
          <strong>Position (col 2):</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            {positionOptions.map((v) => (
              <button
                key={v}
                data-testid={`position-${v}`}
                style={pos === v ? btnActive : btnBase}
                onClick={() => setPos(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
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

      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#666" }}>Canvas (WASM/Taffy)</h3>
          <Grid data={data} width={800} height={400}>
            <Column id="name" width={180} header="Name" padding={[0, 8]} />
            <Column
              id="dept"
              width={120}
              header="Dept (positioned)"
              position={pos}
              insetLeft={insetLeft}
              insetTop={insetTop}
              padding={[0, 8]}
            />
            <Column id="salary" width={100} header="Salary" align="right" padding={[0, 8]} />
            <Column id="score" width={80} header="Score" align="right" padding={[0, 8]} />
          </Grid>
        </div>
        <div style={{ width: 1, background: "#e0e0e0", alignSelf: "stretch", margin: "0 16px" }} />
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#666" }}>CSS (Browser)</h3>
          <CssGrid data={data} width={800} height={400}>
            <CssColumn id="name" width={180} header="Name" />
            <CssColumn
              id="dept"
              width={120}
              header="Dept (positioned)"
              position={pos}
              insetLeft={insetLeft}
              insetTop={insetTop}
            />
            <CssColumn id="salary" width={100} header="Salary" align="right" />
            <CssColumn id="score" width={80} header="Score" align="right" />
          </CssGrid>
        </div>
      </div>
    </>
  );
}

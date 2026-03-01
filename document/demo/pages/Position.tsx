import { useState, useMemo } from "react";
import { Grid, createColumnHelper, type CssPosition } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

type SmallRow = { name: string; dept: string; salary: number; score: number };

const positionOptions: CssPosition[] = ["relative", "absolute"];

const btnBase: React.CSSProperties = {
  padding: "4px 12px",
  border: "1px solid var(--demo-border-2)",
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

  const helper = createColumnHelper<SmallRow>();
  const columns = useMemo(
    () => [
      helper.accessor("name", { header: "Name", size: 180, padding: [0, 8] }),
      helper.accessor("dept", {
        header: "Dept (positioned)",
        size: 120,
        position: pos,
        insetLeft,
        insetTop,
        padding: [0, 8],
      }),
      helper.accessor("salary", { header: "Salary", size: 100, align: "right", padding: [0, 8] }),
      helper.accessor("score", { header: "Score", size: 80, align: "right", padding: [0, 8] }),
    ],
    [pos, insetLeft, insetTop],
  );

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

      <pre
        style={{
          background: "var(--demo-code-bg)",
          color: "var(--demo-code-fg)",
          padding: 12,
          borderRadius: 4,
          fontSize: 13,
        }}
      >
        {`helper.accessor("name", { size: 180 })
helper.accessor("dept", { size: 120, position: "${pos}", insetLeft: ${insetLeft}, insetTop: ${insetTop} })
helper.accessor("salary", { size: 100 })

<Grid columns={columns} />`}
      </pre>

      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "var(--demo-muted)" }}>
            Grid API — Canvas (WASM/Taffy)
          </h3>
          <Grid data={data} width={800} height={400} columns={columns} />
        </div>
      </div>
    </>
  );
}

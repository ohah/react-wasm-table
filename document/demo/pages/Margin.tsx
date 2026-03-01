import { useState, useMemo } from "react";
import { Grid, createColumnHelper } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

type SmallRow = { name: string; dept: string; salary: number; score: number };

export function Margin() {
  const [marginValue, setMarginValue] = useState(0);
  const data = useMemo(() => generateSmallData(), []);

  const helper = createColumnHelper<SmallRow>();
  const columns = [
    helper.accessor("name", { header: "Name", size: 180, padding: [0, 8] }),
    helper.accessor("dept", {
      header: "Department",
      size: 120,
      margin: marginValue,
      padding: [0, 8],
    }),
    helper.accessor("salary", { header: "Salary", size: 100, align: "right", padding: [0, 8] }),
    helper.accessor("score", { header: "Score", size: 80, align: "right", padding: [0, 8] }),
  ];

  return (
    <>
      <h1>margin</h1>
      <p>
        Margin on columns adds space outside each column. Unlike gap (which is uniform), margin can
        be set individually per column.
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

      <pre style={{ background: "var(--demo-code-bg)", color: "var(--demo-code-fg)", padding: 12, borderRadius: 4, fontSize: 13 }}>
        {`helper.accessor("name", { size: 180 })
helper.accessor("dept", { size: 120, margin: ${marginValue} })
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

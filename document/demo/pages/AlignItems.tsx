import { useState, useMemo } from "react";
import { Grid, createColumnHelper, type CssAlignItems } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

type SmallRow = { name: string; dept: string; salary: number; score: number };

const containerOptions: CssAlignItems[] = [
  "start",
  "end",
  "flex-start",
  "flex-end",
  "center",
  "baseline",
  "stretch",
];

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

export function AlignItems() {
  const [alignItemsValue, setAlignItemsValue] = useState<CssAlignItems>("stretch");
  const [alignSelfValue, setAlignSelfValue] = useState<CssAlignItems | "">("");
  const data = useMemo(() => generateSmallData(), []);

  const helper = createColumnHelper<SmallRow>();
  const columns = [
    helper.accessor("name", { header: "Name", size: 180, padding: [0, 8] }),
    helper.accessor("dept", {
      header: "Department",
      size: 120,
      alignSelf: alignSelfValue || undefined,
      padding: [0, 8],
    }),
    helper.accessor("salary", { header: "Salary", size: 100, align: "right", padding: [0, 8] }),
    helper.accessor("score", { header: "Score", size: 80, align: "right", padding: [0, 8] }),
  ];

  return (
    <>
      <h1>align-items / align-self</h1>
      <p>
        Controls cross-axis alignment of columns. align-self overrides align-items for a specific
        column.
      </p>

      <div style={{ marginBottom: 16, display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div>
          <strong>align-items (container):</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            {containerOptions.map((v) => (
              <button
                key={v}
                data-testid={`align-items-${v}`}
                style={alignItemsValue === v ? btnActive : btnBase}
                onClick={() => setAlignItemsValue(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div>
          <strong>align-self (col 2 "Department"):</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            <button
              data-testid="align-self-inherit"
              style={alignSelfValue === "" ? btnActive : btnBase}
              onClick={() => setAlignSelfValue("")}
            >
              (inherit)
            </button>
            {containerOptions.map((v) => (
              <button
                key={v}
                data-testid={`align-self-${v}`}
                style={alignSelfValue === v ? btnActive : btnBase}
                onClick={() => setAlignSelfValue(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
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
helper.accessor("dept", { size: 120${alignSelfValue ? `, alignSelf: "${alignSelfValue}"` : ""} })
helper.accessor("salary", { size: 100 })

<Grid alignItems="${alignItemsValue}" rowHeight={60} columns={columns} />`}
      </pre>

      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "var(--demo-muted)" }}>
            Grid API — Canvas (WASM/Taffy)
          </h3>
          <Grid
            data={data}
            width={800}
            height={400}
            rowHeight={60}
            alignItems={alignItemsValue}
            columns={columns}
          />
        </div>
      </div>
    </>
  );
}

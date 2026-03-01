import { useState, useMemo } from "react";
import { Grid, createColumnHelper, type CssDimension } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

type SmallRow = { name: string; dept: string; salary: number };

const BASIS_OPTIONS = [
  { label: "auto", value: "auto" },
  { label: "0", value: "0" },
  { label: "100px", value: "100" },
  { label: "200px", value: "200" },
  { label: "50%", value: "50%" },
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

export function FlexGrow() {
  const [grow1, setGrow1] = useState(0);
  const [grow2, setGrow2] = useState(1);
  const [shrink, setShrink] = useState(1);
  const [basis, setBasis] = useState("auto");
  const data = useMemo(() => generateSmallData(), []);

  const basisProp: CssDimension =
    basis === "auto" ? "auto" : basis.includes("%") ? (basis as `${number}%`) : Number(basis);

  const helper = createColumnHelper<SmallRow>();
  const columns = [
    helper.accessor("name", { header: "Name", size: 150, flexGrow: grow1, padding: [0, 8] }),
    helper.accessor("dept", {
      header: "Department",
      flexGrow: grow2,
      flexBasis: basisProp,
      padding: [0, 8],
    }),
    helper.accessor("salary", {
      header: "Salary",
      size: 300,
      align: "right",
      flexShrink: shrink,
      padding: [0, 8],
    }),
  ];

  return (
    <>
      <h1>flex-grow / flex-shrink / flex-basis</h1>
      <p>Controls how columns grow or shrink to fill available space.</p>

      <div style={{ marginBottom: 16, display: "flex", gap: 20, flexWrap: "wrap" }}>
        <label>
          <strong>Col 1 flexGrow:</strong>{" "}
          <input
            type="range"
            min={0}
            max={5}
            step={1}
            value={grow1}
            onChange={(e) => setGrow1(Number(e.target.value))}
          />{" "}
          {grow1}
        </label>
        <label>
          <strong>Col 2 flexGrow:</strong>{" "}
          <input
            type="range"
            min={0}
            max={5}
            step={1}
            value={grow2}
            onChange={(e) => setGrow2(Number(e.target.value))}
          />{" "}
          {grow2}
        </label>
        <label>
          <strong>Col 3 flexShrink:</strong>{" "}
          <input
            type="range"
            min={0}
            max={5}
            step={1}
            value={shrink}
            onChange={(e) => setShrink(Number(e.target.value))}
          />{" "}
          {shrink}
        </label>
        <div>
          <strong>Col 2 flexBasis:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            {BASIS_OPTIONS.map((p) => (
              <button
                key={p.value}
                data-testid={`basis-${p.value}`}
                style={basis === p.value ? btnActive : btnBase}
                onClick={() => setBasis(p.value)}
              >
                {p.label}
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
        {`helper.accessor("name", { size: 150, flexGrow: ${grow1} })
helper.accessor("dept", { flexGrow: ${grow2}, flexBasis: "${basis}" })
helper.accessor("salary", { size: 300, flexShrink: ${shrink} })

<Grid width={800} columns={columns} />`}
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

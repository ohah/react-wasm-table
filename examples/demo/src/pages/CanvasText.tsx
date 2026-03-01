import { useState, useMemo } from "react";
import { Grid, createColumnHelper, Text } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

type Row = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<Row>();

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

export function CanvasText() {
  const data = useMemo(() => generateSmallData() as Row[], []);
  const [color, setColor] = useState("#1a1a1a");
  const [fontSize, setFontSize] = useState(13);
  const [fontWeight, setFontWeight] = useState<"normal" | "bold">("normal");

  const columns = useMemo(
    () => [
      helper.accessor("name", { header: "Name", size: 140, padding: [0, 8] }),
      helper.accessor("name", {
        header: "Text",
        size: 220,
        padding: [0, 12],
        cell: (info) => (
          <Text value={info.getValue()} color={color} fontSize={fontSize} fontWeight={fontWeight} />
        ),
      }),
    ],
    [color, fontSize, fontWeight],
  );

  return (
    <>
      <h1>Canvas: Text</h1>
      <p>
        <code>Text</code> draws a single line. Supports <code>style</code> and individual props{" "}
        <code>color</code>, <code>fontWeight</code>, <code>fontSize</code>.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
        <div>
          <strong>color:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {["#1a1a1a", "#1565c0", "#2e7d32", "#c62828"].map((c) => (
              <button key={c} style={color === c ? btnActive : btnBase} onClick={() => setColor(c)}>
                <span
                  style={{
                    display: "inline-block",
                    width: 12,
                    height: 12,
                    background: c,
                    borderRadius: 2,
                  }}
                />
              </button>
            ))}
          </div>
        </div>
        <div>
          <strong>fontSize:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {[11, 13, 15, 18].map((n) => (
              <button
                key={n}
                style={fontSize === n ? btnActive : btnBase}
                onClick={() => setFontSize(n)}
              >
                {n}px
              </button>
            ))}
          </div>
        </div>
        <div>
          <strong>fontWeight:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {(["normal", "bold"] as const).map((w) => (
              <button
                key={w}
                style={fontWeight === w ? btnActive : btnBase}
                onClick={() => setFontWeight(w)}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Grid API</h2>
        <Grid data={data} columns={columns} width={380} height={460} rowHeight={40} />
      </section>
    </>
  );
}

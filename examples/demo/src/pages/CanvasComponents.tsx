import { useState, useMemo } from "react";
import {
  Grid,
  createColumnHelper,
  Text,
  Badge,
  Flex,
  type CssFlexDirection,
  type CssAlignItems,
  type CssJustifyContent,
} from "@ohah/react-wasm-table";

type Row = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<Row>();

const flexDirectionOptions: CssFlexDirection[] = ["row", "column", "row-reverse", "column-reverse"];
const alignItemsOptions: CssAlignItems[] = ["start", "center", "end", "stretch"];
const justifyContentOptions: CssJustifyContent[] = [
  "start",
  "center",
  "end",
  "space-between",
  "space-evenly",
];
const gapOptions = [0, 4, 8, 12, 16];

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

export function CanvasComponents() {
  const [flexDirection, setFlexDirection] = useState<CssFlexDirection>("row");
  const [gap, setGap] = useState(8);
  const [alignItems, setAlignItems] = useState<CssAlignItems>("center");
  const [justifyContent, setJustifyContent] = useState<CssJustifyContent>("start");
  const [useStyleProp, setUseStyleProp] = useState(false);

  const previewData = useMemo(
    () => [{ name: "Preview", dept: "Dept", salary: 95000, score: 88 }] as Row[],
    [],
  );

  const previewColumns = useMemo(
    () => [
      helper.accessor("dept", {
        header: "Canvas preview",
        size: 420,
        padding: [0, 12],
        cell: (info) =>
          useStyleProp ? (
            <Flex style={{ flexDirection, gap, alignItems, justifyContent }}>
              <Badge value={info.getValue()} backgroundColor="#e3f2fd" color="#1565c0" />
              <Text value={`#${info.row.index + 1}`} fontSize={11} color="#666" />
              <Text value={String(info.row.original.salary)} fontSize={11} color="#888" />
            </Flex>
          ) : (
            <Flex
              flexDirection={flexDirection}
              gap={gap}
              alignItems={alignItems}
              justifyContent={justifyContent}
            >
              <Badge value={info.getValue()} backgroundColor="#e3f2fd" color="#1565c0" />
              <Text value={`#${info.row.index + 1}`} fontSize={11} color="#666" />
              <Text value={String(info.row.original.salary)} fontSize={11} color="#888" />
            </Flex>
          ),
      }),
    ],
    [flexDirection, gap, alignItems, justifyContent, useStyleProp],
  );

  return (
    <>
      <h1>Canvas Components (Flex API)</h1>
      <p>
        Flex in cells: Taffy-compatible styles, optional <code>style</code> prop, and{" "}
        <code>ReactNode</code> children. See <code>docs/canvas-components.md</code> for the full
        rules.
      </p>

      <h2 style={{ marginTop: 24, fontSize: 16 }}>Toggle Flex props</h2>
      <p style={{ marginBottom: 12, fontSize: 14, color: "#555" }}>
        Change the values below and watch the canvas preview update. The preview is rendered on
        canvas with the same Flex props.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginBottom: 16 }}>
        <div>
          <strong>flexDirection:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            {flexDirectionOptions.map((v) => (
              <button
                key={v}
                style={flexDirection === v ? btnActive : btnBase}
                onClick={() => setFlexDirection(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div>
          <strong>gap:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            {gapOptions.map((v) => (
              <button key={v} style={gap === v ? btnActive : btnBase} onClick={() => setGap(v)}>
                {v}px
              </button>
            ))}
          </div>
        </div>
        <div>
          <strong>alignItems:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            {alignItemsOptions.map((v) => (
              <button
                key={v}
                style={alignItems === v ? btnActive : btnBase}
                onClick={() => setAlignItems(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div>
          <strong>justifyContent:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            {justifyContentOptions.map((v) => (
              <button
                key={v}
                style={justifyContent === v ? btnActive : btnBase}
                onClick={() => setJustifyContent(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div>
          <strong>Pass via:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <button
              style={!useStyleProp ? btnActive : btnBase}
              onClick={() => setUseStyleProp(false)}
            >
              Individual props
            </button>
            <button
              style={useStyleProp ? btnActive : btnBase}
              onClick={() => setUseStyleProp(true)}
            >
              style object
            </button>
          </div>
        </div>
      </div>

      <h3 style={{ margin: "16px 0 8px", fontSize: 14, color: "#666" }}>Canvas preview</h3>
      <Grid data={previewData} columns={previewColumns} width={440} height={200} rowHeight={120} />

      <pre
        style={{
          background: "#f5f5f5",
          padding: 12,
          borderRadius: 4,
          fontSize: 12,
          marginTop: 16,
          overflow: "auto",
        }}
      >
        {useStyleProp
          ? `<Flex style={{ flexDirection: "${flexDirection}", gap: ${gap}, alignItems: "${alignItems}", justifyContent: "${justifyContent}" }}>\n  <Badge value={dept} />\n  <Text value={\`#\${index}\`} />\n  <Text value={salary} />\n</Flex>`
          : `<Flex\n  flexDirection="${flexDirection}"\n  gap={${gap}}\n  alignItems="${alignItems}"\n  justifyContent="${justifyContent}"\n>\n  <Badge value={dept} />\n  <Text value={\`#\${index}\`} />\n  <Text value={salary} />\n</Flex>`}
      </pre>
    </>
  );
}

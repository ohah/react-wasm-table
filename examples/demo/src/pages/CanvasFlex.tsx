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

export function CanvasFlex() {
  const [flexDirection, setFlexDirection] = useState<CssFlexDirection>("row");
  const [gap, setGap] = useState(8);
  const [alignItems, setAlignItems] = useState<CssAlignItems>("center");
  const [justifyContent, setJustifyContent] = useState<CssJustifyContent>("start");
  const [useStyleProp, setUseStyleProp] = useState(false);

  const previewData = useMemo(
    () => [{ name: "Preview", dept: "Dept", salary: 95000, score: 88 }] as Row[],
    [],
  );

  const flexCell = (info: { getValue: () => string; row: { index: number; original: Row } }) =>
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
    );

  const previewColumns = useMemo(
    () => [
      helper.accessor("dept", {
        header: "Canvas preview",
        size: 420,
        padding: [0, 12],
        cell: flexCell,
      }),
    ],
    [flexDirection, gap, alignItems, justifyContent, useStyleProp],
  );

  return (
    <>
      <h1>Canvas: Flex</h1>
      <p>
        <code>Flex</code> is a Taffy-compatible flex container. Use multiple children (e.g. Badge +
        Text) to see <code>flexDirection</code>, <code>gap</code>, <code>alignItems</code>,{" "}
        <code>justifyContent</code> in action.
      </p>

      <h2 style={{ marginTop: 24, fontSize: 16 }}>Toggle Flex props</h2>
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
      <section style={{ marginBottom: 32 }}>
        <h4 style={{ fontSize: 14, marginBottom: 6 }}>Grid API</h4>
        <Grid
          data={previewData}
          columns={previewColumns}
          width={440}
          height={480}
          rowHeight={120}
        />
      </section>

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

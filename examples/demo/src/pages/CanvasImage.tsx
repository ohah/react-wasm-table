import { useState, useMemo } from "react";
import { Grid, createColumnHelper, Image, Text, Stack } from "@ohah/react-wasm-table";

type ObjectFit = "contain" | "cover" | "fill" | "none" | "scale-down";

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  avatar: string;
  photo: string;
}

const SAMPLE_IMAGES = [
  "https://picsum.photos/seed/a1/200/200",
  "https://picsum.photos/seed/b2/200/200",
  "https://picsum.photos/seed/c3/200/200",
  "https://picsum.photos/seed/d4/200/200",
  "https://picsum.photos/seed/e5/200/200",
  "https://picsum.photos/seed/f6/200/200",
  "https://picsum.photos/seed/g7/200/200",
  "https://picsum.photos/seed/h8/200/200",
];

const LANDSCAPE_IMAGES = [
  "https://picsum.photos/seed/l1/400/200",
  "https://picsum.photos/seed/l2/400/200",
  "https://picsum.photos/seed/l3/400/200",
  "https://picsum.photos/seed/l4/400/200",
  "https://picsum.photos/seed/l5/400/200",
  "https://picsum.photos/seed/l6/400/200",
  "https://picsum.photos/seed/l7/400/200",
  "https://picsum.photos/seed/l8/400/200",
];

const NAMES = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Hank"];

const data: Row[] = NAMES.map((name, i) => ({
  id: i + 1,
  name,
  avatar: SAMPLE_IMAGES[i]!,
  photo: LANDSCAPE_IMAGES[i]!,
}));

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

const objectFitOptions: ObjectFit[] = ["fill", "contain", "cover", "none", "scale-down"];

export function CanvasImage() {
  const [objectFit, setObjectFit] = useState<ObjectFit>("contain");
  const [borderRadius, setBorderRadius] = useState(0);
  const [opacity, setOpacity] = useState(1);

  const columns = useMemo(
    () => [
      helper.accessor("name", {
        header: "Name",
        size: 120,
        padding: [0, 8],
      }),
      helper.display({
        id: "avatar",
        header: "Avatar",
        size: 80,
        padding: [4, 8],
        cell: (info) => {
          const row = info.row.original;
          return (
            <Image
              src={row.avatar}
              alt={row.name}
              objectFit="cover"
              borderRadius={20}
              crossOrigin="anonymous"
            />
          );
        },
      }),
      helper.display({
        id: "photo",
        header: "Photo",
        size: 200,
        padding: [4, 8],
        cell: (info) => {
          const row = info.row.original;
          return (
            <Image
              src={row.photo}
              alt={`${row.name}'s photo`}
              objectFit={objectFit}
              borderRadius={borderRadius}
              opacity={opacity}
              crossOrigin="anonymous"
            />
          );
        },
      }),
      helper.display({
        id: "stacked",
        header: "Stack + Image",
        size: 200,
        padding: [4, 8],
        cell: (info) => {
          const row = info.row.original;
          return (
            <Stack direction="row" gap={8}>
              <Image
                src={row.avatar}
                alt={row.name}
                width={28}
                height={28}
                objectFit="cover"
                borderRadius={14}
                crossOrigin="anonymous"
              />
              <Text value={row.name} />
            </Stack>
          );
        },
      }),
    ],
    [objectFit, borderRadius, opacity],
  );

  const errorColumns = useMemo(
    () => [
      helper.accessor("name", {
        header: "Name",
        size: 120,
        padding: [0, 8],
      }),
      helper.display({
        id: "broken",
        header: "Broken Image",
        size: 200,
        padding: [4, 8],
        cell: (info) => (
          <Image
            src="https://invalid.example.com/no-image.png"
            alt={`${info.row.original.name} (failed)`}
          />
        ),
      }),
    ],
    [],
  );

  return (
    <>
      <h1>Canvas: Image</h1>
      <p>
        <code>Image</code> draws images on canvas using <code>drawImage()</code>. Supports{" "}
        <code>src</code>, <code>alt</code>, <code>width</code>, <code>height</code>,{" "}
        <code>crossOrigin</code>, <code>referrerPolicy</code>, <code>decoding</code>,{" "}
        <code>fetchPriority</code>, and style props <code>objectFit</code>,{" "}
        <code>borderRadius</code>, <code>opacity</code>.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
        <div>
          <strong>objectFit:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {objectFitOptions.map((fit) => (
              <button
                key={fit}
                style={objectFit === fit ? btnActive : btnBase}
                onClick={() => setObjectFit(fit)}
              >
                {fit}
              </button>
            ))}
          </div>
        </div>

        <div>
          <strong>borderRadius:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {[0, 4, 8, 16, 50].map((r) => (
              <button
                key={r}
                style={borderRadius === r ? btnActive : btnBase}
                onClick={() => setBorderRadius(r)}
              >
                {r}px
              </button>
            ))}
          </div>
        </div>

        <div>
          <strong>opacity:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {[1, 0.8, 0.5, 0.3].map((o) => (
              <button
                key={o}
                style={opacity === o ? btnActive : btnBase}
                onClick={() => setOpacity(o)}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Image with Controls</h2>
          <Grid data={data} columns={columns} width={620} height={460} rowHeight={50} />
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Error Fallback (alt text)</h2>
          <p style={{ fontSize: 13, color: "#666", margin: "0 0 8px" }}>
            When an image fails to load, the <code>alt</code> text is rendered as placeholder.
          </p>
          <Grid data={data} columns={errorColumns} width={340} height={460} rowHeight={50} />
        </section>
      </div>

      <section style={{ marginBottom: 32, maxWidth: 620 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Supported Props</h2>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
          }}
        >
          <thead>
            <tr style={{ borderBottom: "2px solid #e0e0e0", textAlign: "left" }}>
              <th style={{ padding: "6px 8px" }}>Prop</th>
              <th style={{ padding: "6px 8px" }}>Type</th>
              <th style={{ padding: "6px 8px" }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["src", "string", "Image URL (required)"],
              ["alt", "string", "Fallback text on error"],
              ["width", "number", "Explicit width (px)"],
              ["height", "number", "Explicit height (px)"],
              ["crossOrigin", '"anonymous" | "use-credentials"', "CORS setting"],
              ["referrerPolicy", "ReferrerPolicy", "Referrer policy for fetch"],
              ["decoding", '"sync" | "async" | "auto"', "Decoding hint"],
              ["fetchPriority", '"high" | "low" | "auto"', "Fetch priority hint"],
              [
                "objectFit",
                '"fill" | "contain" | "cover" | "none" | "scale-down"',
                "Object-fit mode",
              ],
              ["borderRadius", "number", "Border radius (px)"],
              ["opacity", "number", "Opacity (0-1)"],
            ].map(([prop, type, desc]) => (
              <tr key={prop} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "6px 8px" }}>
                  <code>{prop}</code>
                </td>
                <td style={{ padding: "6px 8px", color: "#666" }}>
                  <code>{type}</code>
                </td>
                <td style={{ padding: "6px 8px" }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

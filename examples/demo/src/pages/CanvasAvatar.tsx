import { useState, useMemo } from "react";
import { Grid, createColumnHelper, Avatar } from "@ohah/react-wasm-table";
import { useDarkMode, LIGHT_THEME, DARK_THEME } from "../useDarkMode";

type Row = { name: string; avatar: string };

const helper = createColumnHelper<Row>();

const data: Row[] = [
  { name: "Alice Johnson", avatar: "https://i.pravatar.cc/80?u=alice" },
  { name: "Bob Smith", avatar: "https://i.pravatar.cc/80?u=bob" },
  { name: "Charlie Brown", avatar: "https://i.pravatar.cc/80?u=charlie" },
  { name: "Diana Prince", avatar: "https://i.pravatar.cc/80?u=diana" },
  { name: "Eve", avatar: "" },
];

const btnBase: React.CSSProperties = {
  padding: "4px 12px",
  border: "1px solid var(--demo-border-2)",
  borderRadius: 4,
  background: "var(--demo-card-bg)",
  color: "var(--demo-panel-fg)",
  cursor: "pointer",
  fontSize: 13,
};
const btnActive: React.CSSProperties = {
  ...btnBase,
  background: "#1976d2",
  color: "#fff",
  border: "1px solid #1976d2",
};

export function CanvasAvatar() {
  const isDark = useDarkMode();
  const [size, setSize] = useState(32);
  const [showBorder, setShowBorder] = useState(false);

  const columns = useMemo(
    () => [
      helper.accessor("name", { header: "Name", size: 140, padding: [0, 8] }),
      helper.accessor("name", {
        header: "Avatar (image)",
        size: 80,
        padding: [4, 8],
        cell: (info) => (
          <Avatar
            src={data[info.row.index]?.avatar}
            name={info.getValue()}
            size={size}
            borderWidth={showBorder ? 2 : 0}
            borderColor={showBorder ? "#3b82f6" : undefined}
          />
        ),
      }),
      helper.accessor("name", {
        header: "Avatar (initials)",
        size: 80,
        padding: [4, 8],
        cell: (info) => (
          <Avatar
            name={info.getValue()}
            size={size}
            backgroundColor="#6366f1"
            color="#fff"
            borderWidth={showBorder ? 2 : 0}
            borderColor={showBorder ? "#4338ca" : undefined}
          />
        ),
      }),
    ],
    [size, showBorder],
  );

  return (
    <>
      <h1>Canvas: Avatar</h1>
      <p>
        <code>Avatar</code> draws a circular image or initials fallback. Supports <code>src</code>,{" "}
        <code>name</code>, <code>size</code>, <code>backgroundColor</code>, <code>color</code>,{" "}
        <code>borderWidth</code>, <code>borderColor</code>.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
        <div>
          <strong>size:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {[24, 32, 40].map((s) => (
              <button key={s} style={size === s ? btnActive : btnBase} onClick={() => setSize(s)}>
                {s}px
              </button>
            ))}
          </div>
        </div>
        <div>
          <strong>border:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <button
              style={showBorder ? btnActive : btnBase}
              onClick={() => setShowBorder(!showBorder)}
            >
              {showBorder ? "On" : "Off"}
            </button>
          </div>
        </div>
      </div>

      <Grid data={data} columns={columns} width={400} height={260} rowHeight={48} theme={isDark ? DARK_THEME : LIGHT_THEME} />
    </>
  );
}

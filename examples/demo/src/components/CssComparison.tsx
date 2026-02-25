import type { CSSProperties } from "react";

export interface CssColumnDef {
  id: string;
  header: string;
  width?: number;
  align?: "left" | "center" | "right";
  cellStyle?: CSSProperties;
}

interface Props {
  data: Record<string, unknown>[];
  columns: CssColumnDef[];
  width: number;
  height: number;
  rowHeight?: number;
  rowStyle?: CSSProperties;
  containerStyle?: CSSProperties;
}

const alignToJustify = (align?: string) =>
  align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start";

export function CssComparison({
  data,
  columns,
  width,
  height,
  rowHeight = 32,
  rowStyle = {},
  containerStyle = {},
}: Props) {
  const isGrid = rowStyle.display === "grid";
  const baseRowStyle: CSSProperties = {
    display: isGrid ? "grid" : "flex",
    boxSizing: "border-box",
    ...rowStyle,
  };

  const cellBase = (col: CssColumnDef): CSSProperties => ({
    ...(col.width && !isGrid ? { width: col.width, minWidth: col.width } : {}),
    textAlign: col.align || "left",
    padding: "0 8px",
    color: "#333",
    display: "flex",
    alignItems: "center",
    justifyContent: alignToJustify(col.align),
    borderRight: "0.5px solid #e0e0e0",
    boxSizing: "border-box",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    ...col.cellStyle,
  });

  return (
    <div
      style={{
        width,
        height,
        overflow: "auto",
        fontFamily: "system-ui, sans-serif",
        fontSize: 13,
        color: "#333",
        boxSizing: "border-box",
        ...containerStyle,
      }}
    >
      <div
        style={{
          ...baseRowStyle,
          height: rowHeight,
          minHeight: rowHeight,
          borderBottom: "1px solid #e0e0e0",
          backgroundColor: "#f5f5f5",
          color: "#333",
          fontWeight: 600,
        }}
      >
        {columns.map((col) => (
          <div key={col.id} style={cellBase(col)}>
            {col.header}
          </div>
        ))}
      </div>
      {data.map((row, i) => (
        <div
          key={i}
          style={{
            ...baseRowStyle,
            height: rowHeight,
            minHeight: rowHeight,
            borderBottom: "0.5px solid #e0e0e0",
            backgroundColor: i % 2 === 0 ? "#fff" : "rgba(255,255,255,0.96)",
          }}
        >
          {columns.map((col) => (
            <div key={col.id} style={cellBase(col)}>
              {String(row[col.id] ?? "")}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

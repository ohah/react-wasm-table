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
  headerHeight?: number;
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
  rowHeight = 36,
  headerHeight = 40,
  rowStyle = {},
  containerStyle = {},
}: Props) {
  const isGrid = rowStyle.display === "grid";
  const baseRowStyle: CSSProperties = {
    display: isGrid ? "grid" : "flex",
    boxSizing: "border-box",
    ...rowStyle,
  };

  const cellBase = (col: CssColumnDef, colIdx: number): CSSProperties => ({
    ...(col.width && !isGrid ? { width: col.width, minWidth: col.width } : {}),
    textAlign: col.align || "left",
    padding: "0 8px",
    color: "#333",
    display: "flex",
    alignItems: "center",
    justifyContent: alignToJustify(col.align),
    borderRight: "0.5px solid #000",
    ...(colIdx === 0 ? { borderLeft: "0.5px solid #000" } : {}),
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
          height: headerHeight,
          minHeight: headerHeight,
          borderTop: "0.5px solid #000",
          borderBottom: "0.5px solid #000",
          backgroundColor: "#f5f5f5",
          color: "#333",
          fontWeight: 600,
        }}
      >
        {columns.map((col, i) => (
          <div key={col.id} style={cellBase(col, i)}>
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
            borderBottom: "0.5px solid #000",
            backgroundColor: i % 2 === 0 ? "#fff" : "rgba(255,255,255,0.96)",
          }}
        >
          {columns.map((col, colIdx) => (
            <div key={col.id} style={cellBase(col, colIdx)}>
              {String(row[col.id] ?? "")}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import {
  ColumnRegistry,
  type ColumnProps,
  type GridProps,
  type CssRect,
  type CssLength,
  type CssLengthAuto,
  type CssDimension,
  type CssGridLine,
} from "@ohah/react-wasm-table";

// ── Context ─────────────────────────────────────────────────────────

const CssGridContext = createContext<ColumnRegistry | null>(null);

function useCssGridRegistry(): ColumnRegistry {
  const ctx = useContext(CssGridContext);
  if (!ctx) throw new Error("CssColumn must be used within <CssGrid>");
  return ctx;
}

// ── CSS value converters ────────────────────────────────────────────

function cssVal(v: number | string | undefined): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v === "number") return `${v}px`;
  return v; // "auto", "50%", etc.
}

function cssRect<T extends number | string>(
  shorthand: CssRect<T> | undefined,
  top?: T,
  right?: T,
  bottom?: T,
  left?: T,
): string | undefined {
  let t = cssVal(top);
  let r = cssVal(right);
  let b = cssVal(bottom);
  let l = cssVal(left);

  if (shorthand !== undefined) {
    if (Array.isArray(shorthand)) {
      if (shorthand.length === 2) {
        const [vert, horiz] = shorthand as [T, T];
        t = t ?? cssVal(vert);
        r = r ?? cssVal(horiz);
        b = b ?? cssVal(vert);
        l = l ?? cssVal(horiz);
      } else if (shorthand.length === 3) {
        const [tVal, hVal, bVal] = shorthand as [T, T, T];
        t = t ?? cssVal(tVal);
        r = r ?? cssVal(hVal);
        b = b ?? cssVal(bVal);
        l = l ?? cssVal(hVal);
      } else if (shorthand.length === 4) {
        const [tVal, rVal, bVal, lVal] = shorthand as [T, T, T, T];
        t = t ?? cssVal(tVal);
        r = r ?? cssVal(rVal);
        b = b ?? cssVal(bVal);
        l = l ?? cssVal(lVal);
      }
    } else {
      const all = cssVal(shorthand as T);
      t = t ?? all;
      r = r ?? all;
      b = b ?? all;
      l = l ?? all;
    }
  }

  if (!t && !r && !b && !l) return undefined;
  return `${t ?? "0px"} ${r ?? "0px"} ${b ?? "0px"} ${l ?? "0px"}`;
}

function cssGridLine(v: CssGridLine | undefined): string | undefined {
  if (v === undefined) return undefined;
  if (Array.isArray(v)) return `${v[0]} / ${v[1]}`;
  if (typeof v === "number") return String(v);
  return v;
}

// ── CssColumn ───────────────────────────────────────────────────────

export function CssColumn(props: ColumnProps): null {
  const registry = useCssGridRegistry();
  const {
    id,
    width,
    minWidth,
    maxWidth,
    flexGrow,
    flexShrink,
    flexBasis,
    height: h,
    minHeight,
    maxHeight,
    alignSelf,
    position,
    inset,
    insetTop,
    insetRight,
    insetBottom,
    insetLeft,
    gridRow,
    gridColumn,
    justifySelf,
    header,
    align,
    padding: pad,
    paddingTop: padT,
    paddingRight: padR,
    paddingBottom: padB,
    paddingLeft: padL,
    margin: mar,
    marginTop: marT,
    marginRight: marR,
    marginBottom: marB,
    marginLeft: marL,
    boxSizing,
    aspectRatio,
  } = props;

  useEffect(() => {
    registry.register(id, props);
    return () => {
      registry.unregister(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    registry,
    id,
    width,
    minWidth,
    maxWidth,
    flexGrow,
    flexShrink,
    flexBasis,
    h,
    minHeight,
    maxHeight,
    alignSelf,
    position,
    inset,
    insetTop,
    insetRight,
    insetBottom,
    insetLeft,
    gridRow,
    gridColumn,
    justifySelf,
    header,
    align,
    pad,
    padT,
    padR,
    padB,
    padL,
    mar,
    marT,
    marR,
    marB,
    marL,
    boxSizing,
    aspectRatio,
  ]);

  return null;
}

// ── CssGrid ─────────────────────────────────────────────────────────

type CssGridProps = Omit<GridProps, "theme" | "columns" | "engineRef" | "scrollbarWidth">;

const DEFAULT_ROW_HEIGHT = 36;
const DEFAULT_HEADER_HEIGHT = 40;

const alignToJustify = (align?: string) =>
  align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start";

export function CssGrid({
  data,
  width,
  height,
  rowHeight = DEFAULT_ROW_HEIGHT,
  headerHeight = DEFAULT_HEADER_HEIGHT,
  children,
  // Container flex/grid props
  display,
  flexDirection,
  flexWrap,
  gap,
  rowGap,
  columnGap,
  alignItems,
  alignContent,
  justifyContent,
  overflowX,
  overflowY,
  // Grid container props
  gridTemplateRows,
  gridTemplateColumns,
  gridAutoRows,
  gridAutoColumns,
  gridAutoFlow,
  justifyItems,
  // Box model
  padding,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  margin,
  marginTop,
  marginRight,
  marginBottom,
  marginLeft,
}: CssGridProps) {
  const registry = useMemo(() => new ColumnRegistry(), []);
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = registry.onChange(() => setTick((t) => t + 1));
    // Children's effects may have already registered columns before this effect ran
    // (React fires children effects before parent effects)
    if (registry.size > 0) setTick((t) => t + 1);
    return unsub;
  }, [registry]);

  const columns = registry.getAll();
  const isGrid = display === "grid";

  // ── Row style (applied to header + each data row) ───────────────
  const rowStyle: CSSProperties = {
    display: isGrid ? "grid" : "flex",
    boxSizing: "border-box",
    position: "relative", // Taffy default is "relative" (CSS default is "static")
    ...(flexDirection ? { flexDirection } : {}),
    ...(flexWrap ? { flexWrap } : {}),
    ...(gap !== undefined ? { gap: cssVal(gap) } : {}),
    ...(rowGap !== undefined ? { rowGap: cssVal(rowGap) } : {}),
    ...(columnGap !== undefined ? { columnGap: cssVal(columnGap) } : {}),
    ...(alignItems ? { alignItems } : {}),
    ...(alignContent ? { alignContent } : {}),
    ...(justifyContent ? { justifyContent } : {}),
    ...(justifyItems ? { justifyItems } : {}),
    ...(gridTemplateColumns ? { gridTemplateColumns: String(gridTemplateColumns) } : {}),
    ...(gridTemplateRows ? { gridTemplateRows: String(gridTemplateRows) } : {}),
    ...(gridAutoFlow ? { gridAutoFlow } : {}),
    ...(gridAutoRows ? { gridAutoRows: String(gridAutoRows) } : {}),
    ...(gridAutoColumns ? { gridAutoColumns: String(gridAutoColumns) } : {}),
  };

  // ── Container style ─────────────────────────────────────────────
  const containerPadding = cssRect(padding, paddingTop, paddingRight, paddingBottom, paddingLeft);
  const containerMargin = cssRect(
    margin as CssRect<CssLengthAuto> | undefined,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
  );
  const containerStyle: CSSProperties = {
    width,
    height,
    overflow: "auto",
    fontFamily: "system-ui, sans-serif",
    fontSize: 13,
    color: "#333",
    boxSizing: "border-box",
    ...(containerPadding ? { padding: containerPadding } : {}),
    ...(containerMargin ? { margin: containerMargin } : {}),
    ...(overflowX ? { overflowX } : {}),
    ...(overflowY ? { overflowY } : {}),
  };

  // ── Cell style builder ──────────────────────────────────────────
  const cellStyle = (col: ColumnProps, colIdx: number): CSSProperties => {
    const cellPadding = cssRect(
      col.padding as CssRect<CssLength> | undefined,
      col.paddingTop as CssLength | undefined,
      col.paddingRight as CssLength | undefined,
      col.paddingBottom as CssLength | undefined,
      col.paddingLeft as CssLength | undefined,
    );
    const cellMargin = cssRect(
      col.margin as CssRect<CssLengthAuto> | undefined,
      col.marginTop as CssLengthAuto | undefined,
      col.marginRight as CssLengthAuto | undefined,
      col.marginBottom as CssLengthAuto | undefined,
      col.marginLeft as CssLengthAuto | undefined,
    );

    return {
      // Width (in flex mode, set both width and minWidth)
      ...(col.width !== undefined && !isGrid
        ? { width: cssVal(col.width as CssDimension), minWidth: cssVal(col.width as CssDimension) }
        : {}),
      ...(col.minWidth !== undefined ? { minWidth: cssVal(col.minWidth as CssDimension) } : {}),
      ...(col.maxWidth !== undefined ? { maxWidth: cssVal(col.maxWidth as CssDimension) } : {}),
      // Flex child props
      ...(col.flexGrow !== undefined ? { flexGrow: col.flexGrow } : {}),
      ...(col.flexShrink !== undefined ? { flexShrink: col.flexShrink } : {}),
      ...(col.flexBasis !== undefined ? { flexBasis: cssVal(col.flexBasis as CssDimension) } : {}),
      ...(col.alignSelf ? { alignSelf: col.alignSelf } : {}),
      ...(col.justifySelf ? { justifySelf: col.justifySelf } : {}),
      // Box model
      ...(cellPadding ? { padding: cellPadding } : { padding: "0 8px" }),
      ...(cellMargin ? { margin: cellMargin } : {}),
      ...(col.boxSizing ? { boxSizing: col.boxSizing } : {}),
      // Position
      ...(col.position ? { position: col.position } : {}),
      ...(col.insetTop !== undefined ? { top: cssVal(col.insetTop as CssLengthAuto) } : {}),
      ...(col.insetRight !== undefined ? { right: cssVal(col.insetRight as CssLengthAuto) } : {}),
      ...(col.insetBottom !== undefined
        ? { bottom: cssVal(col.insetBottom as CssLengthAuto) }
        : {}),
      ...(col.insetLeft !== undefined ? { left: cssVal(col.insetLeft as CssLengthAuto) } : {}),
      // Grid child
      ...(col.gridRow ? { gridRow: cssGridLine(col.gridRow) } : {}),
      ...(col.gridColumn ? { gridColumn: cssGridLine(col.gridColumn) } : {}),
      // Text alignment and visual
      textAlign: col.align || "left",
      color: "#333",
      display: "flex",
      alignItems: "center",
      justifyContent: alignToJustify(col.align),
      borderRight: "0.5px solid #000",
      ...(colIdx === 0 ? { borderLeft: "0.5px solid #000" } : {}),
      boxSizing: col.boxSizing || "border-box",
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
    };
  };

  return (
    <CssGridContext.Provider value={registry}>
      {children}
      <div style={containerStyle}>
        {/* Header row */}
        <div
          style={{
            ...rowStyle,
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
            <div key={col.id} style={cellStyle(col, i)}>
              {col.header ?? col.id}
            </div>
          ))}
        </div>
        {/* Data rows */}
        {data.map((row, rowIdx) => (
          <div
            key={rowIdx}
            style={{
              ...rowStyle,
              height: rowHeight,
              minHeight: rowHeight,
              borderBottom: "0.5px solid #000",
              backgroundColor: rowIdx % 2 === 0 ? "#fff" : "rgba(255,255,255,0.96)",
            }}
          >
            {columns.map((col, colIdx) => (
              <div key={col.id} style={cellStyle(col, colIdx)}>
                {String(row[col.id] ?? "")}
              </div>
            ))}
          </div>
        ))}
      </div>
    </CssGridContext.Provider>
  );
}

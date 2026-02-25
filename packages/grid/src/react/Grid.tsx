import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import type {
  GridProps,
  WasmTableEngine,
  Theme,
  CellLayout,
  CssRect,
  CssLength,
  CssLengthAuto,
  CssDimension,
  CssGridLine,
} from "../types";
import { DEFAULT_THEME } from "../types";
import { ColumnRegistry } from "../adapter/column-registry";
import { InstructionBuilder } from "../adapter/instruction-builder";
import { EventManager } from "../adapter/event-manager";
import { EditorManager } from "../adapter/editor-manager";
import { CanvasRenderer } from "../renderer/canvas-renderer";
import { GridContext, WasmContext } from "./context";
import { initWasm, createTableEngine, getWasmMemory } from "../wasm-loader";
import {
  readCellRow,
  readCellCol,
  readCellX,
  readCellY,
  readCellWidth,
  readCellHeight,
  readCellAlign,
} from "../adapter/layout-reader";
import { MemoryBridge } from "../adapter/memory-bridge";
import { StringTable } from "../adapter/string-table";
import { ingestData } from "../adapter/data-ingestor";

const DEFAULT_ROW_HEIGHT = 36;
const DEFAULT_HEADER_HEIGHT = 40;
const OVERSCAN = 5;

// ── CSS value conversion utilities ──────────────────────────────────

/** Convert CssDimension to WASM-compatible value (number | string). */
function resolveDimension(v: CssDimension | undefined): number | string | undefined {
  if (v === undefined) return undefined;
  if (typeof v === "number") return v;
  return v; // "auto" or "50%" pass through as string
}

/** Convert CssLength to WASM-compatible value (number | string). */
function resolveLength(v: CssLength | undefined): number | string | undefined {
  if (v === undefined) return undefined;
  if (typeof v === "number") return v;
  return v; // "50%" passes through
}

/** Convert CssLengthAuto to WASM-compatible value. */
function resolveLengthAuto(v: CssLengthAuto | undefined): number | string | undefined {
  if (v === undefined) return undefined;
  if (typeof v === "number") return v;
  return v; // "auto" or "50%"
}

/** Resolve CSS rect shorthand to {top, right, bottom, left}. */
function resolveRect<T>(
  shorthand: CssRect<T> | undefined,
  top?: T,
  right?: T,
  bottom?: T,
  left?: T,
  resolver: (v: T | undefined) => number | string | undefined = (v) =>
    v as unknown as number | string | undefined,
):
  | {
      top?: number | string;
      right?: number | string;
      bottom?: number | string;
      left?: number | string;
    }
  | undefined {
  let t = resolver(top);
  let r = resolver(right);
  let b = resolver(bottom);
  let l = resolver(left);

  if (shorthand !== undefined) {
    if (Array.isArray(shorthand)) {
      if (shorthand.length === 2) {
        const [vert, horiz] = shorthand as [T, T];
        t = t ?? resolver(vert);
        r = r ?? resolver(horiz);
        b = b ?? resolver(vert);
        l = l ?? resolver(horiz);
      } else if (shorthand.length === 3) {
        const [tVal, hVal, bVal] = shorthand as [T, T, T];
        t = t ?? resolver(tVal);
        r = r ?? resolver(hVal);
        b = b ?? resolver(bVal);
        l = l ?? resolver(hVal);
      } else if (shorthand.length === 4) {
        const [tVal, rVal, bVal, lVal] = shorthand as [T, T, T, T];
        t = t ?? resolver(tVal);
        r = r ?? resolver(rVal);
        b = b ?? resolver(bVal);
        l = l ?? resolver(lVal);
      }
    } else {
      const all = resolver(shorthand as T);
      t = t ?? all;
      r = r ?? all;
      b = b ?? all;
      l = l ?? all;
    }
  }

  if (t === undefined && r === undefined && b === undefined && l === undefined) return undefined;
  return { top: t, right: r, bottom: b, left: l };
}

/** Build padding/margin/border rect from BoxModelProps. */
function buildLengthRect(
  shorthand: CssRect<CssLength> | undefined,
  top?: CssLength,
  right?: CssLength,
  bottom?: CssLength,
  left?: CssLength,
) {
  return resolveRect(shorthand, top, right, bottom, left, resolveLength);
}

function buildLengthAutoRect(
  shorthand: CssRect<CssLengthAuto> | undefined,
  top?: CssLengthAuto,
  right?: CssLengthAuto,
  bottom?: CssLengthAuto,
  left?: CssLengthAuto,
) {
  return resolveRect(shorthand, top, right, bottom, left, resolveLengthAuto);
}

/** Resolve CssGridLine to WASM-compatible format. */
function resolveGridLine(
  v: CssGridLine | undefined,
): number | string | [number | string, number | string] | undefined {
  if (v === undefined) return undefined;
  if (Array.isArray(v)) return v;
  return v; // number or string pass through
}

/**
 * Canvas-based grid component.
 * Renders a <canvas> element for data display and a <div> overlay for editors.
 * Initializes WASM internally — no external WasmProvider needed.
 */
export function Grid({
  data,
  width,
  height,
  rowHeight = DEFAULT_ROW_HEIGHT,
  headerHeight = DEFAULT_HEADER_HEIGHT,
  theme: themeOverrides,
  columns: columnsProp,
  children,
  // Container flex props
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
  scrollbarWidth,
  // Grid container props
  gridTemplateRows,
  gridTemplateColumns,
  gridAutoRows,
  gridAutoColumns,
  gridAutoFlow,
  justifyItems,
  // Box model props
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
  borderWidth,
  borderTopWidth,
  borderRightWidth,
  borderBottomWidth,
  borderLeftWidth,
  engineRef,
}: GridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const columnRegistry = useMemo(() => new ColumnRegistry(), []);
  const [engine, setEngine] = useState<WasmTableEngine | null>(null);

  const theme: Theme = useMemo(() => ({ ...DEFAULT_THEME, ...themeOverrides }), [themeOverrides]);

  // Sync object-based columns prop → ColumnRegistry
  useEffect(() => {
    if (!columnsProp) return;
    // Convert ColumnDef[] → ColumnProps[] (render → children)
    const asProps = columnsProp.map(({ render, ...rest }): import("../types").ColumnProps => ({
      ...rest,
      ...(render ? { children: render } : {}),
    }));
    columnRegistry.setAll(asProps);
  }, [columnsProp, columnRegistry]);

  // Refs for render loop — avoid React re-renders on scroll
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const instructionBuilderRef = useRef(new InstructionBuilder());
  const eventManagerRef = useRef(new EventManager());
  const editorManagerRef = useRef(new EditorManager());
  const scrollTopRef = useRef(0);
  const dirtyRef = useRef(true);
  const rafRef = useRef<number>(0);
  const sortStateRef = useRef<{ columnId: string; direction: "asc" | "desc" } | null>(null);
  const headerLayoutsRef = useRef<CellLayout[]>([]);
  const rowLayoutsRef = useRef<CellLayout[]>([]);
  // Buffer-based layout refs
  const layoutBufRef = useRef<Float32Array | null>(null);
  const headerCountRef = useRef(0);
  const totalCellCountRef = useRef(0);
  const memoryBridgeRef = useRef<MemoryBridge | null>(null);
  const stringTableRef = useRef(new StringTable());

  // Initialize WASM engine
  useEffect(() => {
    let cancelled = false;
    initWasm().then(() => {
      if (!cancelled) {
        const eng = createTableEngine();
        setEngine(eng);
        if (engineRef) {
          engineRef.current = eng;
        }
        if (typeof window !== "undefined" && import.meta.env?.DEV) {
          Object.defineProperty(window, "__engine", {
            value: eng,
            writable: true,
            configurable: true,
          });
          eng.enableDebugLog?.();
        }
        const mem = getWasmMemory();
        if (mem) {
          memoryBridgeRef.current = new MemoryBridge(eng, mem);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [engineRef]);

  // Attach canvas renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new CanvasRenderer();
    renderer.attach(canvas);
    rendererRef.current = renderer;
  }, []);

  // Set editor container
  useEffect(() => {
    if (editorRef.current) {
      editorManagerRef.current.setContainer(editorRef.current);
    }
  }, []);

  // Ingest data via columnar TypedArray path (serde bypass)
  useEffect(() => {
    if (!engine) return;
    const columns = columnRegistry.getAll();
    if (columns.length === 0) return;

    const columnIds = columns.map((c) => c.id);

    // Columnar ingestion: Object[] → typed arrays → WASM (no serde for numerics)
    ingestData(engine, data, columnIds);
    engine.setColumnarScrollConfig(rowHeight, height - headerHeight, OVERSCAN);

    // Populate JS-side string table for display
    stringTableRef.current.populate(data, columnIds);

    dirtyRef.current = true;
  }, [engine, data, columnRegistry, rowHeight, height, headerHeight]);

  // Mark dirty when columns change
  useEffect(() => {
    return columnRegistry.onChange(() => {
      dirtyRef.current = true;
    });
  }, [columnRegistry]);

  // Header click sort handler
  const handleHeaderClick = useCallback(
    (colIndex: number) => {
      if (!engine) return;
      const columns = columnRegistry.getAll();
      const col = columns[colIndex];
      if (!col?.sortable) return;

      const current = sortStateRef.current;
      let next: typeof current;

      if (current?.columnId === col.id) {
        if (current.direction === "asc") {
          next = { columnId: col.id, direction: "desc" };
        } else {
          next = null; // remove sort
        }
      } else {
        next = { columnId: col.id, direction: "asc" };
      }

      sortStateRef.current = next;

      if (next) {
        engine.setColumnarSort([
          {
            columnIndex: colIndex,
            direction: next.direction === "desc" ? "desc" : "asc",
          },
        ]);
      } else {
        engine.setColumnarSort([]);
      }
      dirtyRef.current = true;
    },
    [engine, columnRegistry],
  );

  // Cell double-click → editor
  const handleCellDoubleClick = useCallback(
    (coord: { row: number; col: number }) => {
      const columns = columnRegistry.getAll();
      const col = columns[coord.col];
      if (!col?.editor) return;

      // Find the matching cell layout from buffer
      const buf = layoutBufRef.current;
      let layout: CellLayout | undefined;
      if (buf) {
        const hc = headerCountRef.current;
        const tc = totalCellCountRef.current;
        for (let i = hc; i < tc; i++) {
          if (readCellRow(buf, i) === coord.row && readCellCol(buf, i) === coord.col) {
            layout = {
              row: coord.row,
              col: coord.col,
              x: readCellX(buf, i),
              y: readCellY(buf, i),
              width: readCellWidth(buf, i),
              height: readCellHeight(buf, i),
              contentAlign: readCellAlign(buf, i),
            };
            break;
          }
        }
      }
      if (!layout) return;

      const rowData = data[coord.row];
      if (!rowData) return;
      const currentValue = rowData[col.id];

      editorManagerRef.current.open(coord, layout, col.editor, currentValue);
    },
    [columnRegistry, data],
  );

  // Attach event manager
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const em = eventManagerRef.current;
    em.attach(canvas, {
      onHeaderClick: handleHeaderClick,
      onCellClick: () => {
        // Close any open editor on click elsewhere
        if (editorManagerRef.current.isEditing) {
          editorManagerRef.current.cancel();
        }
      },
      onCellDoubleClick: handleCellDoubleClick,
      onScroll: (deltaY: number) => {
        const maxScroll = Math.max(0, data.length * rowHeight - (height - headerHeight));
        scrollTopRef.current = Math.max(0, Math.min(maxScroll, scrollTopRef.current + deltaY));
        dirtyRef.current = true;
      },
    });

    return () => {
      em.detach();
    };
  }, [handleHeaderClick, handleCellDoubleClick, rowHeight, data.length, headerHeight, height]);

  // Render loop — unified hot path (single WASM call per frame)
  useEffect(() => {
    if (!engine) return;
    const renderer = rendererRef.current;
    if (!renderer) return;
    const builder = instructionBuilderRef.current;
    const bridge = memoryBridgeRef.current;
    const strTable = stringTableRef.current;
    if (!bridge) return;

    // Mark dirty when effect deps change (layout props changed)
    dirtyRef.current = true;

    const loop = () => {
      if (dirtyRef.current) {
        dirtyRef.current = false;

        const columns = columnRegistry.getAll();
        if (columns.length === 0) {
          renderer.clear();
          rafRef.current = requestAnimationFrame(loop);
          return;
        }

        const viewport = {
          width,
          height,
          rowHeight,
          headerHeight,
          scrollTop: scrollTopRef.current,
        };

        const isGrid = display === "grid";
        const colLayouts = columns.map((col) => ({
          width:
            typeof col.width === "number"
              ? col.width
              : col.width === undefined
                ? isGrid
                  ? 0
                  : 100
                : 0,
          flexGrow: col.flexGrow ?? 0,
          flexShrink: col.flexShrink ?? 0,
          minWidth: typeof col.minWidth === "number" ? col.minWidth : undefined,
          maxWidth: typeof col.maxWidth === "number" ? col.maxWidth : undefined,
          align: col.align ?? "left",
          flexBasis: resolveDimension(col.flexBasis),
          height: resolveDimension(col.height),
          minHeight: resolveDimension(col.minHeight),
          maxHeight: resolveDimension(col.maxHeight),
          alignSelf: col.alignSelf,
          padding: buildLengthRect(
            col.padding,
            col.paddingTop,
            col.paddingRight,
            col.paddingBottom,
            col.paddingLeft,
          ),
          margin: buildLengthAutoRect(
            col.margin,
            col.marginTop,
            col.marginRight,
            col.marginBottom,
            col.marginLeft,
          ),
          border: buildLengthRect(
            col.borderWidth,
            col.borderTopWidth,
            col.borderRightWidth,
            col.borderBottomWidth,
            col.borderLeftWidth,
          ),
          boxSizing: col.boxSizing,
          aspectRatio: col.aspectRatio,
          position: col.position,
          inset: buildLengthAutoRect(
            col.inset,
            col.insetTop,
            col.insetRight,
            col.insetBottom,
            col.insetLeft,
          ),
          gridRow: resolveGridLine(col.gridRow),
          gridColumn: resolveGridLine(col.gridColumn),
          justifySelf: col.justifySelf,
        }));

        const containerLayout = {
          display,
          flexDirection,
          flexWrap,
          gap: resolveLength(gap),
          rowGap: resolveLength(rowGap),
          columnGap: resolveLength(columnGap),
          alignItems,
          alignContent,
          justifyContent,
          overflowX,
          overflowY,
          scrollbarWidth,
          padding: buildLengthRect(padding, paddingTop, paddingRight, paddingBottom, paddingLeft),
          margin: buildLengthAutoRect(margin, marginTop, marginRight, marginBottom, marginLeft),
          border: buildLengthRect(
            borderWidth,
            borderTopWidth,
            borderRightWidth,
            borderBottomWidth,
            borderLeftWidth,
          ),
          gridTemplateRows,
          gridTemplateColumns,
          gridAutoRows,
          gridAutoColumns,
          gridAutoFlow,
          justifyItems,
        };

        const colCount = columns.length;

        // Single WASM call: rebuild view + virtual slice + layout buffer (columnar path)
        const meta = engine.updateViewportColumnar(
          scrollTopRef.current,
          viewport,
          colLayouts,
          containerLayout,
        );
        const cellCount = meta[0] ?? 0;
        const visStart = meta[1] ?? 0;
        const headerCount = colCount;
        const dataCount = cellCount - headerCount;

        // Zero-copy reads from WASM memory
        const layoutBuf = bridge.getLayoutBuffer();
        const viewIndices = bridge.getViewIndices();

        // Store refs for hit-testing and editor positioning
        layoutBufRef.current = layoutBuf;
        headerCountRef.current = headerCount;
        totalCellCountRef.current = cellCount;

        // Build CellLayout arrays for event manager
        const normalizedHeaders: CellLayout[] = [];
        for (let i = 0; i < headerCount; i++) {
          normalizedHeaders.push({
            row: readCellRow(layoutBuf, i),
            col: readCellCol(layoutBuf, i),
            x: readCellX(layoutBuf, i),
            y: readCellY(layoutBuf, i),
            width: readCellWidth(layoutBuf, i),
            height: readCellHeight(layoutBuf, i),
            contentAlign: readCellAlign(layoutBuf, i),
          });
        }
        const normalizedRows: CellLayout[] = [];
        for (let i = headerCount; i < cellCount; i++) {
          normalizedRows.push({
            row: readCellRow(layoutBuf, i),
            col: readCellCol(layoutBuf, i),
            x: readCellX(layoutBuf, i),
            y: readCellY(layoutBuf, i),
            width: readCellWidth(layoutBuf, i),
            height: readCellHeight(layoutBuf, i),
            contentAlign: readCellAlign(layoutBuf, i),
          });
        }

        headerLayoutsRef.current = normalizedHeaders;
        rowLayoutsRef.current = normalizedRows;
        eventManagerRef.current.setLayouts(normalizedHeaders, normalizedRows);

        // Prepare header labels
        const headers = columns.map((c) => c.header ?? c.id);
        const sortCol = sortStateRef.current;
        const headersWithSort = headers.map((h, i) => {
          const col = columns[i];
          if (sortCol && col?.id === sortCol.columnId) {
            return `${h} ${sortCol.direction === "asc" ? "\u25B2" : "\u25BC"}`;
          }
          return h;
        });

        // Draw
        renderer.clear();
        renderer.drawHeaderFromBuffer(layoutBuf, 0, headerCount, headersWithSort, theme);
        renderer.drawRowsFromBuffer(
          layoutBuf,
          headerCount,
          dataCount,
          (cellIdx: number) => {
            const col = columns[readCellCol(layoutBuf, cellIdx)];
            const rowViewIdx = readCellRow(layoutBuf, cellIdx) - visStart;
            const actualRow = viewIndices[rowViewIdx] ?? 0;
            // Use InstructionBuilder for custom renderers, direct JS read for plain text
            if (col?.children) {
              const value = data[actualRow]?.[col.id];
              return builder.build(col, value);
            }
            const text = strTable.get(readCellCol(layoutBuf, cellIdx), actualRow);
            return { type: "text" as const, value: text };
          },
          theme,
          headerHeight,
        );
        renderer.drawGridLinesFromBuffer(layoutBuf, headerCount, cellCount, theme, headerHeight);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [
    engine,
    columnRegistry,
    width,
    height,
    rowHeight,
    headerHeight,
    theme,
    data,
    // Container props
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
    scrollbarWidth,
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
    borderWidth,
    borderTopWidth,
    borderRightWidth,
    borderBottomWidth,
    borderLeftWidth,
    gridTemplateRows,
    gridTemplateColumns,
    gridAutoRows,
    gridAutoColumns,
    gridAutoFlow,
    justifyItems,
  ]);

  return (
    <GridContext.Provider value={{ columnRegistry }}>
      <WasmContext.Provider value={{ engine, isReady: engine !== null }}>
        <div
          style={{
            position: "relative",
            width,
            height,
            overflow: "hidden",
          }}
        >
          <canvas ref={canvasRef} width={width} height={height} style={{ display: "block" }} />
          <div
            ref={editorRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
          />
          {!columnsProp && children}
        </div>
      </WasmContext.Provider>
    </GridContext.Provider>
  );
}

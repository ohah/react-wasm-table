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
import type { SortingState } from "../tanstack-types";
import { resolveColumns } from "../resolve-columns";
import { ColumnRegistry } from "../adapter/column-registry";
import { InstructionBuilder } from "../adapter/instruction-builder";
import { EventManager } from "../adapter/event-manager";
import { EditorManager } from "../adapter/editor-manager";
import { SelectionManager, buildTSV } from "../adapter/selection-manager";
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
import { ScrollBar, syncScrollBarPosition } from "./ScrollBar";

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
  // TanStack-compatible sorting
  sorting: sortingProp,
  onSortingChange: onSortingChangeProp,
  // Selection (controlled/uncontrolled)
  enableSelection: enableSelectionProp = true,
  selection: selectionProp,
  onSelectionChange: onSelectionChangeProp,
  selectionStyle,
  onCopy: onCopyProp,
  onPaste: onPasteProp,
  initialState,
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
  const vScrollbarRef = useRef<HTMLDivElement>(null);
  const hScrollbarRef = useRef<HTMLDivElement>(null);

  const columnRegistry = useMemo(() => new ColumnRegistry(), []);
  const [engine, setEngine] = useState<WasmTableEngine | null>(null);

  const theme: Theme = useMemo(() => ({ ...DEFAULT_THEME, ...themeOverrides }), [themeOverrides]);

  // Sync columns prop → ColumnRegistry (TanStack GridColumnDef[])
  useEffect(() => {
    if (!columnsProp) return;
    const resolved = resolveColumns(columnsProp, data);
    columnRegistry.setAll(resolved);
  }, [columnsProp, columnRegistry, data]);

  // Refs for render loop — avoid React re-renders on scroll
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const instructionBuilderRef = useRef(new InstructionBuilder());
  const eventManagerRef = useRef(new EventManager());
  const editorManagerRef = useRef(new EditorManager());
  const scrollTopRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const dirtyRef = useRef(true);
  const rafRef = useRef<number>(0);
  // TanStack-compatible sorting state (uncontrolled internal state)
  const [internalSorting, setInternalSorting] = useState<SortingState>(initialState?.sorting ?? []);
  const sorting = sortingProp ?? internalSorting;
  const headerLayoutsRef = useRef<CellLayout[]>([]);
  const rowLayoutsRef = useRef<CellLayout[]>([]);
  // Buffer-based layout refs
  const layoutBufRef = useRef<Float32Array | null>(null);
  const headerCountRef = useRef(0);
  const totalCellCountRef = useRef(0);
  const memoryBridgeRef = useRef<MemoryBridge | null>(null);
  const stringTableRef = useRef(new StringTable());
  const selectionManagerRef = useRef(new SelectionManager());
  const selectionEnabledRef = useRef(enableSelectionProp);
  selectionEnabledRef.current = enableSelectionProp;
  const visStartRef = useRef(0);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoScrollDeltaRef = useRef({ dy: 0, dx: 0 });

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

  // Attach hidden textarea for clipboard + selection change notification
  useEffect(() => {
    const container = canvasRef.current?.parentElement;
    if (!container) return;
    const sm = selectionManagerRef.current;
    sm.setOnDirty(() => {
      dirtyRef.current = true;
      if (selectionEnabledRef.current) {
        onSelectionChangeProp?.(sm.getNormalized());
      }
    });
    sm.attachClipboard(container);
    return () => sm.detachClipboard();
  }, [onSelectionChangeProp]);

  // Sync controlled selection prop → SelectionManager
  useEffect(() => {
    if (selectionProp === undefined) return; // uncontrolled
    const sm = selectionManagerRef.current;
    if (selectionProp === null) {
      sm.clear();
    } else {
      sm.setRange({
        startRow: selectionProp.minRow,
        startCol: selectionProp.minCol,
        endRow: selectionProp.maxRow,
        endCol: selectionProp.maxCol,
      });
    }
  }, [selectionProp]);

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

  // Header click sort handler (TanStack-compatible)
  const handleHeaderClick = useCallback(
    (colIndex: number) => {
      if (!engine) return;
      const columns = columnRegistry.getAll();
      const col = columns[colIndex];
      if (!col?.sortable) return;

      const existing = sorting.find((s) => s.id === col.id);
      let next: SortingState;
      if (!existing) {
        next = [{ id: col.id, desc: false }];
      } else if (!existing.desc) {
        next = [{ id: col.id, desc: true }];
      } else {
        next = [];
      }
      if (onSortingChangeProp) {
        onSortingChangeProp(next);
      } else {
        setInternalSorting(next);
      }
      // Apply to WASM engine
      if (next.length > 0) {
        engine.setColumnarSort(
          next.map((s) => ({
            columnIndex: columns.findIndex((c) => c.id === s.id),
            direction: s.desc ? "desc" : "asc",
          })),
        );
      } else {
        engine.setColumnarSort([]);
      }
      dirtyRef.current = true;
    },
    [engine, columnRegistry, sorting, onSortingChangeProp],
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
      selectionManagerRef.current.clear();
    },
    [columnRegistry, data],
  );

  // Attach event manager
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const em = eventManagerRef.current;
    em.attach(
      canvas,
      {
        onHeaderClick: handleHeaderClick,
        onCellClick: () => {
          // Close any open editor on click elsewhere
          if (editorManagerRef.current.isEditing) {
            editorManagerRef.current.cancel();
          }
        },
        onCellDoubleClick: handleCellDoubleClick,
        onCellMouseDown: (coord, shiftKey) => {
          if (editorManagerRef.current.isEditing) editorManagerRef.current.cancel();
          if (!selectionEnabledRef.current) return;
          const cols = columnRegistry.getAll();
          if (cols[coord.col]?.selectable === false) return;
          const sm = selectionManagerRef.current;
          if (shiftKey && sm.hasSelection) {
            sm.extendTo(coord.row, coord.col);
          } else {
            sm.start(coord.row, coord.col);
          }
        },
        onCellMouseMove: (coord) => {
          if (!selectionEnabledRef.current) return;
          const sm = selectionManagerRef.current;
          if (sm.isDragging) sm.extend(coord.row, coord.col);
        },
        onDragEdge: (dy, dx) => {
          autoScrollDeltaRef.current = { dy, dx };
          if (dy === 0 && dx === 0) {
            // Mouse moved away from edge — stop auto-scroll
            if (autoScrollRef.current) {
              clearInterval(autoScrollRef.current);
              autoScrollRef.current = null;
            }
            return;
          }
          if (!autoScrollRef.current) {
            autoScrollRef.current = setInterval(() => {
              const { dy: ady, dx: adx } = autoScrollDeltaRef.current;
              if (ady === 0 && adx === 0) return;
              const maxScrollY = Math.max(0, data.length * rowHeight - (height - headerHeight));
              scrollTopRef.current = Math.max(0, Math.min(maxScrollY, scrollTopRef.current + ady));
              const cols = columnRegistry.getAll();
              const totalColW = cols.reduce(
                (sum, c) => sum + (typeof c.width === "number" ? c.width : 100),
                0,
              );
              const maxScrollX = Math.max(0, totalColW - width);
              scrollLeftRef.current = Math.max(
                0,
                Math.min(maxScrollX, scrollLeftRef.current + adx),
              );
              dirtyRef.current = true;
            }, 16);
          }
        },
        onCellMouseUp: () => {
          selectionManagerRef.current.finish();
          if (autoScrollRef.current) {
            clearInterval(autoScrollRef.current);
            autoScrollRef.current = null;
          }
          autoScrollDeltaRef.current = { dy: 0, dx: 0 };
        },
        onKeyDown: (e) => {
          if (!selectionEnabledRef.current) return;
          const sm = selectionManagerRef.current;
          if ((e.ctrlKey || e.metaKey) && e.key === "c" && sm.hasSelection) {
            e.preventDefault();
            const norm = sm.getNormalized()!;
            const viewIndices = memoryBridgeRef.current?.getViewIndices();
            const strTable = stringTableRef.current;
            const getText = (viewRow: number, col: number) => {
              const actualRow = viewIndices?.[viewRow - visStartRef.current] ?? viewRow;
              return strTable.get(col, actualRow);
            };
            const tsv = buildTSV(norm, getText);
            const custom = onCopyProp?.(tsv, norm);
            sm.writeToClipboardText(typeof custom === "string" ? custom : tsv);
          }
          if ((e.ctrlKey || e.metaKey) && e.key === "v" && onPasteProp) {
            // Paste stub: read clipboard and delegate to onPaste callback
            // Full implementation is future work
          }
          if (e.key === "Escape") sm.clear();
        },
        onScroll: (deltaY: number, deltaX: number) => {
          const maxScrollY = Math.max(0, data.length * rowHeight - (height - headerHeight));
          scrollTopRef.current = Math.max(0, Math.min(maxScrollY, scrollTopRef.current + deltaY));
          const cols = columnRegistry.getAll();
          const totalColWidth = cols.reduce(
            (sum, c) => sum + (typeof c.width === "number" ? c.width : 100),
            0,
          );
          const maxScrollX = Math.max(0, totalColWidth - width);
          scrollLeftRef.current = Math.max(0, Math.min(maxScrollX, scrollLeftRef.current + deltaX));
          dirtyRef.current = true;
        },
      },
      { lineHeight: rowHeight, pageHeight: height - headerHeight },
    );

    return () => {
      em.detach();
    };
  }, [
    handleHeaderClick,
    handleCellDoubleClick,
    rowHeight,
    data.length,
    headerHeight,
    height,
    columnRegistry,
    width,
    onCopyProp,
    onPasteProp,
  ]);

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
          lineHeight: Math.ceil(theme.fontSize * 1.5),
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

        // Map "auto" → "scroll" for Taffy (no "auto" in Taffy)
        const taffyOverflowX = overflowX === "auto" ? "scroll" : overflowX;
        const taffyOverflowY = overflowY === "auto" ? "scroll" : overflowY;

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
          overflowX: taffyOverflowX,
          overflowY: taffyOverflowY,
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

        // Store visStart for selection clipboard row mapping
        visStartRef.current = visStart;

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
        eventManagerRef.current.setScrollOffset(scrollLeftRef.current);

        // During drag auto-scroll, re-hit-test at last mouse position to extend selection
        const sm = selectionManagerRef.current;
        if (enableSelectionProp && sm.isDragging) {
          const hit = eventManagerRef.current.hitTestAtLastPos();
          if (hit) {
            sm.extend(hit.row, hit.col);
          }
        }

        // Prepare header labels with sort indicators
        const headers = columns.map((c) => c.header ?? c.id);
        const headersWithSort = headers.map((h, i) => {
          const col = columns[i];
          const sortEntry = sorting.find((s) => s.id === col?.id);
          if (sortEntry) {
            return `${h} ${sortEntry.desc ? "\u25BC" : "\u25B2"}`;
          }
          return h;
        });

        // Draw — apply horizontal scroll via canvas translate
        renderer.clear();
        const ctx = renderer.context;
        const scrollLeft = scrollLeftRef.current;
        if (ctx && scrollLeft !== 0) {
          ctx.save();
          ctx.translate(-scrollLeft, 0);
        }
        renderer.drawHeaderFromBuffer(
          layoutBuf,
          0,
          headerCount,
          headersWithSort,
          theme,
          headerHeight,
        );
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
          rowHeight,
        );
        renderer.drawGridLinesFromBuffer(
          layoutBuf,
          headerCount,
          cellCount,
          theme,
          headerHeight,
          rowHeight,
        );
        // Draw selection highlight (topmost layer, inside scroll transform)
        if (enableSelectionProp) {
          const sel = selectionManagerRef.current.getNormalized();
          if (sel) {
            renderer.drawSelection(layoutBuf, headerCount, cellCount, sel, theme, selectionStyle);
          }
        }
        if (ctx && scrollLeft !== 0) {
          ctx.restore();
        }

        // Sync native scrollbar positions (canvas wheel → scrollbar DOM)
        syncScrollBarPosition(vScrollbarRef.current, scrollTopRef.current, "vertical");
        syncScrollBarPosition(hScrollbarRef.current, scrollLeftRef.current, "horizontal");
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
    // Sorting
    sorting,
    // Selection
    enableSelectionProp,
    selectionStyle,
  ]);

  // Scrollbar visibility
  const totalContentHeight = data.length * rowHeight + headerHeight;
  const needsVerticalScroll = totalContentHeight > height;

  const columns = columnRegistry.getAll();
  const totalContentWidth = columns.reduce(
    (sum, c) => sum + (typeof c.width === "number" ? c.width : 100),
    0,
  );
  const needsHorizontalScroll = totalContentWidth > width;

  const showVerticalScrollbar =
    overflowY === "scroll" ||
    (overflowY === "auto" && needsVerticalScroll) ||
    (overflowY === undefined && needsVerticalScroll);

  const showHorizontalScrollbar =
    overflowX === "scroll" ||
    (overflowX === "auto" && needsHorizontalScroll) ||
    (overflowX === undefined && needsHorizontalScroll);

  const handleVScrollChange = useCallback((pos: number) => {
    if (Math.abs(scrollTopRef.current - pos) < 0.5) return;
    scrollTopRef.current = pos;
    dirtyRef.current = true;
  }, []);

  const handleHScrollChange = useCallback((pos: number) => {
    if (Math.abs(scrollLeftRef.current - pos) < 0.5) return;
    scrollLeftRef.current = pos;
    dirtyRef.current = true;
  }, []);

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
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{ display: "block", touchAction: "none" }}
          />
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
          {showVerticalScrollbar && (
            <ScrollBar
              ref={vScrollbarRef}
              orientation="vertical"
              contentSize={totalContentHeight}
              viewportSize={height}
              onScrollChange={handleVScrollChange}
            />
          )}
          {showHorizontalScrollbar && (
            <ScrollBar
              ref={hScrollbarRef}
              orientation="horizontal"
              contentSize={totalContentWidth}
              viewportSize={width}
              onScrollChange={handleHScrollChange}
            />
          )}
          {!columnsProp && children}
        </div>
      </WasmContext.Provider>
    </GridContext.Provider>
  );
}

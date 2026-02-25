import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import type { GridProps, WasmTableEngine, Theme, CellLayout } from "../types";
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

const DEFAULT_ROW_HEIGHT = 36;
const DEFAULT_HEADER_HEIGHT = 40;
const OVERSCAN = 5;

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
  children,
}: GridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const columnRegistry = useMemo(() => new ColumnRegistry(), []);
  const [engine, setEngine] = useState<WasmTableEngine | null>(null);

  const theme: Theme = useMemo(() => ({ ...DEFAULT_THEME, ...themeOverrides }), [themeOverrides]);

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
        const mem = getWasmMemory();
        if (mem) {
          memoryBridgeRef.current = new MemoryBridge(eng, mem);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Convert data to row-major arrays and push to engine
  useEffect(() => {
    if (!engine) return;
    const columns = columnRegistry.getAll();
    if (columns.length === 0) return;

    // Set columns for the data store
    engine.setColumns(
      columns.map((col) => ({
        key: col.id,
        header: col.header ?? col.id,
        width: col.width ?? 100,
        sortable: col.sortable ?? false,
        filterable: false,
      })),
    );

    // Convert record data to row-major arrays
    const rowArrays = data.map((row) => columns.map((col) => row[col.id] ?? null));
    engine.setData(rowArrays);

    engine.setScrollConfig(rowHeight, height - headerHeight, OVERSCAN);

    // Populate JS-side string table (Phase 4)
    const columnIds = columns.map((c) => c.id);
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
        engine.setSort([
          {
            columnIndex: colIndex,
            direction: next.direction === "desc" ? "desc" : "asc",
          },
        ]);
      } else {
        engine.setSort([]);
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
  }, [handleHeaderClick, handleCellDoubleClick]);

  // Render loop — unified hot path (single WASM call per frame)
  useEffect(() => {
    if (!engine) return;
    const renderer = rendererRef.current;
    if (!renderer) return;
    const builder = instructionBuilderRef.current;
    const bridge = memoryBridgeRef.current;
    const strTable = stringTableRef.current;
    if (!bridge) return;

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

        const colLayouts = columns.map((col) => ({
          width: col.width ?? 100,
          flexGrow: col.flexGrow ?? 0,
          flexShrink: col.flexShrink ?? 0,
          minWidth: col.minWidth,
          maxWidth: col.maxWidth,
          align: col.align ?? "left",
        }));

        const colCount = columns.length;

        // Single WASM call: rebuild view + virtual slice + layout buffer
        const meta = engine.updateViewport(scrollTopRef.current, viewport, colLayouts);
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
            // Use InstructionBuilder for custom renderers, StringTable for plain text
            if (col?.children) {
              const value = engine.getCellValue(actualRow, readCellCol(layoutBuf, cellIdx));
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
  }, [engine, columnRegistry, width, height, rowHeight, headerHeight, theme, data]);

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
          {children}
        </div>
      </WasmContext.Provider>
    </GridContext.Provider>
  );
}

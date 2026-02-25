import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import type { GridProps, WasmTableEngine, Theme, CellLayout } from "../types";
import { DEFAULT_THEME } from "../types";
import { ColumnRegistry } from "../adapter/column-registry";
import { InstructionBuilder } from "../adapter/instruction-builder";
import { EventManager } from "../adapter/event-manager";
import { EditorManager } from "../adapter/editor-manager";
import { CanvasRenderer } from "../renderer/canvas-renderer";
import { GridContext, WasmContext } from "./context";
import { initWasm, createTableEngine } from "../wasm-loader";

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

  // Initialize WASM engine
  useEffect(() => {
    let cancelled = false;
    initWasm().then(() => {
      if (!cancelled) {
        setEngine(createTableEngine());
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

      // Find the matching cell layout
      const layout = rowLayoutsRef.current.find((l) => l.row === coord.row && l.col === coord.col);
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

  // Render loop
  useEffect(() => {
    if (!engine) return;
    const renderer = rendererRef.current;
    if (!renderer) return;
    const builder = instructionBuilderRef.current;

    const loop = () => {
      if (dirtyRef.current) {
        dirtyRef.current = false;

        const columns = columnRegistry.getAll();
        if (columns.length === 0) {
          renderer.clear();
          rafRef.current = requestAnimationFrame(loop);
          return;
        }

        // Query the WASM engine for visible rows
        const queryResult = engine.query(scrollTopRef.current) as {
          rows: unknown[][];
          total_count: number;
          filtered_count: number;
          virtual_slice: {
            start_index: number;
            end_index: number;
            offset_y: number;
            total_height: number;
            visible_count: number;
          };
        };

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

        // Compute layout via WASM
        const { start_index, end_index } = queryResult.virtual_slice;
        const allLayouts = engine.computeLayout(
          viewport,
          colLayouts,
          start_index,
          end_index,
        ) as CellLayout[];

        // Split: first `columns.length` entries are header, rest are data rows.
        // (Can't use row===0 because data row 0 also has row=0.)
        const colCount = columns.length;
        const headerLayouts = allLayouts.slice(0, colCount);
        const rowLayouts = allLayouts.slice(colCount);

        // Normalize snake_case from WASM to camelCase
        const normalize = (layouts: CellLayout[]) =>
          layouts.map((l) => ({
            ...l,
            contentAlign:
              (l as unknown as { content_align: string }).content_align === "Center"
                ? ("center" as const)
                : (l as unknown as { content_align: string }).content_align === "Right"
                  ? ("right" as const)
                  : ("left" as const),
          }));

        const normalizedHeaders = normalize(headerLayouts);
        const normalizedRows = normalize(rowLayouts);

        headerLayoutsRef.current = normalizedHeaders;
        rowLayoutsRef.current = normalizedRows;

        // Update event manager hit-test layouts
        eventManagerRef.current.setLayouts(normalizedHeaders, normalizedRows);

        // Build render instructions for each data cell
        const instructions = normalizedRows.map((layout) => {
          const col = columns[layout.col];
          // Find the row data from query results
          const rowOffset = layout.row - start_index;
          const rowData = queryResult.rows[rowOffset];
          const value = rowData ? rowData[layout.col] : undefined;
          return builder.build(col!, value);
        });

        // Draw
        renderer.clear();
        const headers = columns.map((c) => c.header ?? c.id);
        const sortCol = sortStateRef.current;
        const headersWithSort = headers.map((h, i) => {
          const col = columns[i];
          if (sortCol && col?.id === sortCol.columnId) {
            return `${h} ${sortCol.direction === "asc" ? "\u25B2" : "\u25BC"}`;
          }
          return h;
        });
        renderer.drawHeader(normalizedHeaders, headersWithSort, theme);
        renderer.drawRows(normalizedRows, instructions, theme, headerHeight);
        renderer.drawGridLines(normalizedHeaders, normalizedRows, theme, headerHeight);
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

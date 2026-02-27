import { useRef, useMemo, useEffect, useCallback } from "react";
import type { GridProps, Theme } from "../types";
import { DEFAULT_THEME } from "../types";
import { resolveColumns } from "../resolve-columns";
import { ColumnRegistry } from "../adapter/column-registry";
import { EventManager } from "../adapter/event-manager";
import { GridContext } from "./context";
import { ScrollBar } from "./ScrollBar";
import { useSorting } from "./hooks/use-sorting";
import { useWasmEngine } from "./hooks/use-wasm-engine";
import { useDataIngestion } from "./hooks/use-data-ingestion";
import { useSelection } from "./hooks/use-selection";
import { useEditing } from "./hooks/use-editing";
import { useGridScroll } from "./hooks/use-grid-scroll";
import { useEventAttachment } from "./hooks/use-event-attachment";
import { useRenderLoop } from "./hooks/use-render-loop";

const DEFAULT_ROW_HEIGHT = 36;
const DEFAULT_HEADER_HEIGHT = 40;

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
  // Event callbacks (Step 0-3)
  onCellClick: onCellClickProp,
  onCellDoubleClick: onCellDoubleClickProp,
  onHeaderClick: onHeaderClickProp,
  onKeyDown: onKeyDownProp,
  onBeforeSortChange,
  onBeforeSelectionChange,
  // Selection (controlled/uncontrolled)
  enableSelection: enableSelectionProp = true,
  selection: selectionProp,
  onSelectionChange: onSelectionChangeProp,
  selectionStyle,
  onCopy: onCopyProp,
  onPaste: onPasteProp,
  // After-draw callback (Step 0-4)
  onAfterDraw,
  // Adapter DI (Step 0-5)
  eventManager: eventManagerProp,
  selectionManager: selectionManagerProp,
  editorManager: editorManagerProp,
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
  const { engine, memoryBridgeRef } = useWasmEngine({ engineRef });

  const theme: Theme = useMemo(() => ({ ...DEFAULT_THEME, ...themeOverrides }), [themeOverrides]);

  // Sync columns prop → ColumnRegistry (TanStack GridColumnDef[])
  // Note: data is passed for type inference but not used in resolveColumns body,
  // so it's excluded from deps to avoid unnecessary re-resolution on data change.
  useEffect(() => {
    if (!columnsProp) return;
    const resolved = resolveColumns(columnsProp, data);
    columnRegistry.setAll(resolved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnsProp, columnRegistry]);

  // Shared mutable refs
  const layoutBufRef = useRef<Float32Array | null>(null);
  const headerCountRef = useRef(0);
  const totalCellCountRef = useRef(0);
  const visStartRef = useRef(0);

  // invalidateRef bridge: stable callback delegates to useRenderLoop's invalidate (wired below).
  // Other hooks calling invalidate() before useRenderLoop mounts will no-op safely.
  // Once useRenderLoop mounts (line below), the bridge is wired and all calls flow through.
  const invalidateRef = useRef<() => void>(() => {});
  const invalidate = useCallback(() => invalidateRef.current(), []);

  // Adapter DI: prefer external prop, lazy-create fallback only when needed
  const fallbackEventManagerRef = useRef<EventManager | null>(null);
  const eventManagerRef = useRef<EventManager>(null!);
  if (eventManagerProp) {
    eventManagerRef.current = eventManagerProp;
  } else {
    if (!fallbackEventManagerRef.current) fallbackEventManagerRef.current = new EventManager();
    eventManagerRef.current = fallbackEventManagerRef.current;
  }
  const {
    scrollTopRef,
    scrollLeftRef,
    handleWheel,
    handleDragEdge,
    stopAutoScroll,
    handleVScrollChange,
    handleHScrollChange,
  } = useGridScroll({
    data,
    rowHeight,
    height,
    headerHeight,
    width,
    columnRegistry,
    invalidate,
  });

  // Hook composition
  const { sorting, handleHeaderClick } = useSorting({
    engine,
    columnRegistry,
    sortingProp,
    onSortingChange: onSortingChangeProp,
    onBeforeSortChange,
    initialSorting: initialState?.sorting,
    invalidate,
  });
  const { stringTableRef } = useDataIngestion({
    engine,
    data,
    columnRegistry,
    rowHeight,
    height,
    headerHeight,
    invalidate,
  });
  const getMemoryBridge = useCallback(() => memoryBridgeRef.current, []);
  const getStringTable = useCallback(() => stringTableRef.current, []);

  const {
    selectionManagerRef,
    handleCellMouseDown,
    handleCellMouseMove,
    handleCellMouseUp,
    handleKeyDown,
  } = useSelection({
    canvasRef,
    enableSelection: enableSelectionProp,
    selectionProp,
    onSelectionChange: onSelectionChangeProp,
    onBeforeSelectionChange,
    onCopy: onCopyProp,
    onPaste: onPasteProp,
    columnRegistry,
    invalidate,
    getMemoryBridge,
    getStringTable,
    selectionManager: selectionManagerProp,
  });
  const { editorManagerRef, handleCellDoubleClick } = useEditing({
    editorRef,
    columnRegistry,
    data,
    selectionManagerRef,
    getLayoutBuf: () => layoutBufRef.current,
    getHeaderCount: () => headerCountRef.current,
    getTotalCellCount: () => totalCellCountRef.current,
    editorManager: editorManagerProp,
  });

  // Mark dirty when columns change
  useEffect(() => {
    return columnRegistry.onChange(() => {
      invalidate();
    });
  }, [columnRegistry, invalidate]);

  useEventAttachment({
    canvasRef,
    eventManagerRef,
    editorManagerRef,
    handlers: {
      handleHeaderClick,
      handleCellDoubleClick,
      handleCellMouseDown,
      handleCellMouseMove,
      handleCellMouseUp,
      handleDragEdge,
      handleWheel,
      handleKeyDown,
      stopAutoScroll,
    },
    onCellClick: onCellClickProp,
    onCellDoubleClick: onCellDoubleClickProp,
    onHeaderClick: onHeaderClickProp,
    onKeyDown: onKeyDownProp,
    rowHeight,
    headerHeight,
    height,
  });

  const containerProps = useMemo(
    () => ({
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
    }),
    [
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
    ],
  );

  const onLayoutComputed = useCallback((buf: Float32Array, hc: number, tc: number) => {
    layoutBufRef.current = buf;
    headerCountRef.current = hc;
    totalCellCountRef.current = tc;
  }, []);

  const onVisStartComputed = useCallback((vs: number) => {
    visStartRef.current = vs;
  }, []);

  const { invalidate: renderInvalidate } = useRenderLoop({
    engine,
    memoryBridgeRef,
    canvasRef,
    columnRegistry,
    data,
    stringTableRef,
    theme,
    sorting,
    enableSelection: enableSelectionProp,
    selectionStyle,
    selectionManagerRef,
    eventManagerRef,
    scrollTopRef,
    scrollLeftRef,
    vScrollbarRef,
    hScrollbarRef,
    containerProps,
    width,
    height,
    rowHeight,
    headerHeight,
    onLayoutComputed,
    onVisStartComputed,
    onAfterDraw,
  });
  // Wire the bridge: all hooks using `invalidate` now delegate to useRenderLoop's internal dirtyRef
  invalidateRef.current = renderInvalidate;

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

  return (
    <GridContext.Provider value={{ columnRegistry }}>
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
          data-grid-canvas
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
            style={showHorizontalScrollbar ? { height: `calc(100% - 17px)` } : undefined}
          />
        )}
        {showHorizontalScrollbar && (
          <ScrollBar
            ref={hScrollbarRef}
            orientation="horizontal"
            contentSize={totalContentWidth}
            viewportSize={width}
            onScrollChange={handleHScrollChange}
            style={showVerticalScrollbar ? { width: `calc(100% - 17px)` } : undefined}
          />
        )}
        {!columnsProp && children}
      </div>
    </GridContext.Provider>
  );
}

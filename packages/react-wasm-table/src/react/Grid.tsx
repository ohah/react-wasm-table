import { useRef, useMemo, useEffect, useCallback } from "react";

// Inject global CSS to hide scrollbar in scroll overlay (Safari doesn't support scrollbar-width: none)
const SCROLL_OVERLAY_STYLE_ID = "__rwt-scroll-overlay-style";
function ensureScrollOverlayStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(SCROLL_OVERLAY_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = SCROLL_OVERLAY_STYLE_ID;
  style.textContent = `[data-scroll-overlay]::-webkit-scrollbar { display: none; }`;
  document.head.appendChild(style);
}
import type { GridProps, Theme } from "../types";
import { DEFAULT_THEME } from "../types";
import { resolveColumns } from "../resolve-columns";
import { ColumnRegistry } from "../adapter/column-registry";
import { EventManager } from "../adapter/event-manager";
import { buildGridColumns } from "../grid-instance";
import type { GridHeaderGroup } from "../grid-instance";
import { buildHeaderGroups } from "../build-header-groups";
import { GridContext } from "./context";
import { ScrollBar } from "./ScrollBar";
import { useSorting } from "./hooks/use-sorting";
import { useFiltering } from "./hooks/use-filtering";
import { useWasmEngine } from "./hooks/use-wasm-engine";
import { useDataIngestion } from "./hooks/use-data-ingestion";
import { useSelection } from "./hooks/use-selection";
import { useEditing } from "./hooks/use-editing";
import { useGridScroll } from "./hooks/use-grid-scroll";
import { useEventAttachment } from "./hooks/use-event-attachment";
import { useColumnResize } from "./hooks/use-column-resize";
import { useColumnDnD } from "./hooks/use-column-dnd";
import { useRenderLoop } from "./hooks/use-render-loop";
import { useDomOverlays } from "./hooks/use-dom-overlays";
import { useStreaming } from "./hooks/use-streaming";

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
  // TanStack-compatible filtering
  columnFilters: columnFiltersProp,
  onColumnFiltersChange: onColumnFiltersChangeProp,
  globalFilter: globalFilterProp,
  onGlobalFilterChange: onGlobalFilterChangeProp,
  // Column features
  columnOrder: columnOrderProp,
  onColumnOrderChange: onColumnOrderChangeProp,
  columnVisibility: columnVisibilityProp,
  onColumnVisibilityChange: _onColumnVisibilityChangeProp,
  columnSizing: columnSizingProp,
  onColumnSizingChange: onColumnSizingChangeProp,
  columnPinning: columnPinningProp,
  onColumnPinningChange: _onColumnPinningChangeProp,
  enableColumnDnD: enableColumnDnDProp = false,
  rowPinning: rowPinningProp,
  onRowPinningChange: _onRowPinningChangeProp,
  getRowId: getRowIdProp,
  // Event callbacks (enriched events)
  onCellClick: onCellClickProp,
  onCellDoubleClick: onCellDoubleClickProp,
  onHeaderClick: onHeaderClickProp,
  onKeyDown: onKeyDownProp,
  onCellMouseDown: onCellMouseDownProp,
  onCellMouseMove: onCellMouseMoveProp,
  onCellMouseUp: onCellMouseUpProp,
  onScroll: onScrollProp,
  onCanvasEvent: onCanvasEventProp,
  onContextMenu: onContextMenuProp,
  onTouchStart: onTouchStartProp,
  onTouchMove: onTouchMoveProp,
  onTouchEnd: onTouchEndProp,
  eventMiddleware: eventMiddlewareProp,
  cellRenderers: cellRenderersProp,
  layers: layersProp,
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
  meta: metaProp,
  editTrigger: editTriggerProp,
  table: tableProp,
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
  // Streaming (infinite scroll)
  totalCount: totalCountProp,
  onFetchMore: onFetchMoreProp,
  fetchAhead: fetchAheadProp,
  pagination: paginationProp,
  viewIndicesRef,
  engineRef,
  _parsedBodyContent,
  _parsedBorderStyles,
  _onVisibleRangeChange,
}: GridProps) {
  ensureScrollOverlayStyle();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollOverlayRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const vScrollbarRef = useRef<HTMLDivElement>(null);
  const hScrollbarRef = useRef<HTMLDivElement>(null);

  // Tab navigation for DOM overlay inputs/selects
  const pendingInputFocusRef = useRef<{ col: number; edge: "top" | "bottom" } | null>(null);
  const inputRefsMap = useRef<Map<string, HTMLInputElement | HTMLSelectElement>>(new Map());

  // Streaming: effectiveTotalRows drives scrollbar height and viewRowCountRef
  const { effectiveTotalRows, checkAndFetch } = useStreaming({
    data,
    totalCount: totalCountProp,
    onFetchMore: onFetchMoreProp,
    fetchAhead: fetchAheadProp,
  });

  // Filtered row count (updated from render loop when viewIndices changes)
  const viewRowCountRef = useRef(effectiveTotalRows);
  // Reset when effectiveTotalRows changes (data growth or totalCount change)
  useEffect(() => {
    viewRowCountRef.current = effectiveTotalRows;
  }, [effectiveTotalRows]);

  const columnRegistry = useMemo(() => new ColumnRegistry(), []);
  const { engine, memoryBridgeRef } = useWasmEngine({ engineRef });

  const theme: Theme = useMemo(() => ({ ...DEFAULT_THEME, ...themeOverrides }), [themeOverrides]);

  // Sync columns prop → ColumnRegistry (TanStack GridColumnDef[])
  // Note: data is passed for type inference but not used in resolveColumns body,
  // so it's excluded from deps to avoid unnecessary re-resolution on data change.
  useEffect(() => {
    if (!columnsProp) return;
    const resolved = resolveColumns(columnsProp, data, {
      columnOrder: columnOrderProp,
      columnVisibility: columnVisibilityProp,
      columnSizing: columnSizingProp,
      columnPinning: columnPinningProp,
    });
    columnRegistry.setAll(resolved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    columnsProp,
    columnRegistry,
    columnOrderProp,
    columnVisibilityProp,
    columnSizingProp,
    columnPinningProp,
  ]);

  // Build multi-level header groups from column definitions or table instance.
  // If a table prop is provided, use its header groups directly.
  // Otherwise build from columnsProp using buildGridColumns + buildHeaderGroups.
  const headerGroups: GridHeaderGroup[] = useMemo(() => {
    if (tableProp) {
      return tableProp.getHeaderGroups();
    }
    if (!columnsProp) return [];
    const noopCallbacks = {
      onSortingChange: () => {},
      onColumnFiltersChange: () => {},
      onColumnVisibilityChange: () => {},
      onColumnSizingChange: () => {},
      onColumnSizingInfoChange: () => {},
      onColumnPinningChange: () => {},
      onRowPinningChange: () => {},
      onExpandedChange: () => {},
      onPaginationChange: () => {},
      onGroupingChange: () => {},
    };
    const state = {
      sorting: [],
      columnFilters: [],
      globalFilter: "",
      columnVisibility: columnVisibilityProp,
      columnSizing: columnSizingProp,
      columnPinning: columnPinningProp,
    };
    const allColumns = buildGridColumns(columnsProp, state, noopCallbacks);
    return buildHeaderGroups(allColumns);
  }, [columnsProp, tableProp, columnVisibilityProp, columnSizingProp, columnPinningProp]);

  const headerRowCount = headerGroups.length || 1;
  const totalHeaderHeight = headerRowCount * headerHeight;

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
    scrollToRow,
  } = useGridScroll({
    data,
    viewRowCountRef,
    rowHeight,
    height,
    headerHeight: totalHeaderHeight,
    width,
    columnRegistry,
    invalidate,
    scrollOverlayRef,
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
  useFiltering({
    engine,
    columnRegistry,
    columnFiltersProp,
    globalFilterProp,
    onColumnFiltersChange: onColumnFiltersChangeProp,
    onGlobalFilterChange: onGlobalFilterChangeProp,
    initialColumnFilters: initialState?.columnFilters,
    initialGlobalFilter: initialState?.globalFilter,
    invalidate,
  });
  // Sync pagination state to WASM engine
  useEffect(() => {
    if (!engine) return;
    if (paginationProp) {
      engine.setPagination(paginationProp.pageIndex, paginationProp.pageSize);
    } else {
      engine.setPagination(undefined, undefined);
    }
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- paginationProp is destructured to avoid re-runs on new object references with same values
  }, [engine, paginationProp?.pageIndex, paginationProp?.pageSize, invalidate]);

  const { stringTableRef } = useDataIngestion({
    engine,
    data,
    columnRegistry,
    rowHeight,
    height,
    headerHeight: totalHeaderHeight,
    invalidate,
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refs have stable identity
  const getMemoryBridge = useCallback(() => memoryBridgeRef.current, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refs have stable identity
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
  const {
    editorManagerRef,
    handleCellDoubleClick,
    handleCellClick,
    isCellEditable,
    editorPortal,
    handleTypingKeyDown,
    flushPendingOpen,
  } = useEditing({
    editorRef,
    columnRegistry,
    data,
    selectionManagerRef,
    getLayoutBuf: () => layoutBufRef.current,
    getHeaderCount: () => headerCountRef.current,
    getTotalCellCount: () => totalCellCountRef.current,
    editorManager: editorManagerProp,
    meta: metaProp,
    headerRowCount,
    editTrigger: editTriggerProp,
    invalidate,
    scrollToRow,
  });

  // Mark dirty when columns change
  useEffect(() => {
    return columnRegistry.onChange(() => {
      invalidate();
    });
  }, [columnRegistry, invalidate]);

  const { handleResizeStart, handleResizeMove, handleResizeEnd, handleResizeHover } =
    useColumnResize({
      canvasRef,
      columnRegistry,
      columnSizingProp,
      onColumnSizingChangeProp,
      invalidate,
    });

  const columnsForDnD = columnRegistry.getAll();
  const { dndStateRef, handleHeaderMouseDown, handleColumnDnDMove, handleColumnDnDEnd } =
    useColumnDnD({
      enableColumnDnD: enableColumnDnDProp,
      columnOrder: columnOrderProp,
      columns: columnsForDnD,
      onColumnOrderChange: onColumnOrderChangeProp,
      eventManagerRef,
      invalidate,
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

  const onLayoutComputed = useCallback(
    (buf: Float32Array, hc: number, tc: number) => {
      layoutBufRef.current = buf;
      headerCountRef.current = hc;
      totalCellCountRef.current = tc;
      flushPendingOpen();
    },
    [flushPendingOpen],
  );

  const onVisStartComputed = useCallback((vs: number) => {
    visStartRef.current = vs;
  }, []);

  const {
    invalidate: renderInvalidate,
    getInstructionForCellRef,
    cellRendererRegistryRef,
    domOverlaysRef,
  } = useRenderLoop({
    engine,
    memoryBridgeRef,
    canvasRef,
    scrollOverlayRef,
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
    viewRowCountRef,
    width,
    height,
    rowHeight,
    headerHeight: totalHeaderHeight,
    onLayoutComputed,
    onVisStartComputed,
    onAfterDraw,
    cellRenderers: cellRenderersProp,
    layers: layersProp,
    columnPinning: columnPinningProp,
    viewIndicesRef,
    headerGroups,
    enableColumnDnD: enableColumnDnDProp,
    columnDnDStateRef: dndStateRef,
    rowPinning: rowPinningProp,
    getRowId: getRowIdProp,
    parsedBodyContent: _parsedBodyContent,
    parsedBorderStyles: _parsedBorderStyles,
    onVisibleRangeChange: _onVisibleRangeChange,
    effectiveTotalRows: totalCountProp != null ? effectiveTotalRows : undefined,
    checkAndFetch,
  });
  // Wire the bridge: all hooks using `invalidate` now delegate to useRenderLoop's internal dirtyRef
  invalidateRef.current = renderInvalidate;

  useEventAttachment({
    canvasRef,
    scrollOverlayRef,
    eventManagerRef,
    editorManagerRef,
    table: tableProp,
    handlers: {
      handleHeaderClick,
      handleCellDoubleClick,
      handleCellClick,
      handleCellMouseDown,
      handleCellMouseMove,
      handleCellMouseUp,
      handleDragEdge,
      handleWheel,
      handleKeyDown,
      stopAutoScroll,
      handleResizeStart,
      handleResizeMove,
      handleResizeEnd,
      handleResizeHover,
      handleHeaderMouseDown: enableColumnDnDProp ? handleHeaderMouseDown : undefined,
      handleColumnDnDMove: enableColumnDnDProp ? handleColumnDnDMove : undefined,
      handleColumnDnDEnd: enableColumnDnDProp ? handleColumnDnDEnd : undefined,
      isCellEditable,
      handleTypingKeyDown,
    },
    onCellClick: onCellClickProp,
    onCellDoubleClick: onCellDoubleClickProp,
    onHeaderClick: onHeaderClickProp,
    onKeyDown: onKeyDownProp,
    onCellMouseDown: onCellMouseDownProp,
    onCellMouseMove: onCellMouseMoveProp,
    onCellMouseUp: onCellMouseUpProp,
    onScroll: onScrollProp,
    onCanvasEvent: onCanvasEventProp,
    onContextMenu: onContextMenuProp,
    onTouchStart: onTouchStartProp,
    onTouchMove: onTouchMoveProp,
    onTouchEnd: onTouchEndProp,
    eventMiddleware: eventMiddlewareProp,
    rowHeight,
    headerHeight: totalHeaderHeight,
    height,
    getInstructionForCellRef,
    cellRendererRegistryRef,
    invalidate: renderInvalidate,
    scrollLeftRef,
    scrollTopRef: scrollTopRef,
  });

  // DOM overlays (Input components)
  // y-coordinates from WASM layout buffer are already viewport-relative (virtual scroll).
  // Only x-coordinates need scrollLeft adjustment (content-space → viewport-space).
  const { overlays: domOverlays, scrollLeft: overlayScrollLeft } = useDomOverlays(
    domOverlaysRef,
    scrollLeftRef,
  );

  // Scroll horizontally to ensure the given column's input is visible
  const ensureColumnVisible = useCallback(
    (col: number) => {
      const overlay = domOverlays.find((d) => parseInt(d.key.split(":")[1] ?? "0", 10) === col);
      if (!overlay) return;
      const sl = scrollLeftRef.current;
      const leftEdge = overlay.x - sl;
      const rightEdge = leftEdge + overlay.width;
      if (leftEdge < 0) {
        scrollLeftRef.current = overlay.x;
        invalidate();
      } else if (rightEdge > width) {
        scrollLeftRef.current = overlay.x + overlay.width - width;
        invalidate();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scrollLeftRef is a stable ref
    [domOverlays, width, invalidate],
  );

  // Resolve pending focus after scroll: find the target input by edge + column
  useEffect(() => {
    const p = pendingInputFocusRef.current;
    if (!p) return;
    const candidates = domOverlays.filter(
      (d) => parseInt(d.key.split(":")[1] ?? "0", 10) === p.col,
    );
    if (candidates.length === 0) return;
    const target =
      p.edge === "top"
        ? candidates.reduce((a, b) => (a.y < b.y ? a : b))
        : candidates.reduce((a, b) => (a.y > b.y ? a : b));
    const el = inputRefsMap.current.get(target.key);
    if (el) {
      pendingInputFocusRef.current = null;
      ensureColumnVisible(p.col);
      el.focus();
    }
  }, [domOverlays, ensureColumnVisible]);

  // Tab navigation handler for DOM overlay inputs
  const handleOverlayTab = useCallback(
    (currentKey: string, shiftKey: boolean) => {
      // Extract unique Input column indices from visible overlays, sorted
      const inputCols = [
        ...new Set(domOverlays.map((d) => parseInt(d.key.split(":")[1] ?? "0", 10))),
      ].sort((a, b) => a - b);
      if (inputCols.length === 0) return;

      const parts = currentKey.split(":");
      const curViewportRow = parseInt(parts[0] ?? "0", 10);
      const curCol = parseInt(parts[1] ?? "0", 10);
      const colIdx = inputCols.indexOf(curCol);
      if (colIdx < 0) return; // Guard: current column not in input list

      let targetViewportRow: number;
      let targetCol: number;

      if (!shiftKey) {
        if (colIdx < inputCols.length - 1) {
          targetViewportRow = curViewportRow;
          targetCol = inputCols[colIdx + 1]!;
        } else {
          targetViewportRow = curViewportRow + 1;
          targetCol = inputCols[0]!;
        }
      } else {
        if (colIdx > 0) {
          targetViewportRow = curViewportRow;
          targetCol = inputCols[colIdx - 1]!;
        } else {
          targetViewportRow = curViewportRow - 1;
          targetCol = inputCols[inputCols.length - 1]!;
        }
      }

      // If target is already visible, focus directly
      const targetKey = `${targetViewportRow}:${targetCol}`;
      const existingEl = inputRefsMap.current.get(targetKey);
      if (existingEl) {
        ensureColumnVisible(targetCol);
        existingEl.focus();
        return;
      }

      // Target not visible — scroll vertically and set pending focus
      const dataRowOffset = targetViewportRow - curViewportRow; // +1 or -1
      const targetDataRow = visStartRef.current + (curViewportRow - headerRowCount) + dataRowOffset;
      if (targetDataRow < 0 || targetDataRow >= data.length) return;
      pendingInputFocusRef.current = {
        col: targetCol,
        edge: dataRowOffset < 0 ? "top" : "bottom",
      };
      scrollToRow(targetDataRow);
    },
    [domOverlays, headerRowCount, scrollToRow, ensureColumnVisible, data.length],
  );

  // Scrollbar visibility
  const totalContentHeight = data.length * rowHeight + totalHeaderHeight;
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
          style={{ display: "block", width, height, pointerEvents: "none" }}
        />
        {/* Scroll overlay: native browser scroll for wheel (momentum/smooth),
            touch-action: none so touch is handled manually by EventManager */}
        <div
          ref={scrollOverlayRef}
          data-scroll-overlay
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height,
            overflow: "auto",
            touchAction: "none",
            scrollbarWidth: "none",
            zIndex: 1,
          }}
        >
          <div data-scroll-spacer style={{ pointerEvents: "none" }} />
        </div>
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
        {domOverlays.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              overflow: "hidden",
              zIndex: 5,
            }}
          >
            {domOverlays.map((d) => {
              const inst = d.instruction;
              const s = inst.style;
              const baseStyle: React.CSSProperties = {
                position: "absolute",
                left: d.x - overlayScrollLeft,
                top: d.y,
                width: d.width,
                height: d.height,
                pointerEvents: "auto",
                boxSizing: "border-box",
                padding: "2px 6px",
                fontSize: s?.fontSize ?? 13,
                fontFamily: s?.fontFamily ?? "system-ui, sans-serif",
                color: s?.color ?? "#333",
                backgroundColor: s?.backgroundColor ?? "#fff",
                borderColor: s?.borderColor ?? "#d1d5db",
                borderWidth: s?.borderWidth ?? 1,
                borderStyle: "solid",
                borderRadius: s?.borderRadius ?? 4,
                outline: "none",
                opacity: inst.disabled ? 0.5 : 1,
              };
              if (inst.type === "select") {
                const si = inst;
                const selectStyle: React.CSSProperties = {
                  ...baseStyle,
                  appearance: "none",
                  WebkitAppearance: "none",
                };
                return (
                  <OverlaySelect
                    key={d.key}
                    overlayKey={d.key}
                    inputRefsMap={inputRefsMap}
                    value={si.value ?? ""}
                    options={si.options}
                    placeholder={si.placeholder}
                    disabled={si.disabled}
                    multiple={si.multiple}
                    size={si.size}
                    name={si.name}
                    required={si.required}
                    autoFocus={si.autoFocus}
                    onChange={si._domHandlers?.onChange}
                    onFocus={si._domHandlers?.onFocus}
                    onBlur={si._domHandlers?.onBlur}
                    onKeyDown={(e) => {
                      if (e.key === "Tab" && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        handleOverlayTab(d.key, e.shiftKey);
                        return;
                      }
                      si._domHandlers?.onKeyDown?.(e);
                    }}
                    onWheel={(e) => {
                      scrollOverlayRef.current?.scrollBy({
                        top: e.nativeEvent.deltaY,
                        left: e.nativeEvent.deltaX,
                      });
                    }}
                    style={selectStyle}
                  />
                );
              }
              // Input or DatePicker (both render as <input>)
              const ii = inst as
                | import("../types").InputInstruction
                | import("../types").DatePickerInstruction;
              return (
                <OverlayInput
                  key={d.key}
                  overlayKey={d.key}
                  inputRefsMap={inputRefsMap}
                  type={
                    ii.type === "datepicker"
                      ? "date"
                      : ((ii as import("../types").InputInstruction).inputType ?? "text")
                  }
                  value={ii.value ?? ""}
                  placeholder={ii.placeholder}
                  disabled={ii.disabled}
                  readOnly={(ii as import("../types").InputInstruction).readOnly}
                  min={ii.min}
                  max={ii.max}
                  step={(ii as import("../types").InputInstruction).step}
                  onChange={ii._domHandlers?.onChange}
                  onFocus={ii._domHandlers?.onFocus}
                  onBlur={ii._domHandlers?.onBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Tab" && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      handleOverlayTab(d.key, e.shiftKey);
                      return;
                    }
                    ii._domHandlers?.onKeyDown?.(e);
                  }}
                  onWheel={(e) => {
                    canvasRef.current?.dispatchEvent(new WheelEvent("wheel", e.nativeEvent));
                  }}
                  style={baseStyle}
                />
              );
            })}
          </div>
        )}
        {editorPortal}
        {!columnsProp && children}
      </div>
    </GridContext.Provider>
  );
}

/**
 * Wrapper for DOM overlay <input> that handles IME composition correctly.
 * Prevents 자소 분리 (character decomposition) during Korean/CJK input
 * by maintaining local state during composition.
 */
function OverlayInput({
  overlayKey,
  inputRefsMap,
  value,
  onChange,
  onKeyDown,
  ...rest
}: {
  overlayKey: string;
  inputRefsMap: React.RefObject<Map<string, HTMLInputElement | HTMLSelectElement>>;
  value: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value">) {
  const elRef = useRef<HTMLInputElement | null>(null);
  const composingRef = useRef(false);
  const prevValueRef = useRef(value);

  // Sync external value → DOM imperatively (skip during IME composition)
  if (value !== prevValueRef.current) {
    prevValueRef.current = value;
    if (!composingRef.current && elRef.current) {
      elRef.current.value = value;
    }
  }

  return (
    <input
      {...rest}
      ref={(el) => {
        elRef.current = el;
        if (el) {
          inputRefsMap.current.set(overlayKey, el);
        } else {
          inputRefsMap.current.delete(overlayKey);
        }
      }}
      defaultValue={value}
      onChange={onChange}
      onCompositionStart={() => {
        composingRef.current = true;
      }}
      onCompositionEnd={() => {
        composingRef.current = false;
      }}
      onKeyDown={onKeyDown}
    />
  );
}

/**
 * Wrapper for DOM overlay <select> that avoids controlled-component re-render loops.
 * Uses defaultValue + imperative sync (same pattern as OverlayInput) so that
 * React does not set el.value on every frame, preventing spurious change events.
 */
function OverlaySelect({
  overlayKey,
  inputRefsMap,
  value,
  options,
  placeholder,
  onChange,
  ...rest
}: {
  overlayKey: string;
  inputRefsMap: React.RefObject<Map<string, HTMLInputElement | HTMLSelectElement>>;
  value: string;
  options: { value: string; label: string }[];
  placeholder?: string;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value">) {
  const elRef = useRef<HTMLSelectElement | null>(null);
  // Map empty value with placeholder to sentinel so it selects the placeholder <option>
  const effectiveValue = !value && placeholder ? "__placeholder__" : value;
  const prevValueRef = useRef(effectiveValue);

  // Sync external value → DOM imperatively
  if (effectiveValue !== prevValueRef.current) {
    prevValueRef.current = effectiveValue;
    if (elRef.current) {
      elRef.current.value = effectiveValue;
    }
  }

  return (
    <select
      {...rest}
      ref={(el) => {
        elRef.current = el;
        if (el) {
          inputRefsMap.current.set(overlayKey, el);
        } else {
          inputRefsMap.current.delete(overlayKey);
        }
      }}
      defaultValue={effectiveValue}
      onChange={onChange}
    >
      {placeholder && (
        <option value="__placeholder__" disabled hidden>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

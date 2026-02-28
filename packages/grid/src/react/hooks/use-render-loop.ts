import { useRef, useEffect, useCallback, useMemo } from "react";
import type {
  WasmTableEngine,
  Theme,
  CellLayout,
  SelectionStyle,
  AfterDrawContext,
  CssDisplay,
  CssFlexDirection,
  CssFlexWrap,
  CssLength,
  CssAlignItems,
  CssAlignContent,
  CssJustifyContent,
  CssOverflow,
  CssRect,
  CssLengthAuto,
  CssGridTrackList,
  CssGridTrackSize,
  CssGridAutoFlow,
} from "../../types";
import type { SortingState } from "../../tanstack-types";
import type { ColumnRegistry } from "../../adapter/column-registry";
import type { MemoryBridge } from "../../adapter/memory-bridge";
import type { StringTable } from "../../adapter/string-table";
import type { SelectionManager } from "../../adapter/selection-manager";
import type { EventManager } from "../../adapter/event-manager";
import { CanvasRenderer } from "../../renderer/canvas";
import type { CellRenderer } from "../../renderer/components";
import { createCellRendererRegistry } from "../../renderer/components";
import type { GridLayer } from "../../renderer/layer";
import type { InternalLayerContext } from "../../renderer/layer";
import { DEFAULT_LAYERS } from "../../renderer/layer";
import type { ColumnPinningState } from "../../tanstack-types";
import { computePinningInfo } from "../../resolve-columns";
import { buildRegions, buildRowRegions, contentToViewportX } from "../../renderer/region";
import type { ColumnDnDState } from "./use-column-dnd";
import { resolveInstruction } from "../../resolve-instruction";
import {
  readCellRow,
  readCellCol,
  readCellX,
  readCellY,
  readCellWidth,
  readCellHeight,
  readCellAlign,
} from "../../adapter/layout-reader";
import { syncScrollBarPosition, syncScrollBarContentSize } from "../ScrollBar";
import {
  resolveDimension,
  resolveLength,
  buildLengthRect,
  buildLengthAutoRect,
  resolveGridLine,
} from "../css-utils";

export interface ContainerLayoutProps {
  display?: CssDisplay;
  flexDirection?: CssFlexDirection;
  flexWrap?: CssFlexWrap;
  gap?: CssLength;
  rowGap?: CssLength;
  columnGap?: CssLength;
  alignItems?: CssAlignItems;
  alignContent?: CssAlignContent;
  justifyContent?: CssJustifyContent;
  overflowX?: CssOverflow;
  overflowY?: CssOverflow;
  scrollbarWidth?: number;
  padding?: CssRect<CssLength>;
  paddingTop?: CssLength;
  paddingRight?: CssLength;
  paddingBottom?: CssLength;
  paddingLeft?: CssLength;
  margin?: CssRect<CssLengthAuto>;
  marginTop?: CssLengthAuto;
  marginRight?: CssLengthAuto;
  marginBottom?: CssLengthAuto;
  marginLeft?: CssLengthAuto;
  borderWidth?: CssRect<CssLength>;
  borderTopWidth?: CssLength;
  borderRightWidth?: CssLength;
  borderBottomWidth?: CssLength;
  borderLeftWidth?: CssLength;
  gridTemplateRows?: CssGridTrackList;
  gridTemplateColumns?: CssGridTrackList;
  gridAutoRows?: CssGridTrackSize | CssGridTrackSize[];
  gridAutoColumns?: CssGridTrackSize | CssGridTrackSize[];
  gridAutoFlow?: CssGridAutoFlow;
  justifyItems?: CssAlignItems;
}

export interface UseRenderLoopParams {
  engine: WasmTableEngine | null;
  memoryBridgeRef: React.RefObject<MemoryBridge | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  columnRegistry: ColumnRegistry;
  data: Record<string, unknown>[];
  stringTableRef: React.RefObject<StringTable>;
  theme: Theme;
  sorting: SortingState;
  enableSelection: boolean;
  selectionStyle?: SelectionStyle;
  selectionManagerRef: React.RefObject<SelectionManager>;
  eventManagerRef: React.RefObject<EventManager>;
  scrollTopRef: React.RefObject<number>;
  scrollLeftRef: React.RefObject<number>;
  vScrollbarRef: React.RefObject<HTMLDivElement | null>;
  hScrollbarRef: React.RefObject<HTMLDivElement | null>;
  containerProps: ContainerLayoutProps;
  width: number;
  height: number;
  rowHeight: number;
  headerHeight: number;
  viewRowCountRef: React.RefObject<number>;
  onLayoutComputed: (buf: Float32Array, headerCount: number, totalCellCount: number) => void;
  onVisStartComputed: (visStart: number) => void;
  onAfterDraw?: (ctx: AfterDrawContext) => void;
  cellRenderers?: CellRenderer[];
  layers?: GridLayer[];
  columnPinning?: ColumnPinningState;
  viewIndicesRef?: { current: Uint32Array | number[] | null };
  /** Ref to column DnD state for drawing ghost + drop indicator. */
  columnDnDStateRef?: React.RefObject<ColumnDnDState | null>;
  /** Row pinning state (top/bottom row IDs). */
  rowPinning?: import("../../tanstack-types").RowPinningState;
  /** Get row ID for row pinning (display -> data index when reordered). */
  getRowId?: (row: Record<string, unknown>, index: number) => string;
  /** Parsed body content from Table <Td> children (keyed by "rowId:columnId"). */
  parsedBodyContent?: Map<string, import("../../types").RenderInstruction>;
  /** Callback to notify Table of visible row range changes. @internal */
  onVisibleRangeChange?: (visStart: number, visibleRowCount: number) => void;
}

export function useRenderLoop({
  engine,
  memoryBridgeRef,
  canvasRef,
  columnRegistry,
  data,
  stringTableRef,
  theme,
  sorting,
  enableSelection,
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
  headerHeight,
  onLayoutComputed,
  onVisStartComputed,
  onAfterDraw,
  cellRenderers,
  layers,
  columnPinning,
  viewIndicesRef,
  columnDnDStateRef,
  rowPinning,
  getRowId,
  parsedBodyContent,
  onVisibleRangeChange,
}: UseRenderLoopParams) {
  const cellRendererRegistry = useMemo(
    () => createCellRendererRegistry(cellRenderers),
    [cellRenderers],
  );
  const effectiveLayers = useMemo(() => layers ?? DEFAULT_LAYERS, [layers]);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const rafRef = useRef<number>(0);
  const prevEffectiveRowHeightRef = useRef(0);

  // Internal dirty flag + invalidate (owned by this hook)
  const dirtyRef = useRef(true);
  const invalidate = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  // Ref-wrap onAfterDraw to avoid effect restarts
  const onAfterDrawRef = useRef(onAfterDraw);
  onAfterDrawRef.current = onAfterDraw;

  // Ref-wrap onVisibleRangeChange to avoid effect restarts
  const onVisibleRangeChangeRef = useRef(onVisibleRangeChange);
  onVisibleRangeChangeRef.current = onVisibleRangeChange;

  // Attach canvas renderer — re-run when size changes because
  // React setting canvas.width/height resets the 2D context (loses DPR scale).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new CanvasRenderer();
    renderer.attach(canvas);
    rendererRef.current = renderer;
    dirtyRef.current = true;
  }, [canvasRef, width, height]);

  // Render loop — unified hot path (single WASM call per frame)
  useEffect(() => {
    if (!engine) return;
    const renderer = rendererRef.current;
    if (!renderer) return;
    const bridge = memoryBridgeRef.current;
    const strTable = stringTableRef.current;
    if (!bridge) return;

    // Mark dirty when effect deps change (layout props changed)
    dirtyRef.current = true;

    const {
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
    } = containerProps;

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

        // Row pinning: resolve display order (top / middle / bottom) and get view indices first
        const hasRowPinning =
          rowPinning &&
          getRowId &&
          ((rowPinning.top?.length ?? 0) > 0 || (rowPinning.bottom?.length ?? 0) > 0);

        let pinnedTop = 0;
        let pinnedBottom = 0;
        let reorderedIndices: number[] | null = null;
        let rowRegionLayout: ReturnType<typeof buildRowRegions> | null = null;

        if (hasRowPinning && engine.rebuildView) {
          engine.rebuildView();
        }
        const viewIndicesFromBridge = bridge.getViewIndices();

        if (hasRowPinning && getRowId) {
          const topIds = new Set(rowPinning!.top ?? []);
          const bottomIds = new Set(rowPinning!.bottom ?? []);
          const top: number[] = [];
          const middle: number[] = [];
          const bottom: number[] = [];
          for (let i = 0; i < viewIndicesFromBridge.length; i++) {
            const vi = viewIndicesFromBridge[i]!;
            const rowId = getRowId(data[vi] ?? {}, vi);
            if (topIds.has(rowId)) top.push(i);
            else if (bottomIds.has(rowId)) bottom.push(i);
            else middle.push(i);
          }
          // Preserve order within top/bottom by rowPinning order
          const topOrdered = (rowPinning!.top ?? []).flatMap((id) =>
            top.filter(
              (i) =>
                getRowId(data[viewIndicesFromBridge[i]!] ?? {}, viewIndicesFromBridge[i]!) === id,
            ),
          );
          const bottomOrdered = (rowPinning!.bottom ?? []).flatMap((id) =>
            bottom.filter(
              (i) =>
                getRowId(data[viewIndicesFromBridge[i]!] ?? {}, viewIndicesFromBridge[i]!) === id,
            ),
          );
          pinnedTop = topOrdered.length;
          pinnedBottom = bottomOrdered.length;
          const reorderedViewIndices = [...topOrdered, ...middle, ...bottomOrdered];
          reorderedIndices = reorderedViewIndices.map((vi) => viewIndicesFromBridge[vi] ?? 0);
        }

        // WASM: rebuild + virtual slice + layout (with optional row pinning)
        const meta = engine.updateViewportColumnar(
          scrollTopRef.current,
          viewport,
          colLayouts,
          containerLayout,
          hasRowPinning ? pinnedTop : undefined,
          hasRowPinning ? pinnedBottom : undefined,
          hasRowPinning ? true : undefined,
        );
        const cellCount = meta[0] ?? 0;
        const visStart = meta[1] ?? 0;
        const _generation = meta[5] ?? 0;
        const effectiveRowHeight = meta[8] ?? rowHeight;
        const headerCount = colCount;
        const dataCount = cellCount - headerCount;

        onVisStartComputed(visStart);

        // Notify Table of visible range for virtual row model
        if (onVisibleRangeChangeRef.current) {
          const visibleRowCount = Math.ceil((height - headerHeight) / effectiveRowHeight);
          onVisibleRangeChangeRef.current(visStart, visibleRowCount);
        }

        const layoutBuf = bridge.getLayoutBuffer();
        const viewIndices = bridge.getViewIndices();
        // When row pinning is active, use reorderedIndices for data lookup
        // so that layout buffer row indices map to the correct data rows.
        const effectiveViewIndices: Uint32Array | number[] = reorderedIndices ?? viewIndices;
        if (viewIndicesRef) {
          viewIndicesRef.current = effectiveViewIndices;
        }

        const filteredCount = viewIndices.length;

        if (hasRowPinning && pinnedTop + pinnedBottom < filteredCount) {
          const scrollableCount = filteredCount - pinnedTop - pinnedBottom;
          const topHeight = pinnedTop * effectiveRowHeight;
          const bottomHeight = pinnedBottom * effectiveRowHeight;
          const centerHeight = Math.max(0, height - headerHeight - topHeight - bottomHeight);
          rowRegionLayout = buildRowRegions(
            width,
            height,
            headerHeight,
            effectiveRowHeight,
            scrollTopRef.current,
            pinnedTop,
            pinnedBottom,
            filteredCount,
          );
          const scrollContentHeight = scrollableCount * effectiveRowHeight;
          syncScrollBarContentSize(vScrollbarRef.current, scrollContentHeight, "vertical");
          const maxScrollY = Math.max(0, scrollContentHeight - centerHeight);
          if (scrollTopRef.current > maxScrollY) {
            (scrollTopRef as React.MutableRefObject<number>).current = maxScrollY;
            dirtyRef.current = true;
          }
        }

        // Update filtered row count / scroll height when not row pinning
        const rowHeightChanged = prevEffectiveRowHeightRef.current !== effectiveRowHeight;
        if (!hasRowPinning && (viewRowCountRef.current !== filteredCount || rowHeightChanged)) {
          (viewRowCountRef as React.MutableRefObject<number>).current = filteredCount;
          prevEffectiveRowHeightRef.current = effectiveRowHeight;
          const newContentHeight = filteredCount * effectiveRowHeight + headerHeight;
          syncScrollBarContentSize(vScrollbarRef.current, newContentHeight, "vertical");
          const maxScrollY = Math.max(0, newContentHeight - height);
          if (scrollTopRef.current > maxScrollY) {
            (scrollTopRef as React.MutableRefObject<number>).current = maxScrollY;
            dirtyRef.current = true;
          }
        }
        if (hasRowPinning) {
          (viewRowCountRef as React.MutableRefObject<number>).current = filteredCount;
          prevEffectiveRowHeightRef.current = effectiveRowHeight;
        }

        // Store refs for hit-testing and editor positioning
        onLayoutComputed(layoutBuf, headerCount, cellCount);

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

        eventManagerRef.current.setLayouts(normalizedHeaders, normalizedRows);
        eventManagerRef.current.setScrollOffset(scrollLeftRef.current);

        // During drag auto-scroll, re-hit-test at last mouse position to extend selection
        const sm = selectionManagerRef.current;
        if (enableSelection && sm.isDragging) {
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

        // Draw — region-based pipeline with clip+translate per region
        renderer.clear();
        const ctx = renderer.context;
        const scrollLeft = scrollLeftRef.current;

        if (ctx) {
          const getInstruction = (cellIdx: number) => {
            const col = columns[readCellCol(layoutBuf, cellIdx)];
            const actualRow = effectiveViewIndices[readCellRow(layoutBuf, cellIdx)] ?? 0;

            // 1. Td JSX content from Table children (highest priority)
            if (parsedBodyContent) {
              const key = `${String(actualRow)}:${col?.id ?? ""}`;
              const parsed = parsedBodyContent.get(key);
              if (parsed) return parsed;
            }

            // 2. cellDef: TanStack cell callback with real row data
            if (col?.cellDef) {
              if (typeof col.cellDef === "string") {
                return { type: "text" as const, value: col.cellDef };
              }
              const rowData = data[actualRow];
              // Resolve value: use accessorFn if available, else property lookup
              const colDef = col.columnDefRef;
              const value =
                colDef && "accessorFn" in colDef && typeof colDef.accessorFn === "function"
                  ? colDef.accessorFn(rowData, actualRow)
                  : rowData?.[col.id];
              const ctx = {
                getValue: () => value,
                renderValue: () => value,
                row: {
                  id: String(actualRow),
                  original: rowData,
                  index: actualRow,
                  getValue: (columnId: string) => rowData?.[columnId],
                },
                column: { id: col.id, columnDef: colDef },
              };
              return resolveInstruction(col.cellDef(ctx));
            }

            // 3. StringTable fallback (default text)
            const text = strTable.get(col?.id ?? "", actualRow);
            return { type: "text" as const, value: text };
          };

          // Compute actual content bounds from cell edges
          let contentLeft = Infinity;
          let contentWidth = 0;
          for (let i = 0; i < cellCount; i++) {
            const cx = readCellX(layoutBuf, i);
            contentLeft = Math.min(contentLeft, cx);
            contentWidth = Math.max(contentWidth, cx + readCellWidth(layoutBuf, i));
          }
          if (contentLeft === Infinity) contentLeft = 0;

          const layerCtx: InternalLayerContext = {
            ctx,
            renderer,
            layoutBuf,
            viewIndices: effectiveViewIndices,
            width,
            height,
            contentLeft,
            contentWidth,
            scrollLeft,
            scrollTop: scrollTopRef.current,
            headerHeight,
            rowHeight: effectiveRowHeight,
            headerCount,
            totalCellCount: cellCount,
            dataCount,
            visibleRowStart: visStart,
            dataRowCount: data.length,
            columns,
            theme,
            _headersWithSort: headersWithSort,
            _getInstruction: getInstruction,
            _cellRendererRegistry: cellRendererRegistry,
            _enableSelection: enableSelection,
            _selection: enableSelection ? selectionManagerRef.current.getNormalized() : null,
            _selectionStyle: selectionStyle,
            _computeChildLayout: engine.computeCompositeLayout
              ? (input: Float32Array) => engine.computeCompositeLayout!(input)
              : undefined,
          };

          // Build regions (clip-based frozen column rendering)
          const pinningInfo = computePinningInfo(columns, columnPinning);
          const regionLayout = buildRegions(
            width,
            height,
            scrollLeft,
            layoutBuf,
            colCount,
            pinningInfo,
          );
          eventManagerRef.current.setRegions(regionLayout);

          const rowRegions = rowRegionLayout?.regions ?? null;

          for (const region of regionLayout.regions) {
            const [cx, cy, cw, ch] = region.clipRect;

            if (rowRegions) {
              for (const rowRegion of rowRegions) {
                const [rx, ry, rw, rh] = rowRegion.clipRect;
                const ix = Math.max(cx, rx);
                const iy = Math.max(cy, ry);
                const iw = Math.max(0, Math.min(cx + cw, rx + rw) - ix);
                const ih = Math.max(0, Math.min(cy + ch, ry + rh) - iy);
                if (iw <= 0 || ih <= 0) continue;
                ctx.save();
                ctx.beginPath();
                ctx.rect(ix, iy, iw, ih);
                ctx.clip();
                if (region.translateX !== 0) ctx.translate(region.translateX, 0);
                if (rowRegion.translateY !== 0) ctx.translate(0, rowRegion.translateY);

                for (const layer of effectiveLayers) {
                  if (
                    layer.space === "viewport" &&
                    (region.translateX !== 0 || rowRegion.translateY !== 0)
                  ) {
                    ctx.save();
                    if (region.translateX !== 0) ctx.translate(-region.translateX, 0);
                    if (rowRegion.translateY !== 0) ctx.translate(0, -rowRegion.translateY);
                    try {
                      layer.draw(layerCtx);
                    } catch (e) {
                      console.error(`Layer "${layer.name}" error:`, e);
                    }
                    ctx.restore();
                  } else {
                    try {
                      layer.draw(layerCtx);
                    } catch (e) {
                      console.error(`Layer "${layer.name}" error:`, e);
                    }
                  }
                }
                ctx.restore();
              }
            } else {
              ctx.save();
              ctx.beginPath();
              ctx.rect(cx, cy, cw, ch);
              ctx.clip();
              if (region.translateX !== 0) ctx.translate(region.translateX, 0);

              for (const layer of effectiveLayers) {
                if (layer.space === "viewport" && region.translateX !== 0) {
                  ctx.save();
                  ctx.translate(-region.translateX, 0);
                  try {
                    layer.draw(layerCtx);
                  } catch (e) {
                    console.error(`Layer "${layer.name}" error:`, e);
                  }
                  ctx.restore();
                } else {
                  try {
                    layer.draw(layerCtx);
                  } catch (e) {
                    console.error(`Layer "${layer.name}" error:`, e);
                  }
                }
              }
              ctx.restore();
            }
          }
        }

        // Column DnD overlay: ghost header + drop indicator (viewport space)
        if (ctx && columnDnDStateRef?.current?.isDragging) {
          const dnd = columnDnDStateRef.current;
          const headerWidth = readCellWidth(layoutBuf, dnd.dragColIndex);
          const ghostX = dnd.ghostViewportX - headerWidth / 2;
          ctx.save();
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = theme.headerBackground;
          ctx.strokeStyle = theme.borderColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          if (typeof ctx.roundRect === "function") {
            ctx.roundRect(ghostX, 0, headerWidth, headerHeight, 4);
          } else {
            ctx.rect(ghostX, 0, headerWidth, headerHeight);
          }
          ctx.fill();
          ctx.stroke();
          ctx.globalAlpha = 1;
          // Drop indicator line
          const dropLeft =
            dnd.dropIndicatorColIndex >= headerCount
              ? readCellX(layoutBuf, headerCount - 1) + readCellWidth(layoutBuf, headerCount - 1)
              : readCellX(layoutBuf, dnd.dropIndicatorColIndex);
          const viewportDropX = contentToViewportX(dropLeft, regionLayout, scrollLeft, width);
          ctx.strokeStyle = "#1976d2";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(viewportDropX, 0);
          ctx.lineTo(viewportDropX, height);
          ctx.stroke();
          ctx.restore();
        }

        // onAfterDraw callback (viewport space — after all layers)
        if (onAfterDrawRef.current && ctx) {
          try {
            onAfterDrawRef.current({
              ctx,
              width,
              height,
              scrollTop: scrollTopRef.current,
              scrollLeft,
              headerHeight,
              rowHeight: effectiveRowHeight,
              columns,
              visibleRowStart: visStart,
              visibleRowCount: dataCount,
              dataRowCount: data.length,
            });
          } catch (e) {
            console.error("onAfterDraw error:", e);
          }
        }

        // Sync native scrollbar positions (canvas wheel → scrollbar DOM)
        syncScrollBarPosition(vScrollbarRef.current, scrollTopRef.current, "vertical", height);
        syncScrollBarPosition(hScrollbarRef.current, scrollLeftRef.current, "horizontal", width);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [
    /* refs */
    memoryBridgeRef,
    stringTableRef,
    selectionManagerRef,
    eventManagerRef,
    scrollTopRef,
    scrollLeftRef,
    vScrollbarRef,
    hScrollbarRef,
    /* layout */
    engine,
    columnRegistry,
    width,
    height,
    rowHeight,
    headerHeight,
    theme,
    cellRendererRegistry,
    effectiveLayers,
    /* data & callbacks */
    data,
    containerProps,
    sorting,
    enableSelection,
    selectionStyle,
    onLayoutComputed,
    onVisStartComputed,
    columnPinning,
    columnDnDStateRef,
    rowPinning,
    getRowId,
    parsedBodyContent,
  ]);

  return { invalidate };
}

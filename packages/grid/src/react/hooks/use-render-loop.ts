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
import { CanvasRenderer } from "../../renderer/canvas-renderer";
import type { CellRenderer } from "../../renderer/cell-renderer";
import { createCellRendererRegistry } from "../../renderer/cell-renderer";
import type { GridLayer } from "../../renderer/layer";
import type { InternalLayerContext } from "../../renderer/layer";
import { DEFAULT_LAYERS } from "../../renderer/layer";
import type { ColumnPinningState } from "../../tanstack-types";
import { computePinningInfo } from "../../resolve-columns";
import { buildRegions } from "../../renderer/region";
import { InstructionBuilder } from "../../adapter/instruction-builder";
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
}: UseRenderLoopParams) {
  const cellRendererRegistry = useMemo(
    () => createCellRendererRegistry(cellRenderers),
    [cellRenderers],
  );
  const effectiveLayers = useMemo(() => layers ?? DEFAULT_LAYERS, [layers]);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const instructionBuilderRef = useRef(new InstructionBuilder());
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
    const builder = instructionBuilderRef.current;
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

        // Single WASM call: rebuild view + virtual slice + layout buffer (columnar path)
        const meta = engine.updateViewportColumnar(
          scrollTopRef.current,
          viewport,
          colLayouts,
          containerLayout,
        );
        const cellCount = meta[0] ?? 0;
        const visStart = meta[1] ?? 0;
        const _generation = meta[5] ?? 0; // reserved for future: skip row model rebuild if unchanged
        const effectiveRowHeight = meta[8] ?? rowHeight;
        const headerCount = colCount;
        const dataCount = cellCount - headerCount;

        // Store visStart for selection clipboard row mapping
        onVisStartComputed(visStart);

        // Zero-copy reads from WASM memory
        const layoutBuf = bridge.getLayoutBuffer();
        const viewIndices = bridge.getViewIndices();
        if (viewIndicesRef) {
          viewIndicesRef.current = viewIndices;
        }

        // Update filtered row count / effective row height → scroll height + clamping
        const filteredCount = viewIndices.length;
        const rowHeightChanged = prevEffectiveRowHeightRef.current !== effectiveRowHeight;
        if (viewRowCountRef.current !== filteredCount || rowHeightChanged) {
          (viewRowCountRef as React.MutableRefObject<number>).current = filteredCount;
          prevEffectiveRowHeightRef.current = effectiveRowHeight;
          const newContentHeight = filteredCount * effectiveRowHeight + headerHeight;
          syncScrollBarContentSize(vScrollbarRef.current, newContentHeight, "vertical");
          // Clamp scrollTop if it exceeds the new max.
          // If clamped, the layout buffer was computed with stale scrollTop —
          // mark dirty to recompute on the next frame.
          const maxScrollY = Math.max(0, newContentHeight - height);
          if (scrollTopRef.current > maxScrollY) {
            (scrollTopRef as React.MutableRefObject<number>).current = maxScrollY;
            dirtyRef.current = true;
          }
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
            const actualRow = viewIndices[readCellRow(layoutBuf, cellIdx)] ?? 0;
            if (col?.children) {
              const value = data[actualRow]?.[col.id];
              return builder.build(col, value);
            }
            const text = strTable.get(col?.id ?? "", actualRow);
            return { type: "text" as const, value: text };
          };

          const layerCtx: InternalLayerContext = {
            ctx,
            renderer,
            layoutBuf,
            viewIndices,
            width,
            height,
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

          for (const region of regionLayout.regions) {
            ctx.save();
            const [cx, cy, cw, ch] = region.clipRect;
            ctx.beginPath();
            ctx.rect(cx, cy, cw, ch);
            ctx.clip();
            if (region.translateX !== 0) ctx.translate(region.translateX, 0);

            for (const layer of effectiveLayers) {
              if (layer.space === "viewport" && region.translateX !== 0) {
                // Viewport-space layers need to undo region translate
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
  ]);

  return { invalidate };
}

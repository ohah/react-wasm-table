import { useMemo, useRef, useCallback, type ReactNode } from "react";
import type { GridInstance } from "../grid-instance";
import type { RenderInstruction } from "../types";
import { parseTableChildren } from "./parse-table-children";
import { resolveInstruction } from "../resolve-instruction";
import type { CellBorderStyleProps } from "./table-components";
import type {
  TableCellContent,
  TableMeta,
  Theme,
  BoxModelProps,
  SelectionStyle,
  NormalizedRange,
  CellCoord,
  GridCellEvent,
  GridHeaderEvent,
  GridKeyboardEvent,
  GridScrollEvent,
  GridCanvasEvent,
  GridContextMenuEvent,
  GridTouchEvent,
  CssDisplay,
  CssFlexDirection,
  CssFlexWrap,
  CssLength,
  CssAlignItems,
  CssAlignContent,
  CssJustifyContent,
  CssOverflow,
  CssGridTrackList,
  CssGridTrackSize,
  CssGridAutoFlow,
  AfterDrawContext,
} from "../types";
import type { EventMiddleware } from "../event-middleware";
import type { CellRenderer } from "../renderer/components";
import type { GridLayer } from "../renderer/layer";
import type { EventManager } from "../adapter/event-manager";
import type { SelectionManager } from "../adapter/selection-manager";
import type { EditorManager } from "../adapter/editor-manager";
import { Grid } from "./Grid";

export interface TableProps extends BoxModelProps {
  /** Grid/Table instance from useReactTable or useGridTable (required). */
  table: GridInstance<any>;
  /** Grid width in pixels. */
  width: number;
  /** Grid height in pixels. */
  height: number;
  /** Row height in pixels. @default 36 */
  rowHeight?: number;
  /** Header height in pixels. @default 40 */
  headerHeight?: number;
  /** Number of extra rows to render above/below the visible area. @default 5 */
  overscan?: number;
  /** Theme overrides. */
  theme?: Partial<Theme>;
  /** Structural children (Thead/Tbody/Tfoot). Content may be ReactNode or RenderInstruction. */
  children?: TableCellContent;

  // Event callbacks
  onCellClick?: (event: GridCellEvent) => void;
  onCellDoubleClick?: (event: GridCellEvent) => void;
  onHeaderClick?: (event: GridHeaderEvent) => void;
  onKeyDown?: (event: GridKeyboardEvent) => void;
  onCellMouseDown?: (event: GridCellEvent) => void;
  onCellMouseMove?: (event: GridCellEvent) => void;
  onCellMouseUp?: () => void;
  onScroll?: (event: GridScrollEvent) => void;
  onCanvasEvent?: (event: GridCanvasEvent) => void;
  onContextMenu?: (event: GridContextMenuEvent) => void;
  onTouchStart?: (event: GridTouchEvent) => void;
  onTouchMove?: (event: GridTouchEvent) => void;
  onTouchEnd?: (event: GridTouchEvent) => void;

  // Selection
  enableSelection?: boolean;
  selection?: NormalizedRange | null;
  onSelectionChange?: (selection: NormalizedRange | null) => void;
  selectionStyle?: SelectionStyle;
  onCopy?: (tsv: string, range: NormalizedRange) => string | void;
  onPaste?: (text: string, target: CellCoord) => void;

  // Middleware & renderers
  eventMiddleware?: EventMiddleware[];
  cellRenderers?: CellRenderer<any>[];
  layers?: GridLayer[];
  onBeforeSortChange?: (next: any) => boolean | void;
  onBeforeSelectionChange?: (next: NormalizedRange | null) => boolean | void;
  onAfterDraw?: (ctx: AfterDrawContext) => void;

  // Column DnD
  enableColumnDnD?: boolean;

  /** TanStack-compatible meta object. Use meta.updateData to commit cell edits. */
  meta?: TableMeta;
  /** When to open the cell editor: "click" (single) or "dblclick" (double). @default "dblclick" */
  editTrigger?: "click" | "dblclick";

  // Streaming (infinite scroll)
  /** Total row count. When set, enables streaming mode. */
  totalCount?: number;
  /** Called when the viewport approaches unloaded rows. */
  onFetchMore?: (startIndex: number, count: number) => void;
  /** Number of rows to fetch ahead of the visible area. @default 100 */
  fetchAhead?: number;

  // Adapter DI
  eventManager?: EventManager;
  selectionManager?: SelectionManager;
  editorManager?: EditorManager;

  // Layout
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
  gridTemplateRows?: CssGridTrackList;
  gridTemplateColumns?: CssGridTrackList;
  gridAutoRows?: CssGridTrackSize | CssGridTrackSize[];
  gridAutoColumns?: CssGridTrackSize | CssGridTrackSize[];
  gridAutoFlow?: CssGridAutoFlow;
  justifyItems?: CssAlignItems;

  viewIndicesRef?: { current: Uint32Array | number[] | null };
  engineRef?: React.RefObject<any>;
}

/**
 * TanStack-compatible Table component.
 * Accepts a `table` instance (from useReactTable/useGridTable) and extracts
 * data, columns, and state to delegate to the underlying Grid component.
 */
const DEFAULT_ROW_HEIGHT = 36;
const DEFAULT_HEADER_HEIGHT = 40;

export function Table({ table, children, overscan = 5, ...rest }: TableProps) {
  const { data: rawData, columns } = table.options;
  const state = table.getState();

  // Pass full data to Grid — pagination is handled in WASM via view_indices slicing.
  const data = rawData;

  const effectiveRowHeight = rest.rowHeight ?? DEFAULT_ROW_HEIGHT;
  const effectiveHeaderHeight = rest.headerHeight ?? DEFAULT_HEADER_HEIGHT;
  const effectiveHeight = rest.height;

  // Visible range ref — updated from render loop callback, no React re-render
  const visRangeRef = useRef<{ start: number; end: number } | null>(null);

  // Estimate initial visible range on first render
  if (!visRangeRef.current) {
    const visibleCount = Math.ceil((effectiveHeight - effectiveHeaderHeight) / effectiveRowHeight);
    const totalRowCount = table.getRowCount();
    visRangeRef.current = {
      start: 0,
      end: Math.min(visibleCount + overscan, totalRowCount),
    };
  }

  // Set visible range on the table instance before children evaluate
  table._setVisibleRange(visRangeRef.current);

  // Callback for render loop to update visible range (ref only, no React re-render)
  const onVisibleRangeChange = useCallback(
    (visStart: number, count: number) => {
      const totalRowCount = table.getRowCount();
      visRangeRef.current = {
        start: Math.max(0, visStart - overscan),
        end: Math.min(visStart + count + overscan, totalRowCount),
      };
    },
    [overscan, table],
  );

  // Parse <Tbody><Tr><Td> children into a content map for canvas rendering
  const parsedBodyContent = useMemo(() => {
    if (!children) return undefined;
    const parsed = parseTableChildren(children as ReactNode);
    if (!parsed.hasStructure || parsed.bodyRows.length === 0) return undefined;

    const map = new Map<string, RenderInstruction>();
    for (const row of parsed.bodyRows) {
      if (!row.key) continue;
      for (const cell of row.cells) {
        if (!cell.key || cell.content == null) continue;
        // cell.key format: "${rowId}_${columnId}" — extract columnId after first "_"
        const sep = cell.key.indexOf("_");
        if (sep < 0) continue;
        const columnId = cell.key.slice(sep + 1);
        const instruction: RenderInstruction =
          typeof cell.content === "string"
            ? { type: "text", value: cell.content }
            : resolveInstruction(cell.content);
        map.set(`${row.key}:${columnId}`, instruction);
      }
    }
    return map.size > 0 ? map : undefined;
  }, [children]);

  // Parse <Tbody><Tr><Td> children into a border style map for canvas rendering
  const parsedBorderStyles = useMemo(() => {
    if (!children) return undefined;
    const parsed = parseTableChildren(children as ReactNode);
    if (!parsed.hasStructure || parsed.bodyRows.length === 0) return undefined;

    const map = new Map<string, CellBorderStyleProps>();
    for (const row of parsed.bodyRows) {
      if (!row.key) continue;
      for (const cell of row.cells) {
        // Merge row-level borderStyle with cell-level borderStyle
        const merged: CellBorderStyleProps = { ...row.borderStyle, ...cell.borderStyle };
        if (Object.keys(merged).length === 0) continue;
        if (!cell.key) continue;
        const sep = cell.key.indexOf("_");
        if (sep < 0) continue;
        const columnId = cell.key.slice(sep + 1);
        map.set(`${row.key}:${columnId}`, merged);
      }
    }
    return map.size > 0 ? map : undefined;
  }, [children]);

  return (
    <Grid
      data={data as Record<string, unknown>[]}
      columns={columns}
      sorting={state.sorting}
      onSortingChange={(updater) => table.setSorting(updater)}
      columnFilters={state.columnFilters}
      onColumnFiltersChange={(updater) => table.setColumnFilters(updater)}
      globalFilter={state.globalFilter}
      onGlobalFilterChange={(v) => table.setGlobalFilter(v)}
      columnVisibility={state.columnVisibility}
      onColumnVisibilityChange={(u) => table.setColumnVisibility(u)}
      columnSizing={state.columnSizing}
      onColumnSizingChange={(u) => table.setColumnSizing(u)}
      columnPinning={state.columnPinning}
      onColumnPinningChange={(u) => table.setColumnPinning(u)}
      rowPinning={state.rowPinning}
      onRowPinningChange={(u) => table.setRowPinning(u)}
      pagination={state.pagination}
      table={table}
      _parsedBodyContent={parsedBodyContent}
      _parsedBorderStyles={parsedBorderStyles}
      _onVisibleRangeChange={onVisibleRangeChange}
      {...rest}
    />
  );
}

import { useMemo, type ReactNode } from "react";
import type { GridInstance } from "../grid-instance";
import type { RenderInstruction } from "../types";
import { parseTableChildren } from "./parse-table-children";
import { resolveInstruction } from "../resolve-instruction";
import type {
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
import type { CellRenderer } from "../renderer/cell-renderer";
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
  /** Theme overrides. */
  theme?: Partial<Theme>;
  /** Structural children (Thead/Tbody/Tfoot). Currently parsed for validation; rendering uses canvas. */
  children?: ReactNode;

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
export function Table({ table, children, ...rest }: TableProps) {
  const { data, columns } = table.options;
  const state = table.getState();

  // Parse <Tbody><Tr><Td> children into a content map for canvas rendering
  const parsedBodyContent = useMemo(() => {
    if (!children) return undefined;
    const parsed = parseTableChildren(children);
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
      table={table}
      _parsedBodyContent={parsedBodyContent}
      {...rest}
    />
  );
}

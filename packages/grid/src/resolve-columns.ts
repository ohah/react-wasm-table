import type { ColumnProps } from "./types";
import type {
  GridColumnDef,
  ColumnOrderState,
  ColumnVisibilityState,
  ColumnSizingState,
  ColumnPinningState,
} from "./tanstack-types";

/**
 * Flatten a potentially nested GridColumnDef tree into leaf ColumnProps[].
 * Group columns are recursed; their leaf children are collected in order.
 */
export function resolveColumns<TData>(
  defs: GridColumnDef<TData, any>[],
  data: TData[],
  options?: {
    columnOrder?: ColumnOrderState;
    columnVisibility?: ColumnVisibilityState;
    columnSizing?: ColumnSizingState;
    columnPinning?: ColumnPinningState;
  },
): ColumnProps[] {
  const result: ColumnProps[] = [];
  const visibility = options?.columnVisibility;
  const sizing = options?.columnSizing;

  function flatten(def: GridColumnDef<TData, any>): void {
    // Group column: recurse into children
    if ("columns" in def && def.columns) {
      for (const child of def.columns) {
        flatten(child);
      }
      return;
    }

    // Leaf column: convert to ColumnProps
    const id = getId(def);

    // Visibility: skip hidden columns
    if (visibility && visibility[id] === false) return;

    const sizeOverride = sizing?.[id];
    const props: ColumnProps = {
      id,
      // Sizing: TanStack size/minSize/maxSize → width/minWidth/maxWidth
      ...((sizeOverride !== undefined || def.size !== undefined) && {
        width: sizeOverride ?? def.size,
      }),
      ...(def.minSize !== undefined && { minWidth: def.minSize }),
      ...(def.maxSize !== undefined && { maxWidth: def.maxSize }),
      // Header
      ...(typeof def.header === "string" && { header: def.header }),
      // Sorting: enableSorting → sortable
      ...(def.enableSorting !== undefined && { sortable: def.enableSorting }),
      // Selection: enableSelection → selectable
      ...(def.enableSelection !== undefined && { selectable: def.enableSelection }),
      // Our extensions pass through
      ...(def.align !== undefined && { align: def.align }),
      ...(def.flexGrow !== undefined && { flexGrow: def.flexGrow }),
      ...(def.flexShrink !== undefined && { flexShrink: def.flexShrink }),
      ...(def.flexBasis !== undefined && { flexBasis: def.flexBasis }),
      ...(def.editor !== undefined && { editor: def.editor }),
      // Box model
      ...(def.padding !== undefined && { padding: def.padding }),
      ...(def.paddingTop !== undefined && { paddingTop: def.paddingTop }),
      ...(def.paddingRight !== undefined && { paddingRight: def.paddingRight }),
      ...(def.paddingBottom !== undefined && { paddingBottom: def.paddingBottom }),
      ...(def.paddingLeft !== undefined && { paddingLeft: def.paddingLeft }),
      ...(def.margin !== undefined && { margin: def.margin }),
      ...(def.marginTop !== undefined && { marginTop: def.marginTop }),
      ...(def.marginRight !== undefined && { marginRight: def.marginRight }),
      ...(def.marginBottom !== undefined && { marginBottom: def.marginBottom }),
      ...(def.marginLeft !== undefined && { marginLeft: def.marginLeft }),
      ...(def.borderWidth !== undefined && { borderWidth: def.borderWidth }),
      ...(def.borderTopWidth !== undefined && { borderTopWidth: def.borderTopWidth }),
      ...(def.borderRightWidth !== undefined && { borderRightWidth: def.borderRightWidth }),
      ...(def.borderBottomWidth !== undefined && { borderBottomWidth: def.borderBottomWidth }),
      ...(def.borderLeftWidth !== undefined && { borderLeftWidth: def.borderLeftWidth }),
      ...(def.height !== undefined && { height: def.height }),
      ...(def.minHeight !== undefined && { minHeight: def.minHeight }),
      ...(def.maxHeight !== undefined && { maxHeight: def.maxHeight }),
      ...(def.alignSelf !== undefined && { alignSelf: def.alignSelf }),
      ...(def.position !== undefined && { position: def.position }),
      ...(def.inset !== undefined && { inset: def.inset }),
      ...(def.insetTop !== undefined && { insetTop: def.insetTop }),
      ...(def.insetRight !== undefined && { insetRight: def.insetRight }),
      ...(def.insetBottom !== undefined && { insetBottom: def.insetBottom }),
      ...(def.insetLeft !== undefined && { insetLeft: def.insetLeft }),
      ...(def.gridRow !== undefined && { gridRow: def.gridRow }),
      ...(def.gridColumn !== undefined && { gridColumn: def.gridColumn }),
      ...(def.justifySelf !== undefined && { justifySelf: def.justifySelf }),
    };

    // Header render function → string
    if (typeof def.header === "function") {
      props.header = def.header({
        column: { id, columnDef: def },
      });
    }

    // Cell render: store original cellDef + columnDefRef for render loop to call with real row data
    if (def.cell) {
      props.cellDef = def.cell;
      props.columnDefRef = def;
    }

    result.push(props);
  }

  for (const def of defs) {
    flatten(def);
  }

  // Reorder by columnOrder if provided
  if (options?.columnOrder) {
    const order = options.columnOrder;
    result.sort((a, b) => {
      const ai = order.indexOf(a.id);
      const bi = order.indexOf(b.id);
      return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
    });
  }

  // Reorder by columnPinning: left → center → right
  if (options?.columnPinning) {
    const { left = [], right = [] } = options.columnPinning;
    if (left.length > 0 || right.length > 0) {
      const pinnedSet = new Set([...left, ...right]);
      const pinnedLeft = left
        .map((id) => result.find((c) => c.id === id))
        .filter((c): c is ColumnProps => c != null);
      const center = result.filter((c) => !pinnedSet.has(c.id));
      const pinnedRight = right
        .map((id) => result.find((c) => c.id === id))
        .filter((c): c is ColumnProps => c != null);
      result.length = 0;
      result.push(...pinnedLeft, ...center, ...pinnedRight);
    }
  }

  return result;
}

/** Extract or derive the column ID from a column definition. */
function getId<TData>(def: GridColumnDef<TData, any>): string {
  if ("id" in def && def.id) return def.id;
  if ("accessorKey" in def && def.accessorKey) return def.accessorKey as string;
  return `col_${Math.random().toString(36).slice(2, 8)}`;
}

export interface PinningInfo {
  leftCount: number;
  rightCount: number;
  centerCount: number;
}

export function computePinningInfo(
  columns: ColumnProps[],
  columnPinning?: ColumnPinningState,
): PinningInfo {
  if (!columnPinning) return { leftCount: 0, rightCount: 0, centerCount: columns.length };
  const visibleIds = new Set(columns.map((c) => c.id));
  const leftCount = (columnPinning.left ?? []).filter((id) => visibleIds.has(id)).length;
  const rightCount = (columnPinning.right ?? []).filter((id) => visibleIds.has(id)).length;
  return { leftCount, rightCount, centerCount: columns.length - leftCount - rightCount };
}

/**
 * Collect all leaf column definitions from a potentially nested tree.
 * Preserves the group structure for header rendering.
 */
export function getLeafColumns<TData>(
  defs: GridColumnDef<TData, any>[],
): GridColumnDef<TData, any>[] {
  const leaves: GridColumnDef<TData, any>[] = [];
  function collect(def: GridColumnDef<TData, any>) {
    if ("columns" in def && def.columns) {
      for (const child of def.columns) collect(child);
    } else {
      leaves.push(def);
    }
  }
  for (const def of defs) collect(def);
  return leaves;
}

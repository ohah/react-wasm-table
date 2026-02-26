import type { ColumnProps, RenderInstruction } from "./types";
import type { GridColumnDef, CellContext } from "./tanstack-types";
import { resolveInstruction } from "./resolve-instruction";

/**
 * Flatten a potentially nested GridColumnDef tree into leaf ColumnProps[].
 * Group columns are recursed; their leaf children are collected in order.
 */
export function resolveColumns<TData>(
  defs: GridColumnDef<TData, any>[],
  data: TData[],
): ColumnProps[] {
  const result: ColumnProps[] = [];

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
    const props: ColumnProps = {
      id,
      // Sizing: TanStack size/minSize/maxSize → width/minWidth/maxWidth
      ...(def.size !== undefined && { width: def.size }),
      ...(def.minSize !== undefined && { minWidth: def.minSize }),
      ...(def.maxSize !== undefined && { maxWidth: def.maxSize }),
      // Header
      ...(typeof def.header === "string" && { header: def.header }),
      // Sorting: enableSorting → sortable
      ...(def.enableSorting !== undefined && { sortable: def.enableSorting }),
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

    // Cell render: TanStack cell(CellContext) → children(value)
    if (def.cell) {
      const cellDef = def.cell;
      const colDef = def;
      props.children = (value: unknown): RenderInstruction => {
        if (typeof cellDef === "string") {
          return { type: "text", value: cellDef };
        }
        // Build a CellContext
        // Note: row.original and row.index are approximated here.
        // The actual row data and index will be resolved in the render loop.
        const ctx: CellContext<TData, unknown> = {
          getValue: () => value,
          renderValue: () => value,
          row: {
            original: {} as TData,
            index: 0,
            getValue: () => undefined,
          },
          column: {
            id,
            columnDef: colDef as GridColumnDef<TData, unknown>,
          },
        };
        const result = cellDef(ctx);
        return resolveInstruction(result);
      };
    }

    result.push(props);
  }

  for (const def of defs) {
    flatten(def);
  }

  return result;
}

/** Extract or derive the column ID from a column definition. */
function getId<TData>(def: GridColumnDef<TData, any>): string {
  if ("id" in def && def.id) return def.id;
  if ("accessorKey" in def && def.accessorKey) return def.accessorKey as string;
  return `col_${Math.random().toString(36).slice(2, 8)}`;
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

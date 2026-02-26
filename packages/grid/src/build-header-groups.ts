import type { GridColumn, GridHeader, GridHeaderGroup } from "./grid-instance";

/**
 * Build header groups from a column definition tree.
 * Ports TanStack's buildHeaderGroups algorithm for multi-level canvas headers.
 *
 * Algorithm:
 * 1. Calculate max depth of the column tree
 * 2. Create leaf headers at the bottom level
 * 3. Build parent headers bottom-up, merging shared parents
 *    - Only link to parent if parent.depth === currentDepth
 *    - Otherwise create placeholder headers
 * 4. Calculate colSpan/rowSpan for each header
 */
export function buildHeaderGroups<TData>(
  allColumns: GridColumn<TData>[],
): GridHeaderGroup<TData>[] {
  const maxDepth = findMaxDepth(allColumns);

  // For flat columns (no groups), single header row
  if (maxDepth === 0) {
    const leaves = getLeafGridColumns(allColumns);
    const headers = leaves.map(
      (col): GridHeader<TData> => ({
        id: `${col.id}_header`,
        column: col,
        colSpan: 1,
        rowSpan: 1,
        depth: 0,
        isPlaceholder: false,
        subHeaders: [],
        getContext: () => ({
          column: { id: col.id, columnDef: col.columnDef },
        }),
      }),
    );
    return [{ id: "headerGroup_0", depth: 0, headers }];
  }

  // Start with leaf columns at the deepest level
  const leafHeaders = getLeafGridColumns(allColumns).map(
    (col): GridHeader<TData> => ({
      id: `${col.id}_header`,
      column: col,
      colSpan: 1,
      rowSpan: 1,
      depth: maxDepth,
      isPlaceholder: false,
      subHeaders: [],
      getContext: () => ({
        column: { id: col.id, columnDef: col.columnDef },
      }),
    }),
  );

  // Build groups bottom-up
  const headerGroups: GridHeaderGroup<TData>[] = [];
  let currentHeaders = leafHeaders;
  let currentDepth = maxDepth;

  // Add the leaf level
  headerGroups.push({
    id: `headerGroup_${currentDepth}`,
    depth: currentDepth,
    headers: currentHeaders,
  });

  // Build parent levels
  while (currentDepth > 0) {
    currentDepth--;
    const parentHeaders: GridHeader<TData>[] = [];

    for (const header of currentHeaders) {
      // Walk up the parent chain to find the ancestor at currentDepth
      const parentCol = findAncestorAtDepth(header.column, currentDepth);

      if (parentCol) {
        // Check if we already have a header for this parent
        const existing = parentHeaders[parentHeaders.length - 1];
        if (existing && !existing.isPlaceholder && existing.column === parentCol) {
          existing.subHeaders.push(header);
        } else {
          parentHeaders.push({
            id: `${parentCol.id}_header`,
            column: parentCol,
            colSpan: 1,
            rowSpan: 1,
            depth: currentDepth,
            isPlaceholder: false,
            subHeaders: [header],
            getContext: () => ({
              column: { id: parentCol.id, columnDef: parentCol.columnDef },
            }),
          });
        }
      } else {
        // No ancestor at this depth — create placeholder
        // Use the leaf column (original column, not a group) for the placeholder
        const leafCol = getLeafColumn(header);
        parentHeaders.push({
          id: `${leafCol.id}_placeholder_${currentDepth}`,
          column: leafCol,
          colSpan: 1,
          rowSpan: 1,
          depth: currentDepth,
          isPlaceholder: true,
          subHeaders: [header],
          getContext: () => ({
            column: { id: leafCol.id, columnDef: leafCol.columnDef },
          }),
        });
      }
    }

    headerGroups.push({
      id: `headerGroup_${currentDepth}`,
      depth: currentDepth,
      headers: parentHeaders,
    });

    currentHeaders = parentHeaders;
  }

  // Reverse so depth 0 is first
  headerGroups.reverse();

  // Calculate spans
  for (const group of headerGroups) {
    for (const header of group.headers) {
      calculateSpans(header, maxDepth);
    }
  }

  return headerGroups;
}

/**
 * Find the ancestor GridColumn at the given depth for a column.
 * If the column itself is at the target depth, return its parent at that depth.
 * Returns undefined if no ancestor exists at that depth.
 */
function findAncestorAtDepth<TData>(
  col: GridColumn<TData>,
  targetDepth: number,
): GridColumn<TData> | undefined {
  let current: GridColumn<TData> | undefined = col;
  while (current) {
    if (current.parent && current.parent.depth === targetDepth) {
      return current.parent;
    }
    current = current.parent;
  }
  return undefined;
}

/** Get the original leaf column from a header (traverse past placeholders). */
function getLeafColumn<TData>(header: GridHeader<TData>): GridColumn<TData> {
  if (header.subHeaders.length === 0) return header.column;
  return getLeafColumn(header.subHeaders[0]!);
}

/** Find the maximum depth of the column tree. */
function findMaxDepth<TData>(columns: GridColumn<TData>[]): number {
  let max = 0;
  function recurse(cols: GridColumn<TData>[], depth: number) {
    for (const col of cols) {
      if (col.columns.length > 0) {
        recurse(col.columns, depth + 1);
      } else {
        max = Math.max(max, depth);
      }
    }
  }
  recurse(columns, 0);
  return max;
}

/** Collect all leaf GridColumns in order. */
function getLeafGridColumns<TData>(
  columns: GridColumn<TData>[],
): GridColumn<TData>[] {
  const leaves: GridColumn<TData>[] = [];
  function collect(cols: GridColumn<TData>[]) {
    for (const col of cols) {
      if (col.columns.length > 0) {
        collect(col.columns);
      } else {
        leaves.push(col);
      }
    }
  }
  collect(columns);
  return leaves;
}

/** Recursively calculate colSpan and rowSpan for a header. */
function calculateSpans<TData>(header: GridHeader<TData>, maxDepth: number): void {
  if (header.subHeaders.length === 0) {
    // Leaf header or placeholder without children
    header.colSpan = 1;
    header.rowSpan = maxDepth - header.depth + 1;
    return;
  }

  // Recurse first
  for (const sub of header.subHeaders) {
    calculateSpans(sub, maxDepth);
  }

  // colSpan = sum of children's colSpans
  header.colSpan = header.subHeaders.reduce((sum, h) => sum + h.colSpan, 0);

  // Placeholders extend to fill the gap (like leaf headers)
  if (header.isPlaceholder) {
    header.rowSpan = maxDepth - header.depth + 1;
  } else {
    header.rowSpan = 1;
  }
}

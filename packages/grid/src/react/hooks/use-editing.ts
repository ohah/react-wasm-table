import { useRef, useEffect, useCallback } from "react";
import type { CellCoord, CellLayout } from "../../types";
import type { ColumnRegistry } from "../../adapter/column-registry";
import type { SelectionManager } from "../../adapter/selection-manager";
import { EditorManager } from "../../adapter/editor-manager";
import {
  readCellRow,
  readCellCol,
  readCellX,
  readCellY,
  readCellWidth,
  readCellHeight,
  readCellAlign,
} from "../../adapter/layout-reader";

export interface UseEditingParams {
  editorRef: React.RefObject<HTMLDivElement | null>;
  columnRegistry: ColumnRegistry;
  data: Record<string, unknown>[];
  selectionManagerRef: React.RefObject<SelectionManager>;
  getLayoutBuf: () => Float32Array | null;
  getHeaderCount: () => number;
  getTotalCellCount: () => number;
  editorManager?: EditorManager;
}

export function useEditing({
  editorRef,
  columnRegistry,
  data,
  selectionManagerRef,
  getLayoutBuf,
  getHeaderCount,
  getTotalCellCount,
  editorManager,
}: UseEditingParams) {
  // Adapter DI: prefer external prop, lazy-create fallback only when needed
  const fallbackEmRef = useRef<EditorManager | null>(null);
  const editorManagerRef = useRef<EditorManager>(null!);
  if (editorManager) {
    editorManagerRef.current = editorManager;
  } else {
    if (!fallbackEmRef.current) fallbackEmRef.current = new EditorManager();
    editorManagerRef.current = fallbackEmRef.current;
  }

  // Set editor container
  useEffect(() => {
    if (editorRef.current) {
      editorManagerRef.current.setContainer(editorRef.current);
    }
  }, [editorRef]);

  const handleCellDoubleClick = useCallback(
    (coord: CellCoord) => {
      const columns = columnRegistry.getAll();
      const col = columns[coord.col];
      if (!col?.editor) return;

      // Find the matching cell layout from buffer
      const buf = getLayoutBuf();
      let layout: CellLayout | undefined;
      if (buf) {
        const hc = getHeaderCount();
        const tc = getTotalCellCount();
        for (let i = hc; i < tc; i++) {
          if (readCellRow(buf, i) === coord.row && readCellCol(buf, i) === coord.col) {
            layout = {
              row: coord.row,
              col: coord.col,
              x: readCellX(buf, i),
              y: readCellY(buf, i),
              width: readCellWidth(buf, i),
              height: readCellHeight(buf, i),
              contentAlign: readCellAlign(buf, i),
            };
            break;
          }
        }
      }
      if (!layout) return;

      const rowData = data[coord.row];
      if (!rowData) return;
      const currentValue = rowData[col.id];

      editorManagerRef.current.open(coord, layout, col.editor, currentValue);
      selectionManagerRef.current.clear();
    },
    [columnRegistry, data, selectionManagerRef, getLayoutBuf, getHeaderCount, getTotalCellCount],
  );

  return { editorManagerRef, handleCellDoubleClick };
}

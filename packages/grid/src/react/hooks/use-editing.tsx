import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ColumnRegistry } from "../../adapter/column-registry";
import { EditorManager } from "../../adapter/editor-manager";
import {
  readCellAlign,
  readCellCol,
  readCellHeight,
  readCellRow,
  readCellWidth,
  readCellX,
  readCellY,
} from "../../adapter/layout-reader";
import type { SelectionManager } from "../../adapter/selection-manager";
import type {
  CellCoord,
  CellLayout,
  CellEditRenderProps,
  ColumnProps,
  TableMeta,
} from "../../types";
import { TextEditor, NumberEditor, SelectEditor } from "../editors";

/** Internal state snapshot for React rendering. */
interface EditorState {
  coord: CellCoord;
  layout: CellLayout;
  editorType: string;
  currentValue: unknown;
  editCell?: (props: CellEditRenderProps) => React.ReactNode;
  editorOptions?: { options: { label: string; value: unknown }[] };
  initialChar: string | null;
}

export interface UseEditingParams {
  editorRef: React.RefObject<HTMLDivElement | null>;
  columnRegistry: ColumnRegistry;
  data: Record<string, unknown>[];
  selectionManagerRef: React.RefObject<SelectionManager>;
  getLayoutBuf: () => Float32Array | null;
  getHeaderCount: () => number;
  getTotalCellCount: () => number;
  editorManager?: EditorManager;
  meta?: TableMeta;
  /** Number of header rows (not cells). Used to convert unified row -> data row index. */
  headerRowCount?: number;
  /** When to open the cell editor. @default "dblclick" */
  editTrigger?: "click" | "dblclick";
  /** Trigger canvas redraw. */
  invalidate?: () => void;
  /** Scroll so that the given data row is visible. */
  scrollToRow?: (dataRowIndex: number) => void;
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
  meta,
  headerRowCount = 1,
  editTrigger = "dblclick",
  invalidate,
  scrollToRow,
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

  // React state for portal rendering
  const [editorState, setEditorState] = useState<EditorState | null>(null);

  // Keep meta ref fresh so the onCommit closure always sees the latest value
  const metaRef = useRef(meta);
  metaRef.current = meta;

  // headerRowCount ref — keeps onCommit closure fresh without re-running useEffect
  const headerRowCountRef = useRef(headerRowCount);
  headerRowCountRef.current = headerRowCount;

  const invalidateRef = useRef(invalidate);
  invalidateRef.current = invalidate;
  const scrollToRowRef = useRef(scrollToRow);
  scrollToRowRef.current = scrollToRow;

  // Ref for data so navigation closure always sees the latest value
  const dataRef = useRef(data);
  dataRef.current = data;

  // Ref for columnRegistry to read editCell/editorOptions at open time
  const columnRegistryRef = useRef(columnRegistry);
  columnRegistryRef.current = columnRegistry;

  /** Open editor at a specific cell coordinate (shared by double-click, click, and Tab navigation). */
  const openEditorAt = useCallback(
    (coord: CellCoord, initialChar?: string | null) => {
      if (coord.row < headerRowCount) return;

      const columns = columnRegistry.getAll();
      const col = columns[coord.col];
      if (!col?.editCell && !col?.editor) return;

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

      const rowData = dataRef.current[coord.row - headerRowCount];
      if (!rowData) return;
      const currentValue = rowData[col.id];

      // Determine editor type: editCell takes precedence
      const editorType = col.editCell ? "custom" : (col.editor ?? "text");

      editorManagerRef.current.open(coord, layout, editorType, currentValue, initialChar);
      selectionManagerRef.current.clear();
    },
    [
      columnRegistry,
      headerRowCount,
      selectionManagerRef,
      getLayoutBuf,
      getHeaderCount,
      getTotalCellCount,
    ],
  );

  // Ref so useEffect closure always calls the latest openEditorAt
  const openEditorAtRef = useRef(openEditorAt);
  openEditorAtRef.current = openEditorAt;

  // Wire onStateChange to sync React state
  useEffect(() => {
    const em = editorManagerRef.current;
    em.onStateChange = () => {
      const activeCoord = em.activeCoord;
      const activeLayout = em.activeLayout;
      const activeEditorType = em.editorType;
      if (em.isEditing && activeCoord && activeLayout && activeEditorType) {
        const columns = columnRegistryRef.current.getAll();
        const col = columns[activeCoord.col];
        setEditorState({
          coord: activeCoord,
          layout: activeLayout,
          editorType: activeEditorType,
          currentValue: em.currentValue,
          editCell: col?.editCell,
          editorOptions: col?.editorOptions,
          initialChar: em.initialChar,
        });
      } else {
        setEditorState(null);
      }
    };

    em.onCommit = (coord, value) => {
      const m = metaRef.current;
      if (!m?.updateData) return;
      const dataRowIndex = coord.row - headerRowCountRef.current;
      const columns = columnRegistryRef.current.getAll();
      const col = columns[coord.col];
      if (col && dataRowIndex >= 0) {
        m.updateData(dataRowIndex, col.id, value);
      }
    };
    em.onNavigate = (coord, direction) => {
      const columns = columnRegistryRef.current.getAll();
      const totalCols = columns.length;
      const hrc = headerRowCountRef.current;
      const totalRows = dataRef.current.length + hrc;

      let { row, col } = coord;
      // Step once in the direction
      if (direction === "next") col++;
      else col--;

      let target: CellCoord | null = null;
      while (row >= hrc && row < totalRows) {
        if (direction === "next") {
          for (; col < totalCols; col++) {
            if (isColumnEditable(columns[col])) {
              target = { row, col };
              break;
            }
          }
          if (target) break;
          row++;
          col = 0;
        } else {
          for (; col >= 0; col--) {
            if (isColumnEditable(columns[col])) {
              target = { row, col };
              break;
            }
          }
          if (target) break;
          row--;
          col = totalCols - 1;
        }
      }
      if (!target) return;

      const dataRowIndex = target.row - hrc;
      const scrollFn = scrollToRowRef.current;
      if (scrollFn) {
        scrollFn(dataRowIndex);
        // Render loop runs on rAF and updates layout buffer.
        // Wait two frames: first for render loop to process, second to read updated buffer.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            openEditorAtRef.current(target);
          });
        });
      } else {
        openEditorAtRef.current(target);
      }
    };
    return () => {
      em.onCommit = undefined;
      em.onNavigate = undefined;
      em.onStateChange = undefined;
    };
  }, [editorRef, columnRegistry]);

  const handleCellDoubleClick = useCallback(
    (coord: CellCoord) => {
      if (editTrigger === "dblclick") openEditorAt(coord);
    },
    [editTrigger, openEditorAt],
  );

  /** Single-click handler: opens editor when editTrigger="click", otherwise cancels. */
  const handleCellClick = useCallback(
    (coord: CellCoord) => {
      if (editTrigger === "click") {
        const columns = columnRegistry.getAll();
        const col = columns[coord.col];
        if ((col?.editCell || col?.editor) && coord.row >= headerRowCount) {
          openEditorAt(coord);
          return;
        }
      }
      // Cancel active editor when clicking non-editable cell or when editTrigger="dblclick"
      if (editorManagerRef.current.isEditing) {
        editorManagerRef.current.cancel();
      }
    },
    [editTrigger, columnRegistry, headerRowCount, openEditorAt],
  );

  /** Check if a cell coordinate refers to an editable column. */
  const isCellEditable = useCallback(
    (coord: CellCoord): boolean => {
      if (coord.row < headerRowCount) return false;
      const columns = columnRegistry.getAll();
      const col = columns[coord.col];
      return !!(col?.editCell || col?.editor);
    },
    [columnRegistry, headerRowCount],
  );

  /** Type-to-edit: single printable character opens editor with initialChar. */
  const handleTypingKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Only handle single printable characters
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
      // Only when a single cell is selected (not editing)
      if (editorManagerRef.current.isEditing) return;
      const sm = selectionManagerRef.current;
      const sel = sm.getNormalized();
      if (!sel) return;
      if (sel.minRow !== sel.maxRow || sel.minCol !== sel.maxCol) return;
      const coord: CellCoord = { row: sel.minRow, col: sel.minCol };
      if (!isCellEditable(coord)) return;
      e.preventDefault();
      openEditorAt(coord, e.key);
    },
    [isCellEditable, openEditorAt, selectionManagerRef],
  );

  // Build editor portal
  let editorPortal: React.ReactNode = null;
  if (editorState && editorRef.current) {
    const { layout, editorType, currentValue, editCell, editorOptions, initialChar } = editorState;
    const em = editorManagerRef.current;
    const commitCb = (v: unknown) => em.commitValue(v);
    const cancelCb = () => em.cancel();
    const commitAndNavCb = (v: unknown, dir: "next" | "prev") => em.commitAndNavigate(v, dir);

    let editorElement: React.ReactNode;
    if (editCell) {
      editorElement = editCell({
        value: currentValue,
        onCommit: commitCb,
        onCancel: cancelCb,
        onCommitAndNavigate: commitAndNavCb,
        layout,
        initialChar,
      });
    } else if (editorType === "select" && editorOptions?.options) {
      editorElement = (
        <SelectEditor
          value={currentValue}
          onCommit={commitCb}
          onCancel={cancelCb}
          onCommitAndNavigate={commitAndNavCb}
          layout={layout}
          options={editorOptions.options}
        />
      );
    } else if (editorType === "number") {
      editorElement = (
        <NumberEditor
          value={currentValue}
          onCommit={commitCb}
          onCancel={cancelCb}
          onCommitAndNavigate={commitAndNavCb}
          layout={layout}
          initialChar={initialChar}
        />
      );
    } else {
      editorElement = (
        <TextEditor
          value={currentValue}
          onCommit={commitCb}
          onCancel={cancelCb}
          onCommitAndNavigate={commitAndNavCb}
          layout={layout}
          initialChar={initialChar}
        />
      );
    }

    editorPortal = createPortal(editorElement, editorRef.current);
  }

  return {
    editorManagerRef,
    handleCellDoubleClick,
    handleCellClick,
    isCellEditable,
    editorPortal,
    handleTypingKeyDown,
  };
}

function isColumnEditable(col: ColumnProps | undefined): boolean {
  if (!col) return false;
  return !!(col.editCell || col.editor);
}

import { useRef, useEffect, useCallback } from "react";
import type { NormalizedRange, CellCoord } from "../../types";
import type { ColumnRegistry } from "../../adapter/column-registry";
import type { MemoryBridge } from "../../adapter/memory-bridge";
import type { StringTable } from "../../adapter/string-table";
import { SelectionManager, buildTSV } from "../../adapter/selection-manager";

export interface UseSelectionParams {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  enableSelection: boolean;
  selectionProp?: NormalizedRange | null;
  onSelectionChange?: (selection: NormalizedRange | null) => void;
  onCopy?: (tsv: string, range: NormalizedRange) => string | void;
  onPaste?: (text: string, target: CellCoord) => void;
  columnRegistry: ColumnRegistry;
  invalidate: () => void;
  getVisStart: () => number;
  getMemoryBridge: () => MemoryBridge | null;
  getStringTable: () => StringTable;
}

export function useSelection({
  canvasRef,
  enableSelection,
  selectionProp,
  onSelectionChange,
  onCopy,
  onPaste,
  columnRegistry,
  invalidate,
  getVisStart,
  getMemoryBridge,
  getStringTable,
}: UseSelectionParams) {
  const selectionManagerRef = useRef(new SelectionManager());
  const selectionEnabledRef = useRef(enableSelection);
  selectionEnabledRef.current = enableSelection;

  // Attach hidden textarea for clipboard + selection change notification
  useEffect(() => {
    const container = canvasRef.current?.parentElement;
    if (!container) return;
    const sm = selectionManagerRef.current;
    sm.setOnDirty(() => {
      invalidate();
      if (selectionEnabledRef.current) {
        onSelectionChange?.(sm.getNormalized());
      }
    });
    sm.attachClipboard(container);
    return () => sm.detachClipboard();
  }, [canvasRef, onSelectionChange, invalidate]);

  // Sync controlled selection prop → SelectionManager
  useEffect(() => {
    if (selectionProp === undefined) return; // uncontrolled
    const sm = selectionManagerRef.current;
    if (selectionProp === null) {
      sm.clear();
    } else {
      sm.setRange({
        startRow: selectionProp.minRow,
        startCol: selectionProp.minCol,
        endRow: selectionProp.maxRow,
        endCol: selectionProp.maxCol,
      });
    }
  }, [selectionProp]);

  const handleCellMouseDown = useCallback(
    (coord: CellCoord, shiftKey: boolean) => {
      if (!selectionEnabledRef.current) return;
      const cols = columnRegistry.getAll();
      if (cols[coord.col]?.selectable === false) return;
      const sm = selectionManagerRef.current;
      if (shiftKey && sm.hasSelection) {
        sm.extendTo(coord.row, coord.col);
      } else {
        sm.start(coord.row, coord.col);
      }
    },
    [columnRegistry],
  );

  const handleCellMouseMove = useCallback((coord: CellCoord) => {
    if (!selectionEnabledRef.current) return;
    const sm = selectionManagerRef.current;
    if (sm.isDragging) sm.extend(coord.row, coord.col);
  }, []);

  const handleCellMouseUp = useCallback(() => {
    selectionManagerRef.current.finish();
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!selectionEnabledRef.current) return;
      const sm = selectionManagerRef.current;
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && sm.hasSelection) {
        e.preventDefault();
        const norm = sm.getNormalized()!;
        const viewIndices = getMemoryBridge()?.getViewIndices();
        const strTable = getStringTable();
        const visStart = getVisStart();
        const getText = (viewRow: number, col: number) => {
          const actualRow = viewIndices?.[viewRow - visStart] ?? viewRow;
          return strTable.get(col, actualRow);
        };
        const tsv = buildTSV(norm, getText);
        const custom = onCopy?.(tsv, norm);
        sm.writeToClipboardText(typeof custom === "string" ? custom : tsv);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v" && onPaste) {
        // Paste stub: read clipboard and delegate to onPaste callback
        // Full implementation is future work
      }
      if (e.key === "Escape") sm.clear();
    },
    [onCopy, onPaste, getMemoryBridge, getStringTable, getVisStart],
  );

  return {
    selectionManagerRef,
    selectionEnabledRef,
    handleCellMouseDown,
    handleCellMouseMove,
    handleCellMouseUp,
    handleKeyDown,
  };
}

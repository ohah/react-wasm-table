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
  onBeforeSelectionChange?: (next: NormalizedRange | null) => boolean | void;
  onCopy?: (tsv: string, range: NormalizedRange) => string | void;
  onPaste?: (text: string, target: CellCoord) => void;
  columnRegistry: ColumnRegistry;
  invalidate: () => void;
  getMemoryBridge: () => MemoryBridge | null;
  getStringTable: () => StringTable;
  selectionManager?: SelectionManager;
}

export function useSelection({
  canvasRef,
  enableSelection,
  selectionProp,
  onSelectionChange,
  onBeforeSelectionChange,
  onCopy,
  onPaste,
  columnRegistry,
  invalidate,
  getMemoryBridge,
  getStringTable,
  selectionManager,
}: UseSelectionParams) {
  // Adapter DI: prefer external prop, lazy-create fallback only when needed
  const fallbackSmRef = useRef<SelectionManager | null>(null);
  const selectionManagerRef = useRef<SelectionManager>(null!);
  if (selectionManager) {
    selectionManagerRef.current = selectionManager;
  } else {
    if (!fallbackSmRef.current) fallbackSmRef.current = new SelectionManager();
    selectionManagerRef.current = fallbackSmRef.current;
  }
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
      let proposed: NormalizedRange;
      if (shiftKey && sm.hasSelection) {
        const r = sm.getRange()!;
        proposed = {
          minRow: Math.min(r.startRow, coord.row),
          maxRow: Math.max(r.startRow, coord.row),
          minCol: Math.min(r.startCol, coord.col),
          maxCol: Math.max(r.startCol, coord.col),
        };
      } else {
        proposed = { minRow: coord.row, maxRow: coord.row, minCol: coord.col, maxCol: coord.col };
      }
      if (onBeforeSelectionChange?.(proposed) === false) return;
      if (shiftKey && sm.hasSelection) {
        sm.extendTo(coord.row, coord.col);
      } else {
        sm.start(coord.row, coord.col);
      }
    },
    [columnRegistry, onBeforeSelectionChange],
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
        const norm = sm.getNormalized();
        if (!norm) return;
        const viewIndices = getMemoryBridge()?.getViewIndices();
        const strTable = getStringTable();
        const getText = (viewRow: number, col: number) => {
          const actualRow = viewIndices?.[viewRow] ?? viewRow;
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
      if (e.key === "Escape") {
        if (onBeforeSelectionChange?.(null) === false) return;
        sm.clear();
      }
    },
    [onCopy, onPaste, onBeforeSelectionChange, getMemoryBridge, getStringTable],
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

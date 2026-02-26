import { useEffect } from "react";
import type { CellCoord } from "../../types";
import type { EventManager } from "../../adapter/event-manager";
import type { EditorManager } from "../../adapter/editor-manager";

export interface UseEventAttachmentParams {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  eventManager: EventManager;
  editorManagerRef: React.RefObject<EditorManager>;
  handlers: {
    handleHeaderClick: (colIndex: number) => void;
    handleCellDoubleClick: (coord: CellCoord) => void;
    handleCellMouseDown: (coord: CellCoord, shiftKey: boolean) => void;
    handleCellMouseMove: (coord: CellCoord) => void;
    handleCellMouseUp: () => void;
    handleDragEdge: (dy: number, dx: number) => void;
    handleWheel: (deltaY: number, deltaX: number) => void;
    handleKeyDown: (e: KeyboardEvent) => void;
    stopAutoScroll: () => void;
  };
  rowHeight: number;
  headerHeight: number;
  height: number;
}

export function useEventAttachment({
  canvasRef,
  eventManager,
  editorManagerRef,
  handlers,
  rowHeight,
  headerHeight,
  height,
}: UseEventAttachmentParams) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const em = eventManager;
    em.attach(
      canvas,
      {
        onHeaderClick: handlers.handleHeaderClick,
        onCellClick: () => {
          if (editorManagerRef.current.isEditing) {
            editorManagerRef.current.cancel();
          }
        },
        onCellDoubleClick: handlers.handleCellDoubleClick,
        onCellMouseDown: (coord, shiftKey) => {
          if (editorManagerRef.current.isEditing) editorManagerRef.current.cancel();
          handlers.handleCellMouseDown(coord, shiftKey);
        },
        onCellMouseMove: handlers.handleCellMouseMove,
        onDragEdge: handlers.handleDragEdge,
        onCellMouseUp: () => {
          handlers.handleCellMouseUp();
          handlers.stopAutoScroll();
        },
        onKeyDown: handlers.handleKeyDown,
        onScroll: handlers.handleWheel,
      },
      { lineHeight: rowHeight, pageHeight: height - headerHeight },
    );

    return () => {
      em.detach();
    };
  }, [
    canvasRef,
    eventManager,
    editorManagerRef,
    handlers.handleHeaderClick,
    handlers.handleCellDoubleClick,
    handlers.handleCellMouseDown,
    handlers.handleCellMouseMove,
    handlers.handleCellMouseUp,
    handlers.handleDragEdge,
    handlers.handleWheel,
    handlers.handleKeyDown,
    handlers.stopAutoScroll,
    rowHeight,
    headerHeight,
    height,
  ]);
}

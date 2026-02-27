import { describe, expect, it, mock } from "bun:test";
import { renderHook } from "@testing-library/react";
import { useEventAttachment } from "../hooks/use-event-attachment";
import { EditorManager } from "../../adapter/editor-manager";
import type { EventCoords } from "../../adapter/event-manager";
import type { GridCellEvent, GridHeaderEvent, GridKeyboardEvent } from "../../types";

/** Minimal EventManager mock that records attach/detach calls. */
function makeMockEventManager() {
  return {
    attach: mock(() => {}),
    detach: mock(() => {}),
  } as any;
}

function makeCanvasRef() {
  const canvas = document.createElement("canvas");
  return { current: canvas } as React.RefObject<HTMLCanvasElement>;
}

function makeMockHandlers() {
  return {
    handleHeaderClick: mock(() => {}),
    handleCellDoubleClick: mock(() => {}),
    handleCellMouseDown: mock(() => {}),
    handleCellMouseMove: mock(() => {}),
    handleCellMouseUp: mock(() => {}),
    handleDragEdge: mock(() => {}),
    handleWheel: mock(() => {}),
    handleKeyDown: mock(() => {}),
    stopAutoScroll: mock(() => {}),
  };
}

/** Create a mock native MouseEvent and EventCoords for handler calls. */
function mockMouseArgs(): [MouseEvent, EventCoords] {
  return [
    new MouseEvent("click"),
    { contentX: 50, contentY: 10, viewportX: 50, viewportY: 10 },
  ];
}

describe("useEventAttachment (renderHook)", () => {
  it("calls em.attach on mount with canvas and handlers", () => {
    const em = makeMockEventManager();
    const canvasRef = makeCanvasRef();
    const editorManager = new EditorManager();
    const handlers = makeMockHandlers();

    renderHook(() =>
      useEventAttachment({
        canvasRef,
        eventManagerRef: { current: em },
        editorManagerRef: { current: editorManager },
        handlers,
        rowHeight: 36,
        headerHeight: 40,
        height: 600,
      }),
    );

    expect(em.attach).toHaveBeenCalledTimes(1);
    // First arg is canvas, second is handlers object, third is scroll config
    const callArgs = em.attach.mock.calls[0];
    expect(callArgs[0]).toBe(canvasRef.current);
    expect(callArgs[2]).toEqual({ lineHeight: 36, pageHeight: 560 });
  });

  it("calls em.detach on unmount", () => {
    const em = makeMockEventManager();
    const handlers = makeMockHandlers();

    const { unmount } = renderHook(() =>
      useEventAttachment({
        canvasRef: makeCanvasRef(),
        eventManagerRef: { current: em },
        editorManagerRef: { current: new EditorManager() },
        handlers,
        rowHeight: 36,
        headerHeight: 40,
        height: 600,
      }),
    );

    unmount();
    expect(em.detach).toHaveBeenCalledTimes(1);
  });

  it("does not attach when canvas is null", () => {
    const em = makeMockEventManager();
    const handlers = makeMockHandlers();

    renderHook(() =>
      useEventAttachment({
        canvasRef: { current: null },
        eventManagerRef: { current: em },
        editorManagerRef: { current: new EditorManager() },
        handlers,
        rowHeight: 36,
        headerHeight: 40,
        height: 600,
      }),
    );

    expect(em.attach).not.toHaveBeenCalled();
  });

  it("does not attach when eventManager is null", () => {
    const handlers = makeMockHandlers();

    // Should not throw
    renderHook(() =>
      useEventAttachment({
        canvasRef: makeCanvasRef(),
        eventManagerRef: { current: null as any },
        editorManagerRef: { current: new EditorManager() },
        handlers,
        rowHeight: 36,
        headerHeight: 40,
        height: 600,
      }),
    );
  });

  describe("callback interception via refs", () => {
    it("wraps onHeaderClick — preventDefault prevents handleHeaderClick", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const onHeaderClick = mock((event: GridHeaderEvent) => {
        event.preventDefault();
      });

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: new EditorManager() },
          handlers,
          onHeaderClick,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
        }),
      );

      // Extract the wrapped handler passed to em.attach
      const attachedHandlers = em.attach.mock.calls[0]![1];
      const [native, coords] = mockMouseArgs();
      attachedHandlers.onHeaderClick(2, native, coords);

      expect(onHeaderClick).toHaveBeenCalledTimes(1);
      expect(onHeaderClick.mock.calls[0]![0].colIndex).toBe(2);
      expect(handlers.handleHeaderClick).not.toHaveBeenCalled();
    });

    it("wraps onCellClick — preventDefault prevents editor cancel", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const editorManager = new EditorManager();
      const cancelSpy = mock(() => {});
      editorManager.cancel = cancelSpy;
      const onCellClick = mock((event: GridCellEvent) => {
        event.preventDefault();
      });

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: editorManager },
          handlers,
          onCellClick,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      const [native, coords] = mockMouseArgs();
      attachedHandlers.onCellClick({ row: 0, col: 0 }, native, coords);

      expect(onCellClick).toHaveBeenCalled();
      expect(onCellClick.mock.calls[0]![0].cell).toEqual({ row: 0, col: 0 });
      expect(cancelSpy).not.toHaveBeenCalled();
    });

    it("wraps onCellDoubleClick — preventDefault prevents handleCellDoubleClick", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const onCellDoubleClick = mock((event: GridCellEvent) => {
        event.preventDefault();
      });

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: new EditorManager() },
          handlers,
          onCellDoubleClick,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      const [native, coords] = mockMouseArgs();
      attachedHandlers.onCellDoubleClick({ row: 0, col: 0 }, native, coords);

      expect(onCellDoubleClick).toHaveBeenCalled();
      expect(onCellDoubleClick.mock.calls[0]![0].cell).toEqual({ row: 0, col: 0 });
      expect(handlers.handleCellDoubleClick).not.toHaveBeenCalled();
    });

    it("wraps onKeyDown — preventDefault prevents handleKeyDown", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const onKeyDown = mock((event: GridKeyboardEvent) => {
        event.preventDefault();
      });

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: new EditorManager() },
          handlers,
          onKeyDown,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      const event = new KeyboardEvent("keydown", { key: "Escape" });
      attachedHandlers.onKeyDown(event);

      expect(onKeyDown).toHaveBeenCalled();
      expect(onKeyDown.mock.calls[0]![0].key).toBe("Escape");
      expect(handlers.handleKeyDown).not.toHaveBeenCalled();
    });

    it("mouseUp calls both handleCellMouseUp and stopAutoScroll", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: new EditorManager() },
          handlers,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      attachedHandlers.onCellMouseUp();

      expect(handlers.handleCellMouseUp).toHaveBeenCalledTimes(1);
      expect(handlers.stopAutoScroll).toHaveBeenCalledTimes(1);
    });

    it("mouseDown cancels active editor", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const editorManager = new EditorManager();
      const container = document.createElement("div");
      editorManager.setContainer(container);
      editorManager.open(
        { row: 0, col: 0 },
        { row: 0, col: 0, x: 0, y: 0, width: 100, height: 36, contentAlign: "left" },
        "text",
        "test",
      );
      expect(editorManager.isEditing).toBe(true);

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: editorManager },
          handlers,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      const [native, coords] = mockMouseArgs();
      attachedHandlers.onCellMouseDown({ row: 1, col: 0 }, false, native, coords);

      expect(editorManager.isEditing).toBe(false);
      expect(handlers.handleCellMouseDown).toHaveBeenCalled();
    });

    it("onCellClick without preventDefault allows default editor cancel", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const editorManager = new EditorManager();
      const container = document.createElement("div");
      editorManager.setContainer(container);
      editorManager.open(
        { row: 0, col: 0 },
        { row: 0, col: 0, x: 0, y: 0, width: 100, height: 36, contentAlign: "left" },
        "text",
        "test",
      );
      const onCellClick = mock((_event: GridCellEvent) => {
        // Don't call preventDefault — default behavior should proceed
      });

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: editorManager },
          handlers,
          onCellClick,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      const [native, coords] = mockMouseArgs();
      attachedHandlers.onCellClick({ row: 0, col: 0 }, native, coords);

      expect(onCellClick).toHaveBeenCalledTimes(1);
      expect(editorManager.isEditing).toBe(false); // editor was cancelled
    });

    it("enriched event contains nativeEvent and coordinates", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      let receivedEvent: GridCellEvent | null = null;
      const onCellClick = mock((event: GridCellEvent) => {
        receivedEvent = event;
      });

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: new EditorManager() },
          handlers,
          onCellClick,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      const native = new MouseEvent("click", { shiftKey: true, metaKey: true });
      const coords: EventCoords = { contentX: 150, contentY: 60, viewportX: 50, viewportY: 60 };
      attachedHandlers.onCellClick({ row: 2, col: 1 }, native, coords);

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent!.cell).toEqual({ row: 2, col: 1 });
      expect(receivedEvent!.nativeEvent).toBe(native);
      expect(receivedEvent!.contentX).toBe(150);
      expect(receivedEvent!.viewportX).toBe(50);
      expect(receivedEvent!.shiftKey).toBe(true);
      expect(receivedEvent!.metaKey).toBe(true);
    });
  });
});

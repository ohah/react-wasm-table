import { describe, expect, it, mock } from "bun:test";
import { renderHook } from "@testing-library/react";
import { EditorManager } from "../../adapter/editor-manager";
import type { EventCoords } from "../../adapter/event-manager";
import type { GridCellEvent, GridHeaderEvent, GridKeyboardEvent } from "../../types";
import { useEventAttachment } from "../hooks/use-event-attachment";

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
  return [new MouseEvent("click"), { contentX: 50, contentY: 10, viewportX: 50, viewportY: 10 }];
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
      expect(onCellDoubleClick.mock.calls[0]![0].cell).toEqual({
        row: 0,
        col: 0,
      });
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

    it("mouseDown cancels active editor via onCanvasEvent", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const editorManager = new EditorManager();
      editorManager.open(
        { row: 0, col: 0 },
        {
          row: 0,
          col: 0,
          x: 0,
          y: 0,
          width: 100,
          height: 36,
          contentAlign: "left",
        },
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
      // onCanvasEvent fires before onCellMouseDown and commits the editor
      attachedHandlers.onCanvasEvent(
        "mousedown",
        native,
        { type: "cell", cell: { row: 1, col: 0 } },
        coords,
      );

      expect(editorManager.isEditing).toBe(false);
    });

    it("onCellClick without preventDefault allows default editor cancel", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const editorManager = new EditorManager();
      editorManager.open(
        { row: 0, col: 0 },
        {
          row: 0,
          col: 0,
          x: 0,
          y: 0,
          width: 100,
          height: 36,
          contentAlign: "left",
        },
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
      const coords: EventCoords = {
        contentX: 150,
        contentY: 60,
        viewportX: 50,
        viewportY: 60,
      };
      attachedHandlers.onCellClick({ row: 2, col: 1 }, native, coords);

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent!.cell).toEqual({ row: 2, col: 1 });
      expect(receivedEvent!.nativeEvent).toBe(native);
      expect(receivedEvent!.contentX).toBe(150);
      expect(receivedEvent!.viewportX).toBe(50);
      expect(receivedEvent!.shiftKey).toBe(true);
      expect(receivedEvent!.metaKey).toBe(true);
    });

    it("wraps onCellMouseDown — fires dispatch and calls handler", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const onCellMouseDown = mock((_event: GridCellEvent) => {});

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: new EditorManager() },
          handlers,
          onCellMouseDown,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      const [native, coords] = mockMouseArgs();
      attachedHandlers.onCellMouseDown({ row: 1, col: 2 }, false, native, coords);

      expect(onCellMouseDown).toHaveBeenCalledTimes(1);
      expect(handlers.handleCellMouseDown).toHaveBeenCalledWith({ row: 1, col: 2 }, false);
    });

    it("wraps onCellMouseMove — calls dispatch and handler", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const onCellMouseMove = mock((_event: GridCellEvent) => {});

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: new EditorManager() },
          handlers,
          onCellMouseMove,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      const [native, coords] = mockMouseArgs();
      attachedHandlers.onCellMouseMove({ row: 0, col: 1 }, native, coords);

      expect(onCellMouseMove).toHaveBeenCalledTimes(1);
      expect(handlers.handleCellMouseMove).toHaveBeenCalledWith({ row: 0, col: 1 });
    });

    it("wraps onScroll — cancels editor and calls handleWheel", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const editorManager = new EditorManager();
      editorManager.open(
        { row: 0, col: 0 },
        { row: 0, col: 0, x: 0, y: 0, width: 100, height: 36, contentAlign: "left" },
        "text",
        "test",
      );

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
      attachedHandlers.onScroll(100, 0, null);

      expect(editorManager.isEditing).toBe(false);
      expect(handlers.handleWheel).toHaveBeenCalledWith(100, 0);
    });

    it("onContextMenu dispatches event when handler is provided", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const onContextMenu = mock(() => {});

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: new EditorManager() },
          handlers,
          onContextMenu,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      expect(attachedHandlers.onContextMenu).toBeDefined();
      const [native, coords] = mockMouseArgs();
      attachedHandlers.onContextMenu(native, { type: "cell", cell: { row: 0, col: 0 } }, coords);

      expect(onContextMenu).toHaveBeenCalledTimes(1);
    });

    it("onContextMenu is undefined when no handler provided", () => {
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
      expect(attachedHandlers.onContextMenu).toBeUndefined();
    });

    it("onTouchStart fires dispatch", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const onTouchStart = mock(() => {});

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: new EditorManager() },
          handlers,
          onTouchStart,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      const coords = { contentX: 10, contentY: 20, viewportX: 10, viewportY: 20 };
      const touchEvent = new TouchEvent("touchstart", {
        touches: [new Touch({ identifier: 0, target: document.createElement("canvas") })],
      });
      attachedHandlers.onTouchStart(touchEvent, coords, { type: "cell", cell: { row: 0, col: 0 } });

      expect(onTouchStart).toHaveBeenCalledTimes(1);
    });

    it("onTouchMove fires dispatch", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const onTouchMove = mock(() => {});

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: new EditorManager() },
          handlers,
          onTouchMove,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      const coords = { contentX: 10, contentY: 20, viewportX: 10, viewportY: 20 };
      const touchEvent = new TouchEvent("touchmove", {
        touches: [new Touch({ identifier: 0, target: document.createElement("canvas") })],
      });
      attachedHandlers.onTouchMove(touchEvent, coords, { type: "empty" });

      expect(onTouchMove).toHaveBeenCalledTimes(1);
    });

    it("onTouchEnd fires dispatch", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const onTouchEnd = mock(() => {});

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: new EditorManager() },
          handlers,
          onTouchEnd,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      const coords = { contentX: 10, contentY: 20, viewportX: 10, viewportY: 20 };
      const touchEvent = new TouchEvent("touchend", { touches: [] });
      attachedHandlers.onTouchEnd(touchEvent, coords, { type: "cell", cell: { row: 1, col: 1 } });

      expect(onTouchEnd).toHaveBeenCalledTimes(1);
    });

    it("onCellHover sets cursor based on renderer", () => {
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
      // Test onCellHover with null (cursor cleared)
      attachedHandlers.onCellHover(null);
      // And with a coord
      attachedHandlers.onCellHover({ row: 0, col: 0 });
    });

    it("onCanvasEvent mousemove tracks hover cell changes", () => {
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
      const [native, coords] = mockMouseArgs();

      // First mousemove: enters cell (0,0)
      attachedHandlers.onCanvasEvent(
        "mousemove",
        native,
        { type: "cell", cell: { row: 0, col: 0 } },
        coords,
      );
      // Second mousemove: moves to different cell (1,0)
      attachedHandlers.onCanvasEvent(
        "mousemove",
        native,
        { type: "cell", cell: { row: 1, col: 0 } },
        coords,
      );
      // Third mousemove: leaves cell area
      attachedHandlers.onCanvasEvent("mousemove", native, { type: "empty" }, coords);
    });

    it("onCanvasEvent mouseup dispatches component handler", () => {
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
      const [native, coords] = mockMouseArgs();
      attachedHandlers.onCanvasEvent(
        "mouseup",
        native,
        { type: "cell", cell: { row: 0, col: 0 } },
        coords,
      );
    });

    it("passes onResizeStart/Move/End handlers", () => {
      const em = makeMockEventManager();
      const handleResizeStart = mock(() => {});
      const handleResizeMove = mock(() => {});
      const handleResizeEnd = mock(() => {});
      const handleResizeHover = mock(() => {});
      const handlers = {
        ...makeMockHandlers(),
        handleResizeStart,
        handleResizeMove,
        handleResizeEnd,
        handleResizeHover,
      };

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
      expect(attachedHandlers.onResizeStart).toBe(handleResizeStart);
      expect(attachedHandlers.onResizeMove).toBe(handleResizeMove);
      expect(attachedHandlers.onResizeEnd).toBe(handleResizeEnd);
      expect(attachedHandlers.onResizeHover).toBe(handleResizeHover);
    });

    it("onCellMouseDown preventDefault prevents internal handler", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const onCellMouseDown = mock((event: GridCellEvent) => {
        event.preventDefault();
      });

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: new EditorManager() },
          handlers,
          onCellMouseDown,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      const [native, coords] = mockMouseArgs();
      attachedHandlers.onCellMouseDown({ row: 0, col: 0 }, false, native, coords);

      expect(onCellMouseDown).toHaveBeenCalled();
      expect(handlers.handleCellMouseDown).not.toHaveBeenCalled();
    });

    it("onCellMouseMove preventDefault prevents internal handler", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const onCellMouseMove = mock((event: GridCellEvent) => {
        event.preventDefault();
      });

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: new EditorManager() },
          handlers,
          onCellMouseMove,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      const [native, coords] = mockMouseArgs();
      attachedHandlers.onCellMouseMove({ row: 0, col: 0 }, native, coords);

      expect(onCellMouseMove).toHaveBeenCalled();
      expect(handlers.handleCellMouseMove).not.toHaveBeenCalled();
    });

    it("onScroll preventDefault prevents handleWheel", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const onScroll = mock((event: any) => {
        event.preventDefault();
      });

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: new EditorManager() },
          handlers,
          onScroll,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      attachedHandlers.onScroll(50, 0, null);

      expect(onScroll).toHaveBeenCalled();
      expect(handlers.handleWheel).not.toHaveBeenCalled();
    });

    it("onHeaderMouseDown handler is passed when provided", () => {
      const em = makeMockEventManager();
      const handleHeaderMouseDown = mock(() => {});
      const handlers = { ...makeMockHandlers(), handleHeaderMouseDown };

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
      expect(attachedHandlers.onHeaderMouseDown).toBeDefined();
      attachedHandlers.onHeaderMouseDown!(2);
      expect(handleHeaderMouseDown).toHaveBeenCalledWith(2);
    });

    it("passes DnD handlers through", () => {
      const em = makeMockEventManager();
      const handleColumnDnDMove = mock(() => {});
      const handleColumnDnDEnd = mock(() => {});
      const handlers = { ...makeMockHandlers(), handleColumnDnDMove, handleColumnDnDEnd };

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
      expect(attachedHandlers.onColumnDnDMove).toBe(handleColumnDnDMove);
      expect(attachedHandlers.onColumnDnDEnd).toBe(handleColumnDnDEnd);
    });
  });

  describe("component-level handlers via getInstructionForCellRef", () => {
    function makeInstructionRef(instruction: any) {
      return {
        current: (_row: number, _col: number) => instruction,
      } as any;
    }

    function makeRegistryRef(renderers?: Record<string, any>) {
      return {
        current: {
          get: (type: string) => renderers?.[type],
        },
      } as any;
    }

    it("invokes component onClick handler on cellClick", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const componentClick = mock(() => {});
      const instruction = { type: "custom", _handlers: { onClick: componentClick } };

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: new EditorManager() },
          handlers,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
          getInstructionForCellRef: makeInstructionRef(instruction),
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      const [native, coords] = mockMouseArgs();
      attachedHandlers.onCellClick({ row: 0, col: 0 }, native, coords);

      expect(componentClick).toHaveBeenCalledTimes(1);
    });

    it("invokes renderer onCellClick (e.g., Link default action)", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const rendererOnCellClick = mock(() => {});
      const instruction = { type: "link", value: "test" };

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: new EditorManager() },
          handlers,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
          getInstructionForCellRef: makeInstructionRef(instruction),
          cellRendererRegistryRef: makeRegistryRef({
            link: { onCellClick: rendererOnCellClick },
          }),
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      const [native, coords] = mockMouseArgs();
      attachedHandlers.onCellClick({ row: 0, col: 0 }, native, coords);

      expect(rendererOnCellClick).toHaveBeenCalledWith(instruction);
    });

    it("calls handleCellClick when handler is provided and not prevented", () => {
      const em = makeMockEventManager();
      const handleCellClick = mock(() => {});
      const handlers = { ...makeMockHandlers(), handleCellClick };

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
      const [native, coords] = mockMouseArgs();
      attachedHandlers.onCellClick({ row: 1, col: 2 }, native, coords);

      expect(handleCellClick).toHaveBeenCalledWith({ row: 1, col: 2 });
    });

    it("invokes component onDoubleClick handler", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const componentDblClick = mock(() => {});
      const instruction = { type: "custom", _handlers: { onDoubleClick: componentDblClick } };

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: new EditorManager() },
          handlers,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
          getInstructionForCellRef: makeInstructionRef(instruction),
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      const [native, coords] = mockMouseArgs();
      attachedHandlers.onCellDoubleClick({ row: 0, col: 0 }, native, coords);

      expect(componentDblClick).toHaveBeenCalledTimes(1);
      expect(handlers.handleCellDoubleClick).toHaveBeenCalled();
    });

    it("invokes component onMouseDown handler", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const componentMouseDown = mock(() => {});
      const instruction = { type: "custom", _handlers: { onMouseDown: componentMouseDown } };

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: new EditorManager() },
          handlers,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
          getInstructionForCellRef: makeInstructionRef(instruction),
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      const [native, coords] = mockMouseArgs();
      attachedHandlers.onCellMouseDown({ row: 0, col: 0 }, false, native, coords);

      expect(componentMouseDown).toHaveBeenCalledTimes(1);
    });

    it("handleKeyDown fires when not prevented, also calls handleTypingKeyDown", () => {
      const em = makeMockEventManager();
      const handleTypingKeyDown = mock(() => {});
      const handlers = { ...makeMockHandlers(), handleTypingKeyDown };

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
      const event = new KeyboardEvent("keydown", { key: "a" });
      attachedHandlers.onKeyDown(event);

      expect(handlers.handleKeyDown).toHaveBeenCalledWith(event);
      expect(handleTypingKeyDown).toHaveBeenCalledWith(event);
    });

    it("onCellHover sets renderer cursor when available", () => {
      const em = makeMockEventManager();
      const canvasRef = makeCanvasRef();
      const handlers = makeMockHandlers();
      const instruction = { type: "link" };

      renderHook(() =>
        useEventAttachment({
          canvasRef,
          eventManagerRef: { current: em },
          editorManagerRef: { current: new EditorManager() },
          handlers,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
          getInstructionForCellRef: makeInstructionRef(instruction),
          cellRendererRegistryRef: makeRegistryRef({
            link: { cursor: "pointer" },
          }),
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      attachedHandlers.onCellHover({ row: 0, col: 0 });
      expect(canvasRef.current!.style.cursor).toBe("pointer");
    });

    it("onCellHover sets text cursor for editable cells", () => {
      const em = makeMockEventManager();
      const canvasRef = makeCanvasRef();
      const isCellEditable = mock(() => true);
      const handlers = { ...makeMockHandlers(), isCellEditable };

      renderHook(() =>
        useEventAttachment({
          canvasRef,
          eventManagerRef: { current: em },
          editorManagerRef: { current: new EditorManager() },
          handlers,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
          getInstructionForCellRef: makeInstructionRef({ type: "text" }),
          cellRendererRegistryRef: makeRegistryRef({}),
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      attachedHandlers.onCellHover({ row: 1, col: 0 });
      expect(canvasRef.current!.style.cursor).toBe("text");
    });

    it("onCanvasEvent mousemove fires component mouseEnter and mouseLeave", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const onMouseEnter = mock(() => {});
      const onMouseLeave = mock(() => {});
      const instruction = { type: "custom", _handlers: { onMouseEnter, onMouseLeave } };

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: new EditorManager() },
          handlers,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
          getInstructionForCellRef: makeInstructionRef(instruction),
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      const [native, coords] = mockMouseArgs();

      // Enter cell (0,0) → triggers mouseEnter
      attachedHandlers.onCanvasEvent(
        "mousemove",
        native,
        { type: "cell", cell: { row: 0, col: 0 } },
        coords,
      );
      expect(onMouseEnter).toHaveBeenCalledTimes(1);

      // Move to cell (1,0) → triggers mouseLeave on (0,0) and mouseEnter on (1,0)
      attachedHandlers.onCanvasEvent(
        "mousemove",
        native,
        { type: "cell", cell: { row: 1, col: 0 } },
        coords,
      );
      expect(onMouseLeave).toHaveBeenCalledTimes(1);
      expect(onMouseEnter).toHaveBeenCalledTimes(2);
    });

    it("onCanvasEvent mouseup fires component onMouseUp", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const onMouseUp = mock(() => {});
      const instruction = { type: "custom", _handlers: { onMouseUp } };

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: new EditorManager() },
          handlers,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
          getInstructionForCellRef: makeInstructionRef(instruction),
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      const [native, coords] = mockMouseArgs();
      attachedHandlers.onCanvasEvent(
        "mouseup",
        native,
        { type: "cell", cell: { row: 0, col: 0 } },
        coords,
      );

      expect(onMouseUp).toHaveBeenCalledTimes(1);
    });

    it("onTouchStart fires component-level onTouchStart handler", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const componentTouchStart = mock(() => {});
      const instruction = { type: "custom", _handlers: { onTouchStart: componentTouchStart } };

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: new EditorManager() },
          handlers,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
          getInstructionForCellRef: makeInstructionRef(instruction),
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      const coords = { contentX: 10, contentY: 20, viewportX: 10, viewportY: 20 };
      const touchEvent = new TouchEvent("touchstart", {
        touches: [new Touch({ identifier: 0, target: document.createElement("canvas") })],
      });
      attachedHandlers.onTouchStart(touchEvent, coords, { type: "cell", cell: { row: 0, col: 0 } });

      expect(componentTouchStart).toHaveBeenCalledTimes(1);
    });

    it("onTouchEnd fires component-level onTouchEnd handler", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const componentTouchEnd = mock(() => {});
      const instruction = { type: "custom", _handlers: { onTouchEnd: componentTouchEnd } };

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: new EditorManager() },
          handlers,
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
          getInstructionForCellRef: makeInstructionRef(instruction),
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      const coords = { contentX: 10, contentY: 20, viewportX: 10, viewportY: 20 };
      const touchEvent = new TouchEvent("touchend", { touches: [] });
      attachedHandlers.onTouchEnd(touchEvent, coords, { type: "cell", cell: { row: 1, col: 1 } });

      expect(componentTouchEnd).toHaveBeenCalledTimes(1);
    });

    it("dispatches through middleware chain", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const middlewareCalled = mock(() => {});
      const middleware: any = (channel: any, _event: any, next: any) => {
        middlewareCalled(channel);
        next();
      };

      renderHook(() =>
        useEventAttachment({
          canvasRef: makeCanvasRef(),
          eventManagerRef: { current: em },
          editorManagerRef: { current: new EditorManager() },
          handlers,
          eventMiddleware: [middleware],
          rowHeight: 36,
          headerHeight: 40,
          height: 600,
        }),
      );

      const attachedHandlers = em.attach.mock.calls[0]![1];
      const [native, coords] = mockMouseArgs();
      attachedHandlers.onHeaderClick(0, native, coords);

      expect(middlewareCalled).toHaveBeenCalledWith("headerClick");
      expect(handlers.handleHeaderClick).toHaveBeenCalledWith(0);
    });

    it("headerClick without preventDefault calls handleHeaderClick", () => {
      const em = makeMockEventManager();
      const handlers = makeMockHandlers();
      const onHeaderClick = mock(() => {}); // does NOT call preventDefault

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

      const attachedHandlers = em.attach.mock.calls[0]![1];
      const [native, coords] = mockMouseArgs();
      attachedHandlers.onHeaderClick(3, native, coords);

      expect(onHeaderClick).toHaveBeenCalled();
      expect(handlers.handleHeaderClick).toHaveBeenCalledWith(3);
    });

    it("cellDoubleClick without preventDefault calls handleCellDoubleClick", () => {
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
      const [native, coords] = mockMouseArgs();
      attachedHandlers.onCellDoubleClick({ row: 2, col: 1 }, native, coords);

      expect(handlers.handleCellDoubleClick).toHaveBeenCalledWith({ row: 2, col: 1 });
    });
  });
});

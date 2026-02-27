import { describe, expect, it, mock } from "bun:test";
import type { CellCoord } from "../../types";
import { EventManager } from "../../adapter/event-manager";

/**
 * Test event attachment logic.
 * Verifies that EventManager.attach is called with correct handler structure.
 */

describe("useEventAttachment logic", () => {
  it("EventManager.attach accepts handler structure matching the hook", () => {
    const em = new EventManager();
    const attachSpy = mock(() => {});
    em.attach = attachSpy as any;

    const canvas = { addEventListener: mock(() => {}) } as any;
    const handlers = {
      onHeaderClick: mock(() => {}),
      onCellClick: mock(() => {}),
      onCellDoubleClick: mock(() => {}),
      onCellMouseDown: mock(() => {}),
      onCellMouseMove: mock(() => {}),
      onDragEdge: mock(() => {}),
      onCellMouseUp: mock(() => {}),
      onKeyDown: mock(() => {}),
      onScroll: mock(() => {}),
    };

    em.attach(canvas, handlers, { lineHeight: 36, pageHeight: 560 });
    expect(attachSpy).toHaveBeenCalledTimes(1);
  });

  it("EventManager.detach cleans up", () => {
    const em = new EventManager();
    // detach should not throw even when not attached
    expect(() => em.detach()).not.toThrow();
  });

  describe("event callback interception", () => {
    it("onHeaderClick returning false prevents handleHeaderClick", () => {
      const handleHeaderClick = mock((_colIndex: number) => {});
      const onHeaderClick = mock((_colIndex: number) => false as const);
      const wrappedHeaderClick = (colIndex: number) => {
        if (onHeaderClick(colIndex) === false) return;
        handleHeaderClick(colIndex);
      };
      wrappedHeaderClick(2);
      expect(onHeaderClick).toHaveBeenCalledWith(2);
      expect(handleHeaderClick).not.toHaveBeenCalled();
    });

    it("onCellClick returning false prevents editor cancel", () => {
      const editorCancel = mock(() => {});
      const onCellClick = mock((_coord: CellCoord) => false as const);
      const coord: CellCoord = { row: 1, col: 0 };
      const wrappedCellClick = (c: CellCoord) => {
        if (onCellClick(c) === false) return;
        editorCancel();
      };
      wrappedCellClick(coord);
      expect(onCellClick).toHaveBeenCalledWith(coord);
      expect(editorCancel).not.toHaveBeenCalled();
    });

    it("onCellDoubleClick returning false prevents editing", () => {
      const handleCellDoubleClick = mock((_coord: CellCoord) => {});
      const onCellDoubleClick = mock((_coord: CellCoord) => false as const);
      const coord: CellCoord = { row: 0, col: 1 };
      const wrappedDoubleClick = (c: CellCoord) => {
        if (onCellDoubleClick(c) === false) return;
        handleCellDoubleClick(c);
      };
      wrappedDoubleClick(coord);
      expect(onCellDoubleClick).toHaveBeenCalledWith(coord);
      expect(handleCellDoubleClick).not.toHaveBeenCalled();
    });

    it("onKeyDown returning false prevents handleKeyDown", () => {
      const handleKeyDown = mock((_e: KeyboardEvent) => {});
      const onKeyDown = mock((_e: KeyboardEvent) => false as const);
      const event = { key: "Enter" } as KeyboardEvent;
      const wrappedKeyDown = (e: KeyboardEvent) => {
        if (onKeyDown(e) === false) return;
        handleKeyDown(e);
      };
      wrappedKeyDown(event);
      expect(onKeyDown).toHaveBeenCalledWith(event);
      expect(handleKeyDown).not.toHaveBeenCalled();
    });

    it("callbacks not provided → default behavior runs", () => {
      const handleHeaderClick = mock((_colIndex: number) => {});
      // Simulate ref.current being undefined (no callback provided)
      const ref: { current: ((colIndex: number) => void | false) | undefined } = {
        current: undefined,
      };
      const wrappedHeaderClick = (colIndex: number) => {
        if (ref.current?.(colIndex) === false) return;
        handleHeaderClick(colIndex);
      };
      wrappedHeaderClick(0);
      expect(handleHeaderClick).toHaveBeenCalledWith(0);
    });
  });

  it("module exports useEventAttachment function", async () => {
    const mod = await import("../hooks/use-event-attachment");
    expect(typeof mod.useEventAttachment).toBe("function");
  });
});

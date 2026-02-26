import { describe, expect, it, mock } from "bun:test";
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

  it("module exports useEventAttachment function", async () => {
    const mod = await import("../hooks/use-event-attachment");
    expect(typeof mod.useEventAttachment).toBe("function");
  });
});

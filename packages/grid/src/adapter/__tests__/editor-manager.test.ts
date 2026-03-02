import { describe, expect, it, beforeEach, mock } from "bun:test";
import { EditorManager } from "../editor-manager";

function makeLayout(x: number, y: number, w: number, h: number) {
  return {
    row: 0,
    col: 0,
    x,
    y,
    width: w,
    height: h,
    contentAlign: "left" as const,
  };
}

describe("EditorManager", () => {
  let em: EditorManager;

  beforeEach(() => {
    em = new EditorManager();
  });

  describe("initial state", () => {
    it("starts with isEditing false", () => {
      expect(em.isEditing).toBe(false);
    });

    it("starts with null state", () => {
      expect(em.activeCoord).toBeNull();
      expect(em.activeLayout).toBeNull();
      expect(em.editorType).toBeNull();
      expect(em.currentValue).toBeUndefined();
      expect(em.initialChar).toBeNull();
    });
  });

  describe("open", () => {
    it("sets isEditing to true and stores state", () => {
      const layout = makeLayout(10, 20, 100, 36);
      em.open({ row: 1, col: 2 }, layout, "text", "hello");
      expect(em.isEditing).toBe(true);
      expect(em.activeCoord).toEqual({ row: 1, col: 2 });
      expect(em.activeLayout).toBe(layout);
      expect(em.editorType).toBe("text");
      expect(em.currentValue).toBe("hello");
      expect(em.initialChar).toBeNull();
    });

    it("stores initialChar when provided", () => {
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "", "a");
      expect(em.initialChar).toBe("a");
    });

    it("clears previous state when opening a new editor", () => {
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "first");
      em.open({ row: 1, col: 0 }, makeLayout(0, 36, 100, 36), "number", 42);
      expect(em.activeCoord).toEqual({ row: 1, col: 0 });
      expect(em.editorType).toBe("number");
      expect(em.currentValue).toBe(42);
    });

    it("calls onStateChange", () => {
      const cb = mock(() => {});
      em.onStateChange = cb;
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "val");
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  describe("commitValue", () => {
    it("calls onCommit with correct coord and value", () => {
      const cb = mock(() => {});
      em.onCommit = cb;
      em.open({ row: 2, col: 3 }, makeLayout(0, 0, 100, 36), "text", "old");
      em.commitValue("new");
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith({ row: 2, col: 3 }, "new");
    });

    it("closes the editor", () => {
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "val");
      em.commitValue("val");
      expect(em.isEditing).toBe(false);
      expect(em.activeCoord).toBeNull();
    });

    it("is a no-op when no editor is open", () => {
      const cb = mock(() => {});
      em.onCommit = cb;
      em.commitValue("val");
      expect(cb).not.toHaveBeenCalled();
    });

    it("calls onStateChange", () => {
      const cb = mock(() => {});
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "val");
      em.onStateChange = cb;
      em.commitValue("val");
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("does not throw when onCommit is not set", () => {
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "val");
      expect(() => em.commitValue("val")).not.toThrow();
    });
  });

  describe("commitAndNavigate", () => {
    it("calls onCommit then onNavigate", () => {
      const commitCb = mock(() => {});
      const navCb = mock(() => {});
      em.onCommit = commitCb;
      em.onNavigate = navCb;
      em.open({ row: 1, col: 0 }, makeLayout(0, 0, 100, 36), "text", "hello");
      em.commitAndNavigate("world", "next");
      expect(commitCb).toHaveBeenCalledWith({ row: 1, col: 0 }, "world");
      expect(navCb).toHaveBeenCalledWith({ row: 1, col: 0 }, "next");
    });

    it("passes 'prev' direction for Shift+Tab", () => {
      const navCb = mock(() => {});
      em.onNavigate = navCb;
      em.open({ row: 2, col: 1 }, makeLayout(0, 0, 100, 36), "text", "x");
      em.commitAndNavigate("y", "prev");
      expect(navCb).toHaveBeenCalledWith({ row: 2, col: 1 }, "prev");
    });

    it("closes the editor", () => {
      em.open({ row: 1, col: 0 }, makeLayout(0, 0, 100, 36), "text", "val");
      em.commitAndNavigate("val", "next");
      expect(em.isEditing).toBe(false);
    });

    it("is a no-op when no editor is open", () => {
      const navCb = mock(() => {});
      em.onNavigate = navCb;
      em.commitAndNavigate("val", "next");
      expect(navCb).not.toHaveBeenCalled();
    });
  });

  describe("cancel", () => {
    it("closes editor without calling onCommit", () => {
      const cb = mock(() => {});
      em.onCommit = cb;
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "hello");
      em.cancel();
      expect(em.isEditing).toBe(false);
      expect(cb).not.toHaveBeenCalled();
    });

    it("calls onStateChange", () => {
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "val");
      const cb = mock(() => {});
      em.onStateChange = cb;
      em.cancel();
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("is a no-op when no editor is open", () => {
      const cb = mock(() => {});
      em.onStateChange = cb;
      em.cancel();
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe("isEditing", () => {
    it("returns true when editor is open", () => {
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "x");
      expect(em.isEditing).toBe(true);
    });

    it("returns false after commitValue", () => {
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "x");
      em.commitValue("x");
      expect(em.isEditing).toBe(false);
    });

    it("returns false after cancel", () => {
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "x");
      em.cancel();
      expect(em.isEditing).toBe(false);
    });
  });

  describe("re-entry guard", () => {
    it("cancel followed by commitValue is a no-op", () => {
      const cb = mock(() => {});
      em.onCommit = cb;
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "val");
      em.cancel();
      em.commitValue("val");
      expect(cb).not.toHaveBeenCalled();
    });
  });
});

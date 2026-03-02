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
  let container: HTMLDivElement;

  beforeEach(() => {
    em = new EditorManager();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  describe("initial state", () => {
    it("starts with isEditing false", () => {
      expect(em.isEditing).toBe(false);
    });
  });

  describe("setContainer", () => {
    it("sets the container for editor overlays", () => {
      em.setContainer(container);
      // Should allow open() to work after setting container
      em.open({ row: 0, col: 0 }, makeLayout(10, 20, 100, 36), "text", "hello");
      expect(em.isEditing).toBe(true);
    });
  });

  describe("open", () => {
    it("creates an input element in the container", () => {
      em.setContainer(container);
      em.open({ row: 0, col: 0 }, makeLayout(10, 20, 100, 36), "text", "hello");
      const input = container.querySelector("input");
      expect(input).not.toBeNull();
      expect(input!.type).toBe("text");
      expect(input!.value).toBe("hello");
    });

    it("positions the input over the cell", () => {
      em.setContainer(container);
      em.open({ row: 0, col: 0 }, makeLayout(50, 100, 200, 36), "text", "test");
      const input = container.querySelector("input")!;
      expect(input.style.left).toBe("50px");
      expect(input.style.top).toBe("100px");
      expect(input.style.width).toBe("200px");
      expect(input.style.height).toBe("36px");
    });

    it("creates number input for number editorType", () => {
      em.setContainer(container);
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "number", 42);
      const input = container.querySelector("input")!;
      expect(input.type).toBe("number");
      expect(input.value).toBe("42");
    });

    it("converts null value to empty string", () => {
      em.setContainer(container);
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", null);
      const input = container.querySelector("input")!;
      expect(input.value).toBe("");
    });

    it("converts undefined value to empty string", () => {
      em.setContainer(container);
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", undefined);
      const input = container.querySelector("input")!;
      expect(input.value).toBe("");
    });

    it("sets input pointerEvents to auto (container stays none)", () => {
      em.setContainer(container);
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "val");
      const input = container.querySelector("input")!;
      expect(input.style.pointerEvents).toBe("auto");
    });

    it("is a no-op without container", () => {
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "val");
      expect(em.isEditing).toBe(false);
    });

    it("cleans up previous input when opening a new one", () => {
      em.setContainer(container);
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "first");
      em.open({ row: 1, col: 0 }, makeLayout(0, 36, 100, 36), "text", "second");
      const inputs = container.querySelectorAll("input");
      expect(inputs.length).toBe(1);
      expect(inputs[0]!.value).toBe("second");
    });
  });

  describe("commit", () => {
    it("returns the text value and closes editor", () => {
      em.setContainer(container);
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "hello");
      const input = container.querySelector("input")!;
      input.value = "world";
      const result = em.commit();
      expect(result).toBe("world");
      expect(em.isEditing).toBe(false);
    });

    it("returns number value for number inputs", () => {
      em.setContainer(container);
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "number", 10);
      const input = container.querySelector("input")!;
      input.value = "99";
      const result = em.commit();
      expect(result).toBe(99);
    });

    it("returns undefined when no editor is open", () => {
      const result = em.commit();
      expect(result).toBeUndefined();
    });

    it("removes input from container", () => {
      em.setContainer(container);
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "x");
      em.commit();
      expect(container.querySelector("input")).toBeNull();
    });

    it("removes input on commit (container pointerEvents unchanged)", () => {
      em.setContainer(container);
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "x");
      em.commit();
      expect(container.querySelector("input")).toBeNull();
    });
  });

  describe("cancel", () => {
    it("closes editor without returning a value", () => {
      em.setContainer(container);
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "hello");
      em.cancel();
      expect(em.isEditing).toBe(false);
      expect(container.querySelector("input")).toBeNull();
    });

    it("removes input on cancel (container pointerEvents unchanged)", () => {
      em.setContainer(container);
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "x");
      em.cancel();
      expect(container.querySelector("input")).toBeNull();
    });
  });

  describe("keyboard events", () => {
    it("Enter key commits the editor", () => {
      em.setContainer(container);
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "hi");
      const input = container.querySelector("input")!;
      input.value = "committed";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      expect(em.isEditing).toBe(false);
    });

    it("Escape key cancels the editor", () => {
      em.setContainer(container);
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "hi");
      const input = container.querySelector("input")!;
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      expect(em.isEditing).toBe(false);
    });
  });

  describe("isEditing", () => {
    it("returns true when editor is open", () => {
      em.setContainer(container);
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "x");
      expect(em.isEditing).toBe(true);
    });

    it("returns false after commit", () => {
      em.setContainer(container);
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "x");
      em.commit();
      expect(em.isEditing).toBe(false);
    });

    it("returns false after cancel", () => {
      em.setContainer(container);
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "x");
      em.cancel();
      expect(em.isEditing).toBe(false);
    });
  });

  describe("onCommit callback", () => {
    it("calls onCommit with correct coord and value on commit", () => {
      const cb = mock(() => {});
      em.setContainer(container);
      em.onCommit = cb;
      em.open({ row: 2, col: 3 }, makeLayout(0, 0, 100, 36), "text", "old");
      const input = container.querySelector("input")!;
      input.value = "new";
      em.commit();
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith({ row: 2, col: 3 }, "new");
    });

    it("passes number value for number editor", () => {
      const cb = mock(() => {});
      em.setContainer(container);
      em.onCommit = cb;
      em.open({ row: 1, col: 0 }, makeLayout(0, 0, 100, 36), "number", 10);
      const input = container.querySelector("input")!;
      input.value = "42";
      em.commit();
      expect(cb).toHaveBeenCalledWith({ row: 1, col: 0 }, 42);
    });

    it("does not call onCommit when no editor is open", () => {
      const cb = mock(() => {});
      em.onCommit = cb;
      em.commit();
      expect(cb).not.toHaveBeenCalled();
    });

    it("does not call onCommit on cancel", () => {
      const cb = mock(() => {});
      em.setContainer(container);
      em.onCommit = cb;
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "val");
      em.cancel();
      expect(cb).not.toHaveBeenCalled();
    });

    it("calls onCommit exactly once on Enter key (blur guard)", () => {
      const cb = mock(() => {});
      em.setContainer(container);
      em.onCommit = cb;
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "val");
      const input = container.querySelector("input")!;
      input.value = "updated";
      // Enter triggers commit, which calls cleanup → subsequent blur commit is a no-op
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("does not call onCommit when cancel is followed by blur", () => {
      const cb = mock(() => {});
      em.setContainer(container);
      em.onCommit = cb;
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "val");
      em.cancel(); // cleanup sets activeInput to null
      em.commit(); // should be no-op (activeInput is null)
      expect(cb).not.toHaveBeenCalled();
    });

    it("does not throw when onCommit is not set", () => {
      em.setContainer(container);
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "val");
      expect(() => em.commit()).not.toThrow();
    });
  });

  describe("Tab navigation (onNavigate)", () => {
    it("Tab fires onCommit then onNavigate with 'next'", () => {
      const commitCb = mock(() => {});
      const navCb = mock(() => {});
      em.setContainer(container);
      em.onCommit = commitCb;
      em.onNavigate = navCb;
      em.open({ row: 1, col: 0 }, makeLayout(0, 0, 100, 36), "text", "hello");
      const input = container.querySelector("input")!;
      input.value = "world";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
      expect(commitCb).toHaveBeenCalledTimes(1);
      expect(commitCb).toHaveBeenCalledWith({ row: 1, col: 0 }, "world");
      expect(navCb).toHaveBeenCalledTimes(1);
      expect(navCb).toHaveBeenCalledWith({ row: 1, col: 0 }, "next");
    });

    it("Shift+Tab fires onNavigate with 'prev'", () => {
      const navCb = mock(() => {});
      em.setContainer(container);
      em.onNavigate = navCb;
      em.open({ row: 2, col: 1 }, makeLayout(0, 0, 100, 36), "text", "x");
      const input = container.querySelector("input")!;
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Tab",
          shiftKey: true,
          bubbles: true,
        }),
      );
      expect(navCb).toHaveBeenCalledWith({ row: 2, col: 1 }, "prev");
    });

    it("Tab closes the editor (commit cleanup)", () => {
      em.setContainer(container);
      em.open({ row: 1, col: 0 }, makeLayout(0, 0, 100, 36), "text", "val");
      const input = container.querySelector("input")!;
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
      expect(em.isEditing).toBe(false);
    });

    it("does not call onNavigate when no editor is open", () => {
      const navCb = mock(() => {});
      em.onNavigate = navCb;
      em.commit(); // no-op, no active editor
      expect(navCb).not.toHaveBeenCalled();
    });

    it("does not throw when onNavigate is not set", () => {
      em.setContainer(container);
      em.open({ row: 0, col: 0 }, makeLayout(0, 0, 100, 36), "text", "val");
      const input = container.querySelector("input")!;
      expect(() =>
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true })),
      ).not.toThrow();
    });
  });
});

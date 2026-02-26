import { describe, expect, it, mock } from "bun:test";
import { SelectionManager, buildTSV } from "../selection-manager";

describe("buildTSV", () => {
  const getText = (row: number, col: number) => `r${row}c${col}`;

  it("builds TSV for a single cell", () => {
    const result = buildTSV({ minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 }, getText);
    expect(result).toBe("r0c0");
  });

  it("builds TSV for a rectangular range", () => {
    const result = buildTSV({ minRow: 1, maxRow: 2, minCol: 0, maxCol: 2 }, getText);
    expect(result).toBe("r1c0\tr1c1\tr1c2\nr2c0\tr2c1\tr2c2");
  });

  it("builds TSV for a single row", () => {
    const result = buildTSV({ minRow: 0, maxRow: 0, minCol: 0, maxCol: 2 }, getText);
    expect(result).toBe("r0c0\tr0c1\tr0c2");
  });

  it("builds TSV for a single column", () => {
    const result = buildTSV({ minRow: 0, maxRow: 2, minCol: 1, maxCol: 1 }, getText);
    expect(result).toBe("r0c1\nr1c1\nr2c1");
  });
});

describe("SelectionManager", () => {
  describe("state transitions", () => {
    it("starts with no selection", () => {
      const sm = new SelectionManager();
      expect(sm.hasSelection).toBe(false);
      expect(sm.isDragging).toBe(false);
      expect(sm.getRange()).toBeNull();
      expect(sm.getNormalized()).toBeNull();
    });

    it("start() sets range and dragging", () => {
      const sm = new SelectionManager();
      sm.start(2, 3);
      expect(sm.hasSelection).toBe(true);
      expect(sm.isDragging).toBe(true);
      expect(sm.getRange()).toEqual({ startRow: 2, startCol: 3, endRow: 2, endCol: 3 });
    });

    it("extend() updates endRow/endCol", () => {
      const sm = new SelectionManager();
      sm.start(0, 0);
      sm.extend(3, 2);
      expect(sm.getRange()).toEqual({ startRow: 0, startCol: 0, endRow: 3, endCol: 2 });
    });

    it("extend() is a no-op without prior start", () => {
      const sm = new SelectionManager();
      sm.extend(1, 1);
      expect(sm.hasSelection).toBe(false);
    });

    it("finish() clears dragging but keeps range", () => {
      const sm = new SelectionManager();
      sm.start(0, 0);
      sm.extend(2, 2);
      sm.finish();
      expect(sm.isDragging).toBe(false);
      expect(sm.hasSelection).toBe(true);
      expect(sm.getRange()).toEqual({ startRow: 0, startCol: 0, endRow: 2, endCol: 2 });
    });

    it("extendTo() keeps anchor, updates end", () => {
      const sm = new SelectionManager();
      sm.start(1, 1);
      sm.finish();
      sm.extendTo(5, 3);
      expect(sm.getRange()).toEqual({ startRow: 1, startCol: 1, endRow: 5, endCol: 3 });
    });

    it("extendTo() is a no-op without prior range", () => {
      const sm = new SelectionManager();
      sm.extendTo(1, 1);
      expect(sm.hasSelection).toBe(false);
    });

    it("clear() removes selection", () => {
      const sm = new SelectionManager();
      sm.start(0, 0);
      sm.extend(2, 2);
      sm.clear();
      expect(sm.hasSelection).toBe(false);
      expect(sm.getRange()).toBeNull();
    });

    it("clear() is a no-op when no selection", () => {
      const cb = mock(() => {});
      const sm = new SelectionManager();
      sm.setOnDirty(cb);
      sm.clear();
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe("getNormalized", () => {
    it("normalizes forward drag", () => {
      const sm = new SelectionManager();
      sm.start(1, 2);
      sm.extend(3, 4);
      expect(sm.getNormalized()).toEqual({ minRow: 1, maxRow: 3, minCol: 2, maxCol: 4 });
    });

    it("normalizes reverse drag (end < start)", () => {
      const sm = new SelectionManager();
      sm.start(5, 4);
      sm.extend(2, 1);
      expect(sm.getNormalized()).toEqual({ minRow: 2, maxRow: 5, minCol: 1, maxCol: 4 });
    });

    it("normalizes single-cell selection", () => {
      const sm = new SelectionManager();
      sm.start(3, 3);
      expect(sm.getNormalized()).toEqual({ minRow: 3, maxRow: 3, minCol: 3, maxCol: 3 });
    });
  });

  describe("contains", () => {
    it("returns true for cells inside range", () => {
      const sm = new SelectionManager();
      sm.start(1, 1);
      sm.extend(3, 3);
      expect(sm.contains(2, 2)).toBe(true);
      expect(sm.contains(1, 1)).toBe(true);
      expect(sm.contains(3, 3)).toBe(true);
    });

    it("returns false for cells outside range", () => {
      const sm = new SelectionManager();
      sm.start(1, 1);
      sm.extend(3, 3);
      expect(sm.contains(0, 0)).toBe(false);
      expect(sm.contains(4, 2)).toBe(false);
      expect(sm.contains(2, 4)).toBe(false);
    });

    it("returns false when no selection", () => {
      const sm = new SelectionManager();
      expect(sm.contains(0, 0)).toBe(false);
    });
  });

  describe("setRange", () => {
    it("sets range from external state", () => {
      const sm = new SelectionManager();
      sm.setRange({ startRow: 1, startCol: 2, endRow: 3, endCol: 4 });
      expect(sm.hasSelection).toBe(true);
      expect(sm.getRange()).toEqual({ startRow: 1, startCol: 2, endRow: 3, endCol: 4 });
    });

    it("fires onDirty when range changes", () => {
      const cb = mock(() => {});
      const sm = new SelectionManager();
      sm.setOnDirty(cb);
      sm.setRange({ startRow: 0, startCol: 0, endRow: 1, endCol: 1 });
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("does not fire onDirty when range is identical", () => {
      const cb = mock(() => {});
      const sm = new SelectionManager();
      sm.setRange({ startRow: 0, startCol: 0, endRow: 1, endCol: 1 });
      sm.setOnDirty(cb);
      sm.setRange({ startRow: 0, startCol: 0, endRow: 1, endCol: 1 });
      expect(cb).not.toHaveBeenCalled();
    });

    it("clears when null is passed", () => {
      const sm = new SelectionManager();
      sm.setRange({ startRow: 0, startCol: 0, endRow: 1, endCol: 1 });
      sm.setRange(null);
      expect(sm.hasSelection).toBe(false);
    });

    it("getNormalized works after setRange", () => {
      const sm = new SelectionManager();
      sm.setRange({ startRow: 5, startCol: 3, endRow: 2, endCol: 1 });
      expect(sm.getNormalized()).toEqual({ minRow: 2, maxRow: 5, minCol: 1, maxCol: 3 });
    });
  });

  describe("writeToClipboardText", () => {
    it("writes text via navigator.clipboard.writeText", () => {
      const writeTextMock = mock(() => Promise.resolve());
      Object.defineProperty(globalThis, "navigator", {
        value: { clipboard: { writeText: writeTextMock } },
        writable: true,
        configurable: true,
      });

      const sm = new SelectionManager();
      sm.writeToClipboardText("hello\tworld");
      expect(writeTextMock).toHaveBeenCalledWith("hello\tworld");

      // Cleanup
      Object.defineProperty(globalThis, "navigator", {
        value: {},
        writable: true,
        configurable: true,
      });
    });
  });

  describe("onDirty callback", () => {
    it("fires on start()", () => {
      const cb = mock(() => {});
      const sm = new SelectionManager();
      sm.setOnDirty(cb);
      sm.start(0, 0);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("fires on extend() when range changes", () => {
      const cb = mock(() => {});
      const sm = new SelectionManager();
      sm.setOnDirty(cb);
      sm.start(0, 0);
      cb.mockClear();
      sm.extend(1, 1);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("does not fire on extend() when range unchanged", () => {
      const cb = mock(() => {});
      const sm = new SelectionManager();
      sm.setOnDirty(cb);
      sm.start(0, 0);
      cb.mockClear();
      sm.extend(0, 0); // same as end
      expect(cb).not.toHaveBeenCalled();
    });

    it("does not fire on finish()", () => {
      const cb = mock(() => {});
      const sm = new SelectionManager();
      sm.setOnDirty(cb);
      sm.start(0, 0);
      cb.mockClear();
      sm.finish();
      expect(cb).not.toHaveBeenCalled();
    });

    it("fires on extendTo()", () => {
      const cb = mock(() => {});
      const sm = new SelectionManager();
      sm.setOnDirty(cb);
      sm.start(0, 0);
      sm.finish();
      cb.mockClear();
      sm.extendTo(2, 2);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("fires on clear()", () => {
      const cb = mock(() => {});
      const sm = new SelectionManager();
      sm.setOnDirty(cb);
      sm.start(0, 0);
      cb.mockClear();
      sm.clear();
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });
});

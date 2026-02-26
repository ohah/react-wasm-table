import { describe, expect, it, mock } from "bun:test";
import { SelectionManager } from "../../adapter/selection-manager";

/**
 * Test selection logic extracted into useSelection.
 * Tests the SelectionManager state machine and handler logic directly.
 */

describe("useSelection logic", () => {
  describe("selection start/extend/finish cycle", () => {
    it("start → extend → finish produces correct range", () => {
      const sm = new SelectionManager();
      sm.start(1, 0);
      expect(sm.isDragging).toBe(true);
      sm.extend(3, 2);
      sm.finish();
      expect(sm.isDragging).toBe(false);
      const norm = sm.getNormalized();
      expect(norm).toEqual({ minRow: 1, maxRow: 3, minCol: 0, maxCol: 2 });
    });
  });

  describe("Escape clears selection", () => {
    it("clear removes selection", () => {
      const sm = new SelectionManager();
      sm.start(0, 0);
      sm.finish();
      expect(sm.hasSelection).toBe(true);
      sm.clear();
      expect(sm.hasSelection).toBe(false);
      expect(sm.getNormalized()).toBeNull();
    });
  });

  describe("shift-click extends selection", () => {
    it("extendTo updates the end of the range", () => {
      const sm = new SelectionManager();
      sm.start(0, 0);
      sm.finish();
      sm.extendTo(5, 3);
      const norm = sm.getNormalized();
      expect(norm).toEqual({ minRow: 0, maxRow: 5, minCol: 0, maxCol: 3 });
    });
  });

  describe("controlled sync", () => {
    it("setRange overrides current selection", () => {
      const sm = new SelectionManager();
      sm.start(0, 0);
      sm.finish();
      sm.setRange({ startRow: 2, startCol: 1, endRow: 4, endCol: 3 });
      expect(sm.getNormalized()).toEqual({ minRow: 2, maxRow: 4, minCol: 1, maxCol: 3 });
    });
  });

  describe("non-selectable column guard", () => {
    it("handler respects selectable=false", () => {
      // Simulates the handleCellMouseDown guard
      const cols = [
        { id: "a", selectable: true },
        { id: "b", selectable: false },
      ];
      const sm = new SelectionManager();

      // Clicking col 1 (selectable=false) should be guarded
      const coord = { row: 0, col: 1 };
      if (cols[coord.col]?.selectable === false) {
        // skip
      } else {
        sm.start(coord.row, coord.col);
      }
      expect(sm.hasSelection).toBe(false);

      // Clicking col 0 (selectable=true) should proceed
      const coord2 = { row: 0, col: 0 };
      if (cols[coord2.col]?.selectable === false) {
        // skip
      } else {
        sm.start(coord2.row, coord2.col);
      }
      expect(sm.hasSelection).toBe(true);
    });
  });

  it("module exports useSelection function", async () => {
    const mod = await import("../hooks/use-selection");
    expect(typeof mod.useSelection).toBe("function");
  });
});

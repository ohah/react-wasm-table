import { describe, expect, it } from "bun:test";
import { StringTable } from "../string-table";

describe("StringTable", () => {
  describe("populate", () => {
    it("builds string columns from data", () => {
      const st = new StringTable();
      const data = [
        { name: "Alice", city: "Seoul" },
        { name: "Bob", city: "Tokyo" },
      ] as Record<string, unknown>[];

      st.populate(data, ["name", "city"]);
      expect(st.get(0, 0)).toBe("Alice");
      expect(st.get(0, 1)).toBe("Bob");
      expect(st.get(1, 0)).toBe("Seoul");
      expect(st.get(1, 1)).toBe("Tokyo");
    });

    it("converts non-string values to strings", () => {
      const st = new StringTable();
      const data = [
        { id: 1, active: true, score: 95.5 },
        { id: 2, active: false, score: 0 },
      ] as Record<string, unknown>[];

      st.populate(data, ["id", "active", "score"]);
      expect(st.get(0, 0)).toBe("1");
      expect(st.get(1, 0)).toBe("true");
      expect(st.get(2, 0)).toBe("95.5");
      expect(st.get(0, 1)).toBe("2");
      expect(st.get(1, 1)).toBe("false");
      expect(st.get(2, 1)).toBe("0");
    });

    it("converts null/undefined to empty string", () => {
      const st = new StringTable();
      const data = [{ name: null }, { name: undefined }] as Record<string, unknown>[];

      st.populate(data, ["name"]);
      expect(st.get(0, 0)).toBe("");
      expect(st.get(0, 1)).toBe("");
    });

    it("clears previous data on re-populate", () => {
      const st = new StringTable();
      st.populate([{ a: "old" }] as Record<string, unknown>[], ["a"]);
      expect(st.get(0, 0)).toBe("old");

      st.populate([{ b: "new" }] as Record<string, unknown>[], ["b"]);
      // Old column 0 now has "new" data from key "b"
      expect(st.get(0, 0)).toBe("new");
    });

    it("handles empty data array", () => {
      const st = new StringTable();
      st.populate([], ["name"]);
      expect(st.get(0, 0)).toBe("");
    });

    it("handles empty column ids", () => {
      const st = new StringTable();
      st.populate([{ name: "Alice" }] as Record<string, unknown>[], []);
      expect(st.get(0, 0)).toBe("");
    });
  });

  describe("get", () => {
    it("returns empty string for non-existent column", () => {
      const st = new StringTable();
      st.populate([{ name: "Alice" }] as Record<string, unknown>[], ["name"]);
      expect(st.get(99, 0)).toBe("");
    });

    it("returns empty string for non-existent row", () => {
      const st = new StringTable();
      st.populate([{ name: "Alice" }] as Record<string, unknown>[], ["name"]);
      expect(st.get(0, 99)).toBe("");
    });

    it("returns empty string when table is empty", () => {
      const st = new StringTable();
      expect(st.get(0, 0)).toBe("");
    });
  });

  describe("clear", () => {
    it("removes all data", () => {
      const st = new StringTable();
      st.populate([{ name: "Alice" }] as Record<string, unknown>[], ["name"]);
      expect(st.get(0, 0)).toBe("Alice");

      st.clear();
      expect(st.get(0, 0)).toBe("");
    });

    it("is safe to call on empty table", () => {
      const st = new StringTable();
      expect(() => st.clear()).not.toThrow();
    });
  });
});

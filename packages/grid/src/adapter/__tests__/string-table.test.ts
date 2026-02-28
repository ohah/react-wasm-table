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
      expect(st.get("name", 0)).toBe("Alice");
      expect(st.get("name", 1)).toBe("Bob");
      expect(st.get("city", 0)).toBe("Seoul");
      expect(st.get("city", 1)).toBe("Tokyo");
    });

    it("converts non-string values to strings", () => {
      const st = new StringTable();
      const data = [
        { id: 1, active: true, score: 95.5 },
        { id: 2, active: false, score: 0 },
      ] as Record<string, unknown>[];

      st.populate(data, ["id", "active", "score"]);
      expect(st.get("id", 0)).toBe("1");
      expect(st.get("active", 0)).toBe("true");
      expect(st.get("score", 0)).toBe("95.5");
      expect(st.get("id", 1)).toBe("2");
      expect(st.get("active", 1)).toBe("false");
      expect(st.get("score", 1)).toBe("0");
    });

    it("converts null/undefined to empty string", () => {
      const st = new StringTable();
      const data = [{ name: null }, { name: undefined }] as Record<string, unknown>[];

      st.populate(data, ["name"]);
      expect(st.get("name", 0)).toBe("");
      expect(st.get("name", 1)).toBe("");
    });

    it("clears previous data on re-populate", () => {
      const st = new StringTable();
      st.populate([{ a: "old" }] as Record<string, unknown>[], ["a"]);
      expect(st.get("a", 0)).toBe("old");

      st.populate([{ b: "new" }] as Record<string, unknown>[], ["b"]);
      // Old column "a" is gone, new column "b" has data
      expect(st.get("a", 0)).toBe("");
      expect(st.get("b", 0)).toBe("new");
    });

    it("handles empty data array", () => {
      const st = new StringTable();
      st.populate([], ["name"]);
      expect(st.get("name", 0)).toBe("");
    });

    it("handles empty column ids", () => {
      const st = new StringTable();
      st.populate([{ name: "Alice" }] as Record<string, unknown>[], []);
      expect(st.get("name", 0)).toBe("");
    });
  });

  describe("get", () => {
    it("returns empty string for non-existent column", () => {
      const st = new StringTable();
      st.populate([{ name: "Alice" }] as Record<string, unknown>[], ["name"]);
      expect(st.get("unknown", 0)).toBe("");
    });

    it("returns empty string for non-existent row", () => {
      const st = new StringTable();
      st.populate([{ name: "Alice" }] as Record<string, unknown>[], ["name"]);
      expect(st.get("name", 99)).toBe("");
    });

    it("returns empty string when table is empty", () => {
      const st = new StringTable();
      expect(st.get("name", 0)).toBe("");
    });

    it("lookup is independent of column order", () => {
      const st = new StringTable();
      const data = [{ a: "A0", b: "B0", c: "C0" }] as Record<string, unknown>[];

      // Populate in order [a, b, c]
      st.populate(data, ["a", "b", "c"]);
      expect(st.get("a", 0)).toBe("A0");
      expect(st.get("b", 0)).toBe("B0");
      expect(st.get("c", 0)).toBe("C0");

      // Re-populate in reversed order [c, b, a] — lookup by ID still works
      st.populate(data, ["c", "b", "a"]);
      expect(st.get("a", 0)).toBe("A0");
      expect(st.get("b", 0)).toBe("B0");
      expect(st.get("c", 0)).toBe("C0");
    });
  });

  describe("clear", () => {
    it("removes all data", () => {
      const st = new StringTable();
      st.populate([{ name: "Alice" }] as Record<string, unknown>[], ["name"]);
      expect(st.get("name", 0)).toBe("Alice");

      st.clear();
      expect(st.get("name", 0)).toBe("");
    });

    it("is safe to call on empty table", () => {
      const st = new StringTable();
      expect(() => st.clear()).not.toThrow();
    });
  });
});

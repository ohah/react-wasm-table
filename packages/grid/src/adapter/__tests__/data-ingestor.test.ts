import { describe, expect, it, mock } from "bun:test";
import {
  classifyColumns,
  buildFloat64Column,
  buildBoolColumn,
  buildStringColumn,
  ingestData,
} from "../data-ingestor";

const sampleData = [
  { id: 1, name: "Alice", salary: 50000, isActive: true, score: null },
  { id: 2, name: "Bob", salary: 60000, isActive: false, score: 85 },
  { id: 3, name: "Charlie", salary: 70000, isActive: true, score: 92 },
] as Record<string, unknown>[];

describe("classifyColumns", () => {
  it("detects float64 columns", () => {
    const types = classifyColumns(sampleData, ["id", "salary"]);
    expect(types).toEqual(["float64", "float64"]);
  });

  it("detects string columns", () => {
    const types = classifyColumns(sampleData, ["name"]);
    expect(types).toEqual(["string"]);
  });

  it("detects bool columns", () => {
    const types = classifyColumns(sampleData, ["isActive"]);
    expect(types).toEqual(["bool"]);
  });

  it("skips null to find real type", () => {
    const types = classifyColumns(sampleData, ["score"]);
    expect(types).toEqual(["float64"]); // first non-null is 85 (number)
  });

  it("defaults to string for all-null columns", () => {
    const data = [{ x: null }, { x: null }] as Record<string, unknown>[];
    const types = classifyColumns(data, ["x"]);
    expect(types).toEqual(["string"]);
  });
});

describe("buildFloat64Column", () => {
  it("builds array with correct values", () => {
    const arr = buildFloat64Column(sampleData, "salary");
    expect(arr).toBeInstanceOf(Float64Array);
    expect(arr.length).toBe(3);
    expect(arr[0]).toBe(50000);
    expect(arr[1]).toBe(60000);
    expect(arr[2]).toBe(70000);
  });

  it("uses NaN for null values", () => {
    const arr = buildFloat64Column(sampleData, "score");
    expect(Number.isNaN(arr[0])).toBe(true);
    expect(arr[1]).toBe(85);
    expect(arr[2]).toBe(92);
  });
});

describe("buildBoolColumn", () => {
  it("maps true→1, false→0, null→NaN", () => {
    const data = [{ active: true }, { active: false }, { active: null }] as Record<
      string,
      unknown
    >[];
    const arr = buildBoolColumn(data, "active");
    expect(arr[0]).toBe(1.0);
    expect(arr[1]).toBe(0.0);
    expect(Number.isNaN(arr[2])).toBe(true);
  });
});

describe("buildStringColumn", () => {
  it("interns strings and returns unique + ids", () => {
    const [unique, ids] = buildStringColumn(sampleData, "name");
    // "" is always ID 0
    expect(unique[0]).toBe("");
    expect(unique).toContain("Alice");
    expect(unique).toContain("Bob");
    expect(unique).toContain("Charlie");
    expect(ids.length).toBe(3);
    // All IDs should be > 0 (non-null)
    expect(ids[0]).toBeGreaterThan(0);
    expect(ids[1]).toBeGreaterThan(0);
    expect(ids[2]).toBeGreaterThan(0);
    // Same string gets same ID
    expect(unique[ids[0]!]).toBe("Alice");
    expect(unique[ids[1]!]).toBe("Bob");
    expect(unique[ids[2]!]).toBe("Charlie");
  });

  it("deduplicates identical strings", () => {
    const data = [{ city: "Seoul" }, { city: "Tokyo" }, { city: "Seoul" }] as Record<
      string,
      unknown
    >[];
    const [unique, ids] = buildStringColumn(data, "city");
    // "" + "Seoul" + "Tokyo" = 3 unique
    expect(unique.length).toBe(3);
    // Row 0 and Row 2 should have the same ID
    expect(ids[0]).toBe(ids[2]);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("maps null to empty string (ID 0)", () => {
    const data = [{ x: null }, { x: "hello" }] as Record<string, unknown>[];
    const [unique, ids] = buildStringColumn(data, "x");
    expect(ids[0]).toBe(0);
    expect(unique[0]).toBe("");
  });
});

describe("ingestData", () => {
  it("calls engine methods in correct order", () => {
    const engine = {
      initColumnar: mock(() => {}),
      ingestFloat64Column: mock(() => {}),
      ingestBoolColumn: mock(() => {}),
      ingestStringColumn: mock(() => {}),
      finalizeColumnar: mock(() => {}),
    };

    ingestData(engine as any, sampleData, ["id", "name", "salary", "isActive", "score"]);

    expect(engine.initColumnar).toHaveBeenCalledWith(5, 3);
    // id (float64), salary (float64), score (float64) = 3 float64 calls
    expect(engine.ingestFloat64Column).toHaveBeenCalledTimes(3);
    // name (string) = 1 string call
    expect(engine.ingestStringColumn).toHaveBeenCalledTimes(1);
    // isActive (bool) = 1 bool call
    expect(engine.ingestBoolColumn).toHaveBeenCalledTimes(1);
    expect(engine.finalizeColumnar).toHaveBeenCalledTimes(1);
  });
});

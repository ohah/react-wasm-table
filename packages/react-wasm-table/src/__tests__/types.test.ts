import { describe, expect, it } from "bun:test";
import { isHeaderRow, toDataRow } from "../types";

describe("isHeaderRow", () => {
  it("returns true for row < headerRowCount", () => {
    expect(isHeaderRow(0, 1)).toBe(true);
    expect(isHeaderRow(0, 3)).toBe(true);
    expect(isHeaderRow(1, 3)).toBe(true);
  });

  it("returns false for row >= headerRowCount", () => {
    expect(isHeaderRow(1, 1)).toBe(false);
    expect(isHeaderRow(3, 3)).toBe(false);
    expect(isHeaderRow(5, 1)).toBe(false);
  });
});

describe("toDataRow", () => {
  it("subtracts headerRowCount", () => {
    expect(toDataRow(1, 1)).toBe(0);
    expect(toDataRow(3, 1)).toBe(2);
    expect(toDataRow(5, 3)).toBe(2);
  });
});

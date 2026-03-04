import { describe, expect, it } from "bun:test";
import { Thead, Tbody, Tfoot, Tr, Th, Td } from "../table-components";

describe("table-components", () => {
  describe("Thead", () => {
    it("returns null", () => {
      expect(Thead({ children: null })).toBeNull();
    });
  });

  describe("Tbody", () => {
    it("returns null", () => {
      expect(Tbody({ children: null })).toBeNull();
    });
  });

  describe("Tfoot", () => {
    it("returns null", () => {
      expect(Tfoot({ children: null })).toBeNull();
    });
  });

  describe("Tr", () => {
    it("returns null", () => {
      expect(Tr({ children: null })).toBeNull();
    });
  });

  describe("Th", () => {
    it("returns null", () => {
      expect(Th({ children: "Header" })).toBeNull();
    });
  });

  describe("Td", () => {
    it("returns null", () => {
      expect(Td({ children: "Cell" })).toBeNull();
    });
  });
});

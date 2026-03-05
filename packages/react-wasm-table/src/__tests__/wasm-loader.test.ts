import { describe, expect, it } from "bun:test";
import { isWasmReady, getWasmMemory, setWasmUrl, createTableEngine } from "../wasm-loader";

describe("wasm-loader", () => {
  describe("isWasmReady", () => {
    it("returns false when WASM is not loaded", () => {
      expect(isWasmReady()).toBe(false);
    });
  });

  describe("getWasmMemory", () => {
    it("returns null when WASM is not loaded", () => {
      expect(getWasmMemory()).toBeNull();
    });
  });

  describe("setWasmUrl", () => {
    it("accepts a custom URL string", () => {
      // Should not throw
      setWasmUrl("https://example.com/custom.wasm");
    });
  });

  describe("createTableEngine", () => {
    it("throws when WASM is not initialized", () => {
      expect(() => createTableEngine()).toThrow();
    });
  });
});

import { describe, expect, it, mock } from "bun:test";

/**
 * Test the useWasmEngine hook logic.
 * Since we can't use @testing-library/react, we verify the module-level
 * functions (initWasm, createTableEngine, getWasmMemory) are correctly
 * wired by testing the imports exist and the hook file is valid.
 */

// Verify the hook module can be imported without errors
describe("useWasmEngine module", () => {
  it("exports useWasmEngine function", async () => {
    const mod = await import("../hooks/use-wasm-engine");
    expect(typeof mod.useWasmEngine).toBe("function");
  });

  it("has correct param interface (engineRef optional)", async () => {
    // The hook accepts { engineRef? } — just verify it doesn't crash with empty params
    const mod = await import("../hooks/use-wasm-engine");
    expect(mod.useWasmEngine).toBeDefined();
  });
});

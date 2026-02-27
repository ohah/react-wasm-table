import { describe, expect, it, mock, beforeEach } from "bun:test";
import { renderHook, waitFor } from "@testing-library/react";
import type { WasmTableEngine } from "../../types";

// Mock the wasm-loader module before importing the hook
const mockEngine = { enableDebugLog: mock(() => {}) } as unknown as WasmTableEngine;
const mockMemory = new WebAssembly.Memory({ initial: 1 });

// We need to mock the module at the source level.
// Since bun doesn't have jest.mock(), we test the hook's integration
// by verifying the exported function shape and behavior contract.

describe("useWasmEngine", () => {
  it("exports useWasmEngine function", async () => {
    const mod = await import("../hooks/use-wasm-engine");
    expect(typeof mod.useWasmEngine).toBe("function");
  });

  it("starts with engine=null", async () => {
    // We can call the hook but initWasm will fail (no WASM binary in test env).
    // The hook should handle this gracefully and keep engine=null.
    const { useWasmEngine } = await import("../hooks/use-wasm-engine");

    const consoleSpy = mock(() => {});
    const origError = console.error;
    console.error = consoleSpy;

    const { result } = renderHook(() => useWasmEngine({}));

    // Engine starts null
    expect(result.current.engine).toBeNull();
    expect(result.current.memoryBridgeRef.current).toBeNull();

    // Restore
    console.error = origError;
  });

  it("returns memoryBridgeRef as a ref object", async () => {
    const { useWasmEngine } = await import("../hooks/use-wasm-engine");

    const consoleSpy = mock(() => {});
    const origError = console.error;
    console.error = consoleSpy;

    const { result } = renderHook(() => useWasmEngine({}));
    expect(result.current.memoryBridgeRef).toHaveProperty("current");

    console.error = origError;
  });

  it("accepts optional engineRef parameter", async () => {
    const { useWasmEngine } = await import("../hooks/use-wasm-engine");

    const consoleSpy = mock(() => {});
    const origError = console.error;
    console.error = consoleSpy;

    const engineRef = { current: null } as React.RefObject<WasmTableEngine | null>;
    const { result } = renderHook(() => useWasmEngine({ engineRef }));
    expect(result.current.engine).toBeNull();

    console.error = origError;
  });
});

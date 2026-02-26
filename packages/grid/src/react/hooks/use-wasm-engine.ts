import { useState, useEffect, useRef } from "react";
import type { WasmTableEngine } from "../../types";
import { initWasm, createTableEngine, getWasmMemory } from "../../wasm-loader";
import { MemoryBridge } from "../../adapter/memory-bridge";

export interface UseWasmEngineParams {
  engineRef?: React.RefObject<WasmTableEngine | null>;
}

export function useWasmEngine({ engineRef }: UseWasmEngineParams) {
  const [engine, setEngine] = useState<WasmTableEngine | null>(null);
  const memoryBridgeRef = useRef<MemoryBridge | null>(null);

  useEffect(() => {
    let cancelled = false;
    initWasm().then(() => {
      if (!cancelled) {
        const eng = createTableEngine();
        setEngine(eng);
        if (engineRef) {
          engineRef.current = eng;
        }
        if (typeof window !== "undefined" && import.meta.env?.DEV) {
          Object.defineProperty(window, "__engine", {
            value: eng,
            writable: true,
            configurable: true,
          });
          eng.enableDebugLog?.();
        }
        const mem = getWasmMemory();
        if (mem) {
          memoryBridgeRef.current = new MemoryBridge(eng, mem);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [engineRef]);

  return { engine, memoryBridgeRef };
}

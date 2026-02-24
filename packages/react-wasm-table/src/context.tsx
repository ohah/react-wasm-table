import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { initWasm, isWasmReady } from "./wasm-loader";

interface WasmContextValue {
  ready: boolean;
  error: Error | null;
}

const WasmContext = createContext<WasmContextValue>({
  ready: false,
  error: null,
});

/** Provider that initializes WASM and exposes readiness state. */
export function WasmProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(isWasmReady());
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (ready) return;

    initWasm()
      .then(() => setReady(true))
      .catch((err) => setError(err instanceof Error ? err : new Error(String(err))));
  }, [ready]);

  return <WasmContext.Provider value={{ ready, error }}>{children}</WasmContext.Provider>;
}

/** Hook to check WASM readiness. */
export function useWasm(): WasmContextValue {
  return useContext(WasmContext);
}

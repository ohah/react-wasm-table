import type { WasmTableEngine } from "../types";

/**
 * Manages TypedArray views into WASM linear memory.
 * Handles generation-based cache invalidation and buffer re-creation
 * when WASM memory grows (which invalidates all existing ArrayBuffer references).
 */
export class MemoryBridge {
  private engine: WasmTableEngine;
  private memory: WebAssembly.Memory;
  private cachedLayoutBuf: Float32Array | null = null;
  private cachedViewIndices: Uint32Array | null = null;
  private lastLayoutOffset = 0;
  private lastLayoutLen = 0;
  private lastIndicesOffset = 0;
  private lastIndicesLen = 0;

  constructor(engine: WasmTableEngine, memory: WebAssembly.Memory) {
    this.engine = engine;
    this.memory = memory;
  }

  /**
   * Get the layout buffer as a Float32Array view.
   * Creates a new view only when the buffer pointer or memory has changed.
   */
  getLayoutBuffer(): Float32Array {
    const info = this.engine.getLayoutBufferInfo();
    const offset = info[0] ?? 0;
    const len = info[1] ?? 0;
    if (
      !this.cachedLayoutBuf ||
      offset !== this.lastLayoutOffset ||
      len !== this.lastLayoutLen ||
      this.cachedLayoutBuf.buffer !== this.memory.buffer
    ) {
      this.cachedLayoutBuf = new Float32Array(this.memory.buffer, offset, len);
      this.lastLayoutOffset = offset;
      this.lastLayoutLen = len;
    }
    return this.cachedLayoutBuf;
  }

  /**
   * Get the view indices as a Uint32Array view.
   */
  getViewIndices(): Uint32Array {
    const info = this.engine.getViewIndicesInfo();
    const offset = info[0] ?? 0;
    const len = info[1] ?? 0;
    if (
      !this.cachedViewIndices ||
      offset !== this.lastIndicesOffset ||
      len !== this.lastIndicesLen ||
      this.cachedViewIndices.buffer !== this.memory.buffer
    ) {
      this.cachedViewIndices = new Uint32Array(this.memory.buffer, offset, len);
      this.lastIndicesOffset = offset;
      this.lastIndicesLen = len;
    }
    return this.cachedViewIndices;
  }

  /**
   * Get a Float64Array view for a numeric column.
   * Returns null if column is not Float64/Bool.
   */
  getColumnFloat64(colIdx: number): Float64Array | null {
    const info = this.engine.getColumnFloat64Info(colIdx);
    if (info.length < 2) return null;
    const [offset, len] = info;
    return new Float64Array(this.memory.buffer, offset, len);
  }

  /** Invalidate all cached views (call when memory may have grown). */
  invalidate(): void {
    this.cachedLayoutBuf = null;
    this.cachedViewIndices = null;
  }
}

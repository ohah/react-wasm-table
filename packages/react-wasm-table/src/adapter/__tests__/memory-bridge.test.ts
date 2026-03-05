import { describe, expect, it, mock } from "bun:test";
import { MemoryBridge } from "../memory-bridge";

/** Create a minimal mock WasmTableEngine. */
function makeMockEngine(layoutInfo: [number, number], indicesInfo: [number, number]) {
  return {
    getLayoutBufferInfo: mock(() => layoutInfo),
    getColumnarViewIndicesInfo: mock(() => indicesInfo),
  } as any;
}

/** Create a real WebAssembly.Memory for testing. */
function makeMemory(pages = 1): WebAssembly.Memory {
  return new WebAssembly.Memory({ initial: pages }); // 1 page = 64KB
}

describe("MemoryBridge", () => {
  describe("getLayoutBuffer", () => {
    it("returns a Float32Array view into WASM memory", () => {
      const memory = makeMemory();
      const engine = makeMockEngine([0, 12], [0, 0]);
      const bridge = new MemoryBridge(engine, memory);

      const buf = bridge.getLayoutBuffer();
      expect(buf).toBeInstanceOf(Float32Array);
      expect(buf.length).toBe(12);
      expect(buf.buffer).toBe(memory.buffer);
    });

    it("caches the view when offset and length unchanged", () => {
      const memory = makeMemory();
      const engine = makeMockEngine([0, 12], [0, 0]);
      const bridge = new MemoryBridge(engine, memory);

      const buf1 = bridge.getLayoutBuffer();
      const buf2 = bridge.getLayoutBuffer();
      expect(buf1).toBe(buf2); // same reference
      expect(engine.getLayoutBufferInfo).toHaveBeenCalledTimes(2);
    });

    it("recreates view when offset changes", () => {
      const memory = makeMemory();
      let offset = 0;
      const engine = {
        getLayoutBufferInfo: mock(() => [offset, 12] as [number, number]),
        getColumnarViewIndicesInfo: mock(() => [0, 0] as [number, number]),
      } as any;
      const bridge = new MemoryBridge(engine, memory);

      const buf1 = bridge.getLayoutBuffer();
      offset = 48; // 12 floats * 4 bytes
      const buf2 = bridge.getLayoutBuffer();
      expect(buf1).not.toBe(buf2);
      expect(buf2.byteOffset).toBe(48);
    });

    it("recreates view when length changes", () => {
      const memory = makeMemory();
      let len = 12;
      const engine = {
        getLayoutBufferInfo: mock(() => [0, len] as [number, number]),
        getColumnarViewIndicesInfo: mock(() => [0, 0] as [number, number]),
      } as any;
      const bridge = new MemoryBridge(engine, memory);

      const buf1 = bridge.getLayoutBuffer();
      expect(buf1.length).toBe(12);

      len = 24;
      const buf2 = bridge.getLayoutBuffer();
      expect(buf2.length).toBe(24);
      expect(buf1).not.toBe(buf2);
    });

    it("recreates view when memory.buffer changes (memory growth)", () => {
      const memory = makeMemory(1);
      const engine = makeMockEngine([0, 12], [0, 0]);
      const bridge = new MemoryBridge(engine, memory);

      const buf1 = bridge.getLayoutBuffer();
      const oldBuffer = memory.buffer;

      // Grow memory — this detaches the old ArrayBuffer
      memory.grow(1);
      expect(memory.buffer).not.toBe(oldBuffer);

      const buf2 = bridge.getLayoutBuffer();
      expect(buf2).not.toBe(buf1);
      expect(buf2.buffer).toBe(memory.buffer);
    });

    it("handles zero-length buffer", () => {
      const memory = makeMemory();
      const engine = makeMockEngine([0, 0], [0, 0]);
      const bridge = new MemoryBridge(engine, memory);

      const buf = bridge.getLayoutBuffer();
      expect(buf.length).toBe(0);
    });
  });

  describe("getViewIndices", () => {
    it("returns a Uint32Array view into WASM memory", () => {
      const memory = makeMemory();
      const engine = makeMockEngine([0, 0], [0, 10]);
      const bridge = new MemoryBridge(engine, memory);

      const indices = bridge.getViewIndices();
      expect(indices).toBeInstanceOf(Uint32Array);
      expect(indices.length).toBe(10);
      expect(indices.buffer).toBe(memory.buffer);
    });

    it("caches the view when offset and length unchanged", () => {
      const memory = makeMemory();
      const engine = makeMockEngine([0, 0], [0, 10]);
      const bridge = new MemoryBridge(engine, memory);

      const idx1 = bridge.getViewIndices();
      const idx2 = bridge.getViewIndices();
      expect(idx1).toBe(idx2);
    });

    it("recreates view when offset changes", () => {
      const memory = makeMemory();
      let offset = 0;
      const engine = {
        getLayoutBufferInfo: mock(() => [0, 0] as [number, number]),
        getColumnarViewIndicesInfo: mock(() => [offset, 5] as [number, number]),
      } as any;
      const bridge = new MemoryBridge(engine, memory);

      const idx1 = bridge.getViewIndices();
      offset = 20; // 5 uint32s * 4 bytes
      const idx2 = bridge.getViewIndices();
      expect(idx1).not.toBe(idx2);
    });

    it("recreates view when memory grows", () => {
      const memory = makeMemory(1);
      const engine = makeMockEngine([0, 0], [0, 5]);
      const bridge = new MemoryBridge(engine, memory);

      const idx1 = bridge.getViewIndices();
      memory.grow(1);
      const idx2 = bridge.getViewIndices();
      expect(idx1).not.toBe(idx2);
      expect(idx2.buffer).toBe(memory.buffer);
    });
  });
});

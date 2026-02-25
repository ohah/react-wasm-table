import { describe, expect, it, mock } from "bun:test";
import { ColumnRegistry } from "../column-registry";
import type { ColumnProps } from "../../types";

function col(id: string, overrides?: Partial<ColumnProps>): ColumnProps {
  return { id, width: 100, header: id, ...overrides };
}

describe("ColumnRegistry", () => {
  it("registers and retrieves a column", () => {
    const reg = new ColumnRegistry();
    reg.register("name", col("name"));
    expect(reg.get("name")).toEqual(col("name"));
    expect(reg.size).toBe(1);
  });

  it("unregisters a column", () => {
    const reg = new ColumnRegistry();
    reg.register("name", col("name"));
    reg.unregister("name");
    expect(reg.get("name")).toBeUndefined();
    expect(reg.size).toBe(0);
  });

  it("getAll returns columns in insertion order", () => {
    const reg = new ColumnRegistry();
    reg.register("a", col("a"));
    reg.register("b", col("b"));
    reg.register("c", col("c"));

    const all = reg.getAll();
    expect(all.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });

  it("updates an existing column when re-registered", () => {
    const reg = new ColumnRegistry();
    reg.register("name", col("name", { width: 100 }));
    reg.register("name", col("name", { width: 200 }));
    expect(reg.get("name")?.width).toBe(200);
    expect(reg.size).toBe(1);
  });

  it("calls onChange listeners on register", () => {
    const reg = new ColumnRegistry();
    const cb = mock(() => {});
    reg.onChange(cb);
    reg.register("name", col("name"));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("calls onChange listeners on unregister", () => {
    const reg = new ColumnRegistry();
    reg.register("name", col("name"));
    const cb = mock(() => {});
    reg.onChange(cb);
    reg.unregister("name");
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes onChange listener", () => {
    const reg = new ColumnRegistry();
    const cb = mock(() => {});
    const unsub = reg.onChange(cb);
    unsub();
    reg.register("name", col("name"));
    expect(cb).not.toHaveBeenCalled();
  });

  // setAll tests
  it("setAll replaces all columns at once", () => {
    const reg = new ColumnRegistry();
    reg.register("old", col("old"));
    reg.setAll([col("a"), col("b"), col("c")]);
    expect(reg.size).toBe(3);
    expect(reg.getAll().map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(reg.get("old")).toBeUndefined();
  });

  it("setAll notifies listeners once", () => {
    const reg = new ColumnRegistry();
    const cb = mock(() => {});
    reg.onChange(cb);
    reg.setAll([col("a"), col("b")]);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("setAll with empty array clears all columns", () => {
    const reg = new ColumnRegistry();
    reg.register("a", col("a"));
    reg.register("b", col("b"));
    reg.setAll([]);
    expect(reg.size).toBe(0);
    expect(reg.getAll()).toEqual([]);
  });
});

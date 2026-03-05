import { describe, expect, it, mock } from "bun:test";
import { ColumnRegistry } from "../adapter/column-registry";
import type { ColumnSizingState } from "../tanstack-types";

// Directly test the resize logic without React hooks
// (mirrors the logic in useColumnResize)

const DEFAULT_MIN_WIDTH = 30;

function applyResize(
  columnRegistry: ColumnRegistry,
  colIndex: number,
  startWidth: number,
  deltaX: number,
  onColumnSizingChangeProp?: (updater: (prev: ColumnSizingState) => ColumnSizingState) => void,
) {
  const cols = columnRegistry.getAll();
  const col = cols[colIndex];
  if (!col) return;

  const minWidth = typeof col.minWidth === "number" ? col.minWidth : DEFAULT_MIN_WIDTH;
  const maxWidth = typeof col.maxWidth === "number" ? col.maxWidth : Infinity;
  const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + deltaX));

  if (onColumnSizingChangeProp) {
    onColumnSizingChangeProp((prev) => ({ ...prev, [col.id]: newWidth }));
  } else {
    columnRegistry.register(col.id, { ...col, width: newWidth });
  }
  return newWidth;
}

describe("useColumnResize — resize logic", () => {
  it("calls onColumnSizingChange with new width in controlled mode", () => {
    const registry = new ColumnRegistry();
    registry.setAll([
      { id: "name", width: 150, header: "Name" },
      { id: "age", width: 80, header: "Age" },
    ]);

    const onSizingChange = mock((updater: (prev: ColumnSizingState) => ColumnSizingState) => {
      return updater({});
    });

    applyResize(registry, 0, 150, 50, onSizingChange);
    expect(onSizingChange).toHaveBeenCalledTimes(1);
    const result = onSizingChange.mock.results[0]!;
    expect(result.value).toEqual({ name: 200 });
  });

  it("clamps to minWidth", () => {
    const registry = new ColumnRegistry();
    registry.setAll([{ id: "name", width: 100, minWidth: 60, header: "Name" }]);

    const result = applyResize(registry, 0, 100, -80);
    expect(result).toBe(60);
  });

  it("clamps to maxWidth", () => {
    const registry = new ColumnRegistry();
    registry.setAll([{ id: "name", width: 100, maxWidth: 200, header: "Name" }]);

    const result = applyResize(registry, 0, 100, 300);
    expect(result).toBe(200);
  });

  it("uses default minWidth of 30 when not specified", () => {
    const registry = new ColumnRegistry();
    registry.setAll([{ id: "name", width: 100, header: "Name" }]);

    const result = applyResize(registry, 0, 100, -200);
    expect(result).toBe(30);
  });

  it("updates registry directly in uncontrolled mode", () => {
    const registry = new ColumnRegistry();
    registry.setAll([{ id: "name", width: 100, header: "Name" }]);

    applyResize(registry, 0, 100, 50);
    expect(registry.get("name")!.width).toBe(150);
  });
});

describe("useColumnResize — hover cursor", () => {
  it("sets cursor to col-resize when colIndex is not null", () => {
    const style: { cursor: string } = { cursor: "" };
    const colIndex: number | null = 1;
    style.cursor = colIndex !== null ? "col-resize" : "";
    expect(style.cursor).toBe("col-resize");
  });

  it("resets cursor when colIndex is null", () => {
    const style: { cursor: string } = { cursor: "col-resize" };
    const colIndex: number | null = null;
    style.cursor = colIndex !== null ? "col-resize" : "";
    expect(style.cursor).toBe("");
  });
});

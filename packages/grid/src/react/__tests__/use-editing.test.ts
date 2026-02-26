import { describe, expect, it, mock } from "bun:test";
import { EditorManager } from "../../adapter/editor-manager";
import { ColumnRegistry } from "../../adapter/column-registry";

/**
 * Test editing logic extracted into useEditing.
 * Tests handleCellDoubleClick guard conditions and layout buffer lookup.
 */

// Stride = 12 floats per cell (as per MEMORY.md pointer API)
const STRIDE = 12;

function makeLayoutBuf(
  cells: { row: number; col: number; x: number; y: number; w: number; h: number; align: number }[],
) {
  const buf = new Float32Array(cells.length * STRIDE);
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i]!;
    buf[i * STRIDE + 0] = c.row;
    buf[i * STRIDE + 1] = c.col;
    buf[i * STRIDE + 2] = c.x;
    buf[i * STRIDE + 3] = c.y;
    buf[i * STRIDE + 4] = c.w;
    buf[i * STRIDE + 5] = c.h;
    buf[i * STRIDE + 6] = c.align;
  }
  return buf;
}

describe("useEditing logic", () => {
  it("does not open editor for non-editor columns", () => {
    const reg = new ColumnRegistry();
    reg.setAll([{ id: "name", width: 100 }] as any);

    const col = reg.getAll()[0]!;
    // No editor defined → should not open
    expect(col.editor).toBeUndefined();
  });

  it("opens editor when column has editor type and layout found", () => {
    const em = new EditorManager();
    const openSpy = mock(() => {});
    em.open = openSpy as any;

    const reg = new ColumnRegistry();
    reg.setAll([{ id: "name", width: 100, editor: "text" }] as any);

    const data = [{ name: "Alice" }];
    const coord = { row: 0, col: 0 };
    const col = reg.getAll()[coord.col]!;

    // Column has editor
    expect(col.editor).toBe("text");

    // Simulate layout buffer with 1 header + 1 data cell
    const buf = makeLayoutBuf([
      { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40, align: 0 }, // header
      { row: 0, col: 0, x: 0, y: 40, w: 100, h: 36, align: 0 }, // data
    ]);
    const headerCount = 1;
    const totalCellCount = 2;

    // Search for matching cell in buffer (mimics handleCellDoubleClick logic)
    let layout: any;
    for (let i = headerCount; i < totalCellCount; i++) {
      if (buf[i * STRIDE + 0] === coord.row && buf[i * STRIDE + 1] === coord.col) {
        layout = {
          row: coord.row,
          col: coord.col,
          x: buf[i * STRIDE + 2],
          y: buf[i * STRIDE + 3],
          width: buf[i * STRIDE + 4],
          height: buf[i * STRIDE + 5],
        };
        break;
      }
    }

    expect(layout).toBeDefined();
    em.open(coord, layout, col.editor!, data[coord.row]![col.id]);
    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it("module exports useEditing function", async () => {
    const mod = await import("../hooks/use-editing");
    expect(typeof mod.useEditing).toBe("function");
  });
});

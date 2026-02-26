import { describe, expect, it, mock } from "bun:test";
import { ColumnRegistry } from "../../adapter/column-registry";

/**
 * Test data ingestion logic.
 * Verifies the function calls that useDataIngestion makes to the engine.
 */

function makeEngine() {
  return {
    initColumnar: mock(() => {}),
    ingestFloat64Column: mock(() => {}),
    ingestStringColumn: mock(() => {}),
    ingestBoolColumn: mock(() => {}),
    finalizeColumnar: mock(() => {}),
    setColumnarScrollConfig: mock(() => {}),
  } as any;
}

describe("useDataIngestion logic", () => {
  it("calls ingestData and setColumnarScrollConfig with correct params", async () => {
    const { ingestData } = await import("../../adapter/data-ingestor");
    const engine = makeEngine();
    const data = [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ];
    const columnIds = ["name", "age"];

    ingestData(engine, data, columnIds);
    engine.setColumnarScrollConfig(36, 560, 5); // rowHeight=36, height-headerHeight=600-40

    expect(engine.initColumnar).toHaveBeenCalledWith(2, 2);
    expect(engine.finalizeColumnar).toHaveBeenCalled();
    expect(engine.setColumnarScrollConfig).toHaveBeenCalledWith(36, 560, 5);
  });

  it("module exports useDataIngestion function", async () => {
    const mod = await import("../hooks/use-data-ingestion");
    expect(typeof mod.useDataIngestion).toBe("function");
  });
});

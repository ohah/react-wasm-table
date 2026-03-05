import { describe, expect, it } from "bun:test";
import { createColumnHelper } from "../column-helper";
import { buildRowModel } from "../row-model";
import type { GridColumnDef } from "../tanstack-types";
import { exportToCSV, exportToTSV, exportToJSON } from "../export";

type Person = { name: string; age: number; status: string };
const helper = createColumnHelper<Person>();

const columns: GridColumnDef<Person, any>[] = [
  helper.accessor("name", { header: "Name" }),
  helper.accessor("age", { header: "Age" }),
  helper.accessor("status", { header: "Status" }),
];

const data: Person[] = [
  { name: "Alice", age: 30, status: "active" },
  { name: "Bob", age: 25, status: "inactive" },
  { name: "Charlie", age: 35, status: "active" },
];

function makeRowModel(d: Person[] = data, indices?: number[]) {
  const idx = indices ? new Uint32Array(indices) : null;
  return buildRowModel(d, idx, columns);
}

// ── CSV ──────────────────────────────────────────────────────────────

describe("exportToCSV", () => {
  it("exports basic CSV with headers", () => {
    const csv = exportToCSV(makeRowModel());
    const lines = csv.split("\n");
    expect(lines[0]).toBe("name,age,status");
    expect(lines[1]).toBe("Alice,30,active");
    expect(lines[2]).toBe("Bob,25,inactive");
    expect(lines[3]).toBe("Charlie,35,active");
    expect(lines).toHaveLength(4);
  });

  it("excludes headers when includeHeaders is false", () => {
    const csv = exportToCSV(makeRowModel(), { includeHeaders: false });
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Alice,30,active");
    expect(lines).toHaveLength(3);
  });

  it("selects specific columns", () => {
    const csv = exportToCSV(makeRowModel(), { columns: ["name", "status"] });
    const lines = csv.split("\n");
    expect(lines[0]).toBe("name,status");
    expect(lines[1]).toBe("Alice,active");
  });

  it("applies formatValue", () => {
    const csv = exportToCSV(makeRowModel(), {
      formatValue: (val, colId) => (colId === "age" ? `${val} years` : String(val ?? "")),
    });
    expect(csv).toContain("30 years");
    expect(csv).toContain("25 years");
  });

  it("escapes values with commas", () => {
    type Row = { val: string };
    const cols: GridColumnDef<Row, any>[] = [
      createColumnHelper<Row>().accessor("val", { header: "val" }),
    ];
    const rm = buildRowModel([{ val: "a,b" }], null, cols);
    const csv = exportToCSV(rm);
    expect(csv).toBe('val\n"a,b"');
  });

  it("escapes values with newlines", () => {
    type Row = { val: string };
    const cols: GridColumnDef<Row, any>[] = [
      createColumnHelper<Row>().accessor("val", { header: "val" }),
    ];
    const rm = buildRowModel([{ val: "line1\nline2" }], null, cols);
    const csv = exportToCSV(rm);
    expect(csv).toBe('val\n"line1\nline2"');
  });

  it("escapes values with double quotes", () => {
    type Row = { val: string };
    const cols: GridColumnDef<Row, any>[] = [
      createColumnHelper<Row>().accessor("val", { header: "val" }),
    ];
    const rm = buildRowModel([{ val: 'say "hello"' }], null, cols);
    const csv = exportToCSV(rm);
    expect(csv).toBe('val\n"say ""hello"""');
  });

  it("handles empty RowModel", () => {
    const rm = buildRowModel([] as Person[], null, columns);
    const csv = exportToCSV(rm);
    expect(csv).toBe("");
  });

  it("handles empty RowModel with explicit columns", () => {
    const rm = buildRowModel([] as Person[], null, columns);
    const csv = exportToCSV(rm, { columns: ["name", "age"] });
    expect(csv).toBe("name,age");
  });

  it("handles empty RowModel with includeHeaders false", () => {
    const rm = buildRowModel([] as Person[], null, columns);
    const csv = exportToCSV(rm, { includeHeaders: false });
    expect(csv).toBe("");
  });

  it("respects sorted index indirection", () => {
    // Indices [2,0,1] → Charlie, Alice, Bob
    const rm = makeRowModel(data, [2, 0, 1]);
    const csv = exportToCSV(rm, { columns: ["name"] });
    const lines = csv.split("\n");
    expect(lines[1]).toBe("Charlie");
    expect(lines[2]).toBe("Alice");
    expect(lines[3]).toBe("Bob");
  });
});

// ── TSV ──────────────────────────────────────────────────────────────

describe("exportToTSV", () => {
  it("exports basic TSV with headers", () => {
    const tsv = exportToTSV(makeRowModel());
    const lines = tsv.split("\n");
    expect(lines[0]).toBe("name\tage\tstatus");
    expect(lines[1]).toBe("Alice\t30\tactive");
  });

  it("replaces tabs in values", () => {
    type Row = { val: string };
    const cols: GridColumnDef<Row, any>[] = [
      createColumnHelper<Row>().accessor("val", { header: "val" }),
    ];
    const rm = buildRowModel([{ val: "a\tb" }], null, cols);
    const tsv = exportToTSV(rm);
    expect(tsv).toBe("val\na b");
  });

  it("replaces newlines in values", () => {
    type Row = { val: string };
    const cols: GridColumnDef<Row, any>[] = [
      createColumnHelper<Row>().accessor("val", { header: "val" }),
    ];
    const rm = buildRowModel([{ val: "a\nb" }], null, cols);
    const tsv = exportToTSV(rm);
    expect(tsv).toBe("val\na b");
  });

  it("selects specific columns", () => {
    const tsv = exportToTSV(makeRowModel(), { columns: ["age"] });
    const lines = tsv.split("\n");
    expect(lines[0]).toBe("age");
    expect(lines[1]).toBe("30");
  });

  it("handles empty RowModel", () => {
    const rm = buildRowModel([] as Person[], null, columns);
    const tsv = exportToTSV(rm);
    expect(tsv).toBe("");
  });
});

// ── JSON ─────────────────────────────────────────────────────────────

describe("exportToJSON", () => {
  it("exports all columns as object array", () => {
    const json = exportToJSON(makeRowModel());
    expect(json).toHaveLength(3);
    expect(json[0]).toEqual({ name: "Alice", age: 30, status: "active" });
    expect(json[2]).toEqual({ name: "Charlie", age: 35, status: "active" });
  });

  it("selects specific columns", () => {
    const json = exportToJSON(makeRowModel(), { columns: ["name"] });
    expect(json[0]).toEqual({ name: "Alice" });
    expect(json[1]).toEqual({ name: "Bob" });
  });

  it("handles empty RowModel", () => {
    const rm = buildRowModel([] as Person[], null, columns);
    const json = exportToJSON(rm);
    expect(json).toEqual([]);
  });

  it("respects sorted index indirection", () => {
    const rm = makeRowModel(data, [2, 0, 1]);
    const json = exportToJSON(rm, { columns: ["name"] });
    expect(json[0]).toEqual({ name: "Charlie" });
    expect(json[1]).toEqual({ name: "Alice" });
    expect(json[2]).toEqual({ name: "Bob" });
  });
});

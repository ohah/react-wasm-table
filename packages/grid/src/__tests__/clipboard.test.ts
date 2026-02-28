import { describe, expect, it } from "bun:test";
import { createColumnHelper } from "../column-helper";
import { buildGridInstance } from "../grid-instance";
import type { GridState } from "../grid-instance";
import {
  buildCSV,
  buildHTML,
  copyToClipboard,
  parseClipboardText,
  pasteFromClipboard,
} from "../clipboard";

type Person = { name: string; age: number; status: string };
const helper = createColumnHelper<Person>();

const columns = [
  helper.accessor("name", { header: "Name" }),
  helper.accessor("age", { header: "Age" }),
  helper.accessor("status", { header: "Status" }),
];

const data: Person[] = [
  { name: "Alice", age: 30, status: "active" },
  { name: "Bob", age: 25, status: "inactive" },
];

function makeTable() {
  const state: GridState = {
    sorting: [],
    columnFilters: [],
    globalFilter: "",
  };
  return buildGridInstance({
    data,
    columns,
    state,
    onSortingChange: () => {},
    onColumnFiltersChange: () => {},
    onGlobalFilterChange: () => {},
    onColumnPinningChange: () => {},
  });
}

// ── buildCSV ─────────────────────────────────────────────────────────

describe("buildCSV", () => {
  it("builds CSV from range and getText", () => {
    const getText = (r: number, c: number) =>
      r === 0 && c === 0 ? "a" : r === 0 && c === 1 ? "b" : "c";
    const out = buildCSV({ minRow: 0, maxRow: 1, minCol: 0, maxCol: 1 }, getText);
    expect(out).toBe("a,b\nc,c");
  });

  it("escapes comma and quote", () => {
    const getText = () => 'a,"b"';
    const out = buildCSV({ minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 }, getText);
    expect(out).toBe('"a,""b"""');
  });
});

// ── buildHTML ────────────────────────────────────────────────────────

describe("buildHTML", () => {
  it("builds HTML table from range and getText", () => {
    const getText = (r: number, c: number) => `${r}-${c}`;
    const out = buildHTML({ minRow: 0, maxRow: 1, minCol: 0, maxCol: 1 }, getText);
    expect(out).toContain("<table>");
    expect(out).toContain("<tbody>");
    expect(out).toContain("<td>0-0</td><td>0-1</td>");
    expect(out).toContain("<td>1-0</td><td>1-1</td>");
  });

  it("escapes HTML in cell content", () => {
    const getText = () => "<script>";
    const out = buildHTML({ minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 }, getText);
    expect(out).toBe("<table><tbody><tr><td>&lt;script&gt;</td></tr></tbody></table>");
  });
});

// ── parseClipboardText ──────────────────────────────────────────────

describe("parseClipboardText", () => {
  it("parses TSV (tab-delimited)", () => {
    const rows = parseClipboardText("a\tb\nc\td");
    expect(rows).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("parses CSV (comma-delimited)", () => {
    const rows = parseClipboardText("a,b\nc,d");
    expect(rows).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("uses tab as delimiter when first line contains tab", () => {
    const rows = parseClipboardText("x\ty\n1\t2");
    expect(rows[0]).toEqual(["x", "y"]);
    expect(rows[1]).toEqual(["1", "2"]);
  });

  it("uses comma as delimiter when first line has no tab", () => {
    const rows = parseClipboardText("a,b\n1,2");
    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("parses CSV with quoted fields", () => {
    const rows = parseClipboardText('"a,b",c\n"d""e",f');
    expect(rows).toEqual([
      ["a,b", "c"],
      ['d"e', "f"],
    ]);
  });

  it("returns empty array for empty string", () => {
    expect(parseClipboardText("")).toEqual([]);
    expect(parseClipboardText("   ")).toEqual([]);
  });
});

// ── copyToClipboard ─────────────────────────────────────────────────

describe("copyToClipboard", () => {
  it("returns TSV by default", () => {
    const table = makeTable();
    const out = copyToClipboard(table, { minRow: 0, maxRow: 1, minCol: 0, maxCol: 2 });
    expect(out).toBe("Alice\t30\tactive\nBob\t25\tinactive");
  });

  it("returns CSV when format is csv", () => {
    const table = makeTable();
    const out = copyToClipboard(
      table,
      { minRow: 0, maxRow: 0, minCol: 0, maxCol: 2 },
      { format: "csv" },
    );
    expect(out).toBe("Alice,30,active");
  });

  it("returns HTML when format is html", () => {
    const table = makeTable();
    const out = copyToClipboard(
      table,
      { minRow: 0, maxRow: 0, minCol: 0, maxCol: 1 },
      { format: "html" },
    );
    expect(out).toContain("<table>");
    expect(out).toContain("Alice");
    expect(out).toContain("30");
  });

  it("includes header row when includeHeaders is true", () => {
    const table = makeTable();
    const out = copyToClipboard(
      table,
      { minRow: 0, maxRow: 0, minCol: 0, maxCol: 2 },
      { includeHeaders: true },
    );
    expect(out).toContain("Name");
    expect(out).toContain("Age");
    expect(out).toContain("Status");
    expect(out).toContain("Alice");
  });
});

// ── pasteFromClipboard ──────────────────────────────────────────────

describe("pasteFromClipboard", () => {
  it("returns cells, target, and columnIds", () => {
    const table = makeTable();
    const result = pasteFromClipboard(table, "x\ty\n1\t2", { row: 0, col: 0 });
    expect(result.cells).toEqual([
      ["x", "y"],
      ["1", "2"],
    ]);
    expect(result.target).toEqual({ row: 0, col: 0 });
    expect(result.columnIds).toEqual(["name", "age", "status"]);
  });

  it("slices columnIds from target col", () => {
    const table = makeTable();
    const result = pasteFromClipboard(table, "only", { row: 1, col: 2 });
    expect(result.columnIds).toEqual(["status"]);
  });
});

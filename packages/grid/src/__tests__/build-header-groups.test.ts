import { describe, expect, it } from "bun:test";
import { createColumnHelper } from "../column-helper";
import { buildGridInstance } from "../grid-instance";
import { buildHeaderGroups } from "../build-header-groups";
import type { GridColumnDef } from "../tanstack-types";

type Person = {
  firstName: string;
  lastName: string;
  age: number;
  status: string;
};

const helper = createColumnHelper<Person>();

function build(columns: GridColumnDef<Person, any>[]) {
  const instance = buildGridInstance({
    columns,
    state: { sorting: [] },
    onSortingChange: () => {},
  });
  return buildHeaderGroups(instance.getAllColumns());
}

describe("buildHeaderGroups", () => {
  it("creates a single header group for flat columns", () => {
    const groups = build([
      helper.accessor("firstName", { header: "First", size: 150 }),
      helper.accessor("lastName", { header: "Last", size: 150 }),
      helper.accessor("age", { header: "Age", size: 80 }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]!.depth).toBe(0);
    expect(groups[0]!.headers).toHaveLength(3);
    expect(groups[0]!.headers[0]!.column.id).toBe("firstName");
    expect(groups[0]!.headers[1]!.column.id).toBe("lastName");
    expect(groups[0]!.headers[2]!.column.id).toBe("age");
  });

  it("flat columns have colSpan 1 and rowSpan 1", () => {
    const groups = build([
      helper.accessor("firstName", { header: "First" }),
      helper.accessor("age", { header: "Age" }),
    ]);

    for (const h of groups[0]!.headers) {
      expect(h.colSpan).toBe(1);
      expect(h.rowSpan).toBe(1);
    }
  });

  it("creates two header group rows for one level of grouping", () => {
    const groups = build([
      helper.group({
        header: "Name",
        columns: [
          helper.accessor("firstName", { header: "First" }),
          helper.accessor("lastName", { header: "Last" }),
        ],
      }),
      helper.accessor("age", { header: "Age" }),
    ]);

    expect(groups).toHaveLength(2);
    // Top row: Name group + Age placeholder
    expect(groups[0]!.depth).toBe(0);
    expect(groups[0]!.headers).toHaveLength(2);
    // Name group spans 2 columns
    const nameHeader = groups[0]!.headers[0]!;
    expect(nameHeader.isPlaceholder).toBe(false);
    expect(nameHeader.colSpan).toBe(2);
    expect(nameHeader.rowSpan).toBe(1);
    // Age is a placeholder (it has no parent group)
    const ageHeader = groups[0]!.headers[1]!;
    expect(ageHeader.isPlaceholder).toBe(true);
    expect(ageHeader.colSpan).toBe(1);
    expect(ageHeader.rowSpan).toBe(2); // spans both rows

    // Bottom row: First, Last, Age leaf headers
    expect(groups[1]!.depth).toBe(1);
    expect(groups[1]!.headers).toHaveLength(3);
    expect(groups[1]!.headers[0]!.column.id).toBe("firstName");
    expect(groups[1]!.headers[1]!.column.id).toBe("lastName");
    expect(groups[1]!.headers[2]!.column.id).toBe("age");
  });

  it("creates three header group rows for two levels of grouping", () => {
    const groups = build([
      helper.group({
        header: "Info",
        columns: [
          helper.group({
            header: "Name",
            columns: [
              helper.accessor("firstName", { header: "First" }),
              helper.accessor("lastName", { header: "Last" }),
            ],
          }),
          helper.accessor("age", { header: "Age" }),
        ],
      }),
    ]);

    expect(groups).toHaveLength(3);

    // Top: Info header spanning all
    expect(groups[0]!.headers).toHaveLength(1);
    expect(groups[0]!.headers[0]!.colSpan).toBe(3);
    expect(groups[0]!.headers[0]!.rowSpan).toBe(1);

    // Middle: Name (colSpan 2) + Age placeholder (rowSpan 2)
    expect(groups[1]!.headers).toHaveLength(2);
    const nameHeader = groups[1]!.headers[0]!;
    expect(nameHeader.colSpan).toBe(2);
    expect(nameHeader.rowSpan).toBe(1);
    const agePlaceholder = groups[1]!.headers[1]!;
    expect(agePlaceholder.column.id).toBe("age");
    // Age has depth 1 in a max-depth-2 tree, so it's a placeholder
    // Its rowSpan should be 2 (spans from depth 1 to leaf depth 2)
    expect(agePlaceholder.rowSpan).toBe(2);

    // Bottom: First, Last, Age leaves
    expect(groups[2]!.headers).toHaveLength(3);
  });

  it("mixed depth columns produce correct placeholders", () => {
    const groups = build([
      helper.group({
        header: "Name",
        columns: [
          helper.accessor("firstName", { header: "First" }),
          helper.accessor("lastName", { header: "Last" }),
        ],
      }),
      helper.accessor("age", { header: "Age" }),
      helper.accessor("status", { header: "Status" }),
    ]);

    // 2 rows (depth 0 and depth 1)
    expect(groups).toHaveLength(2);

    // Row 0: Name group + Age placeholder + Status placeholder
    expect(groups[0]!.headers).toHaveLength(3);
    expect(groups[0]!.headers[0]!.colSpan).toBe(2);
    expect(groups[0]!.headers[0]!.isPlaceholder).toBe(false);
    expect(groups[0]!.headers[1]!.isPlaceholder).toBe(true);
    expect(groups[0]!.headers[1]!.rowSpan).toBe(2);
    expect(groups[0]!.headers[2]!.isPlaceholder).toBe(true);
    expect(groups[0]!.headers[2]!.rowSpan).toBe(2);
  });

  it("handles empty columns array", () => {
    const groups = build([]);
    // Single header group row with no headers
    expect(groups).toHaveLength(1);
    expect(groups[0]!.headers).toHaveLength(0);
  });

  it("handles single column (no grouping)", () => {
    const groups = build([helper.accessor("firstName", { header: "First" })]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.headers).toHaveLength(1);
    expect(groups[0]!.headers[0]!.colSpan).toBe(1);
    expect(groups[0]!.headers[0]!.rowSpan).toBe(1);
    expect(groups[0]!.headers[0]!.isPlaceholder).toBe(false);
  });

  it("creates four rows for three levels of grouping", () => {
    const groups = build([
      helper.group({
        header: "Root",
        columns: [
          helper.group({
            header: "Level1",
            columns: [
              helper.group({
                header: "Level2",
                columns: [
                  helper.accessor("firstName", { header: "First" }),
                  helper.accessor("lastName", { header: "Last" }),
                ],
              }),
            ],
          }),
        ],
      }),
      helper.accessor("age", { header: "Age" }),
    ]);

    expect(groups).toHaveLength(4);

    // Top row: Root + Age placeholder
    expect(groups[0]!.headers).toHaveLength(2);
    expect(groups[0]!.headers[0]!.colSpan).toBe(2);
    expect(groups[0]!.headers[1]!.isPlaceholder).toBe(true);
    expect(groups[0]!.headers[1]!.rowSpan).toBe(4); // spans all 4 rows

    // Bottom row: leaf columns
    expect(groups[3]!.headers).toHaveLength(3);
    expect(groups[3]!.headers[0]!.column.id).toBe("firstName");
    expect(groups[3]!.headers[1]!.column.id).toBe("lastName");
    expect(groups[3]!.headers[2]!.column.id).toBe("age");
  });

  it("getContext returns header context", () => {
    const groups = build([helper.accessor("firstName", { header: "First" })]);

    const ctx = groups[0]!.headers[0]!.getContext();
    expect(ctx.column.id).toBe("firstName");
  });

  it("getContext works on leaf headers in grouped columns", () => {
    const groups = build([
      helper.group({
        header: "Name",
        columns: [
          helper.accessor("firstName", { header: "First" }),
          helper.accessor("lastName", { header: "Last" }),
        ],
      }),
    ]);

    // Leaf headers are at depth 1
    const leafCtx = groups[1]!.headers[0]!.getContext();
    expect(leafCtx.column.id).toBe("firstName");
    const leafCtx2 = groups[1]!.headers[1]!.getContext();
    expect(leafCtx2.column.id).toBe("lastName");
  });

  it("getContext works on group parent headers", () => {
    const groups = build([
      helper.group({
        id: "nameGroup",
        header: "Name",
        columns: [
          helper.accessor("firstName", { header: "First" }),
          helper.accessor("lastName", { header: "Last" }),
        ],
      }),
      helper.accessor("age", { header: "Age" }),
    ]);

    // Parent header at depth 0
    const groupCtx = groups[0]!.headers[0]!.getContext();
    expect(groupCtx.column.id).toBe("nameGroup");
  });

  it("getContext works on placeholder headers", () => {
    const groups = build([
      helper.group({
        header: "Name",
        columns: [
          helper.accessor("firstName", { header: "First" }),
          helper.accessor("lastName", { header: "Last" }),
        ],
      }),
      helper.accessor("age", { header: "Age" }),
    ]);

    // Placeholder header for "age" at depth 0
    const placeholderCtx = groups[0]!.headers[1]!.getContext();
    expect(placeholderCtx.column.id).toBe("age");
  });

  it("passes table reference to header getContext", () => {
    const instance = buildGridInstance({
      columns: [
        helper.accessor("firstName", { header: "First" }),
        helper.accessor("age", { header: "Age" }),
      ],
      state: { sorting: [] },
      onSortingChange: () => {},
    });
    const tableRef = { id: "test-table" };
    const groups = buildHeaderGroups(instance.getAllColumns(), tableRef);
    const ctx = groups[0]!.headers[0]!.getContext();
    expect(ctx.table).toBe(tableRef);
  });

  it("includes header self-reference in getContext", () => {
    const instance = buildGridInstance({
      columns: [helper.accessor("firstName", { header: "First" })],
      state: { sorting: [] },
      onSortingChange: () => {},
    });
    const groups = buildHeaderGroups(instance.getAllColumns());
    const header = groups[0]!.headers[0]!;
    const ctx = header.getContext();
    expect(ctx.header).toBe(header);
  });

  it("table reference is undefined when not provided", () => {
    const instance = buildGridInstance({
      columns: [helper.accessor("firstName", { header: "First" })],
      state: { sorting: [] },
      onSortingChange: () => {},
    });
    const groups = buildHeaderGroups(instance.getAllColumns());
    const ctx = groups[0]!.headers[0]!.getContext();
    expect(ctx.table).toBeUndefined();
  });
});

import { describe, expect, it } from "bun:test";
import { createColumnHelper } from "../column-helper";
import { resolveColumns, getLeafColumns } from "../resolve-columns";

type Person = {
  firstName: string;
  lastName: string;
  age: number;
  status: string;
};

const helper = createColumnHelper<Person>();

describe("resolveColumns", () => {
  it("converts accessor key column to ColumnProps", () => {
    const defs = [
      helper.accessor("firstName", {
        header: "First Name",
        size: 150,
        enableSorting: true,
      }),
    ];
    const result = resolveColumns(defs, []);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("firstName");
    expect(result[0]!.width).toBe(150);
    expect(result[0]!.header).toBe("First Name");
    expect(result[0]!.sortable).toBe(true);
  });

  it("maps size → width, minSize → minWidth, maxSize → maxWidth", () => {
    const defs = [
      helper.accessor("age", {
        header: "Age",
        size: 80,
        minSize: 50,
        maxSize: 200,
      }),
    ];
    const result = resolveColumns(defs, []);
    expect(result[0]!.width).toBe(80);
    expect(result[0]!.minWidth).toBe(50);
    expect(result[0]!.maxWidth).toBe(200);
  });

  it("preserves flexbox extension props", () => {
    const defs = [
      helper.accessor("firstName", {
        header: "Name",
        flexGrow: 1,
        flexShrink: 0,
        align: "right",
        padding: 8,
      }),
    ];
    const result = resolveColumns(defs, []);
    expect(result[0]!.flexGrow).toBe(1);
    expect(result[0]!.flexShrink).toBe(0);
    expect(result[0]!.align).toBe("right");
    expect(result[0]!.padding).toBe(8);
  });

  it("flattens group columns to leaf columns", () => {
    const defs = [
      helper.group({
        header: "Name",
        columns: [
          helper.accessor("firstName", { header: "First", size: 100 }),
          helper.accessor("lastName", { header: "Last", size: 100 }),
        ],
      }),
      helper.accessor("age", { header: "Age", size: 80 }),
    ];
    const result = resolveColumns(defs, []);
    expect(result).toHaveLength(3);
    expect(result[0]!.id).toBe("firstName");
    expect(result[1]!.id).toBe("lastName");
    expect(result[2]!.id).toBe("age");
  });

  it("flattens nested groups", () => {
    const defs = [
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
    ];
    const result = resolveColumns(defs, []);
    expect(result).toHaveLength(3);
    expect(result[0]!.id).toBe("firstName");
    expect(result[1]!.id).toBe("lastName");
    expect(result[2]!.id).toBe("age");
  });

  it("wraps cell function into children with CellContext", () => {
    const defs = [
      helper.accessor("age", {
        header: "Age",
        cell: (info) => ({
          type: "text" as const,
          value: String(info.getValue()),
          style: { fontWeight: "bold" },
        }),
      }),
    ];
    const result = resolveColumns(defs, []);
    expect(result[0]!.children).toBeDefined();
    // Call children with a value — it should produce a RenderInstruction
    const instruction = result[0]!.children!(42);
    expect(instruction.type).toBe("text");
    expect(instruction.value).toBe("42");
  });

  it("wraps string cell into text instruction", () => {
    const defs = [
      helper.accessor("status", {
        header: "Status",
        cell: "N/A",
      }),
    ];
    const result = resolveColumns(defs, []);
    const instruction = result[0]!.children!("anything");
    expect(instruction).toEqual({ type: "text", value: "N/A" });
  });

  it("converts display column", () => {
    const defs = [
      helper.display({
        id: "actions",
        header: "Actions",
        size: 120,
      }),
    ];
    const result = resolveColumns(defs, []);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("actions");
    expect(result[0]!.width).toBe(120);
    expect(result[0]!.header).toBe("Actions");
  });

  it("handles header render function", () => {
    const defs = [
      helper.accessor("firstName", {
        header: (ctx) => `Col: ${ctx.column.id}`,
      }),
    ];
    const result = resolveColumns(defs, []);
    expect(result[0]!.header).toBe("Col: firstName");
  });

  it("uses accessor function column with explicit id", () => {
    const defs = [
      helper.accessor((row: Person) => `${row.firstName} ${row.lastName}`, {
        id: "fullName",
        header: "Full Name",
        size: 200,
      }),
    ];
    const result = resolveColumns(defs, []);
    expect(result[0]!.id).toBe("fullName");
  });

  it("passes through margin properties", () => {
    const defs = [
      helper.accessor("firstName", {
        header: "First",
        margin: [4, 8],
        marginTop: 10,
        marginRight: 12,
        marginBottom: 14,
        marginLeft: 16,
      }),
    ];
    const result = resolveColumns(defs, []);
    expect(result[0]!.margin).toEqual([4, 8]);
    expect(result[0]!.marginTop).toBe(10);
    expect(result[0]!.marginRight).toBe(12);
    expect(result[0]!.marginBottom).toBe(14);
    expect(result[0]!.marginLeft).toBe(16);
  });

  it("passes through border properties", () => {
    const defs = [
      helper.accessor("firstName", {
        header: "First",
        borderWidth: 2,
        borderTopWidth: 1,
        borderRightWidth: 3,
        borderBottomWidth: 1,
        borderLeftWidth: 3,
      }),
    ];
    const result = resolveColumns(defs, []);
    expect(result[0]!.borderWidth).toBe(2);
    expect(result[0]!.borderTopWidth).toBe(1);
    expect(result[0]!.borderRightWidth).toBe(3);
    expect(result[0]!.borderBottomWidth).toBe(1);
    expect(result[0]!.borderLeftWidth).toBe(3);
  });

  it("passes through height properties", () => {
    const defs = [
      helper.accessor("firstName", {
        header: "First",
        height: 50,
        minHeight: 30,
        maxHeight: 100,
      }),
    ];
    const result = resolveColumns(defs, []);
    expect(result[0]!.height).toBe(50);
    expect(result[0]!.minHeight).toBe(30);
    expect(result[0]!.maxHeight).toBe(100);
  });

  it("passes through position and inset properties", () => {
    const defs = [
      helper.accessor("firstName", {
        header: "First",
        position: "absolute",
        inset: [0, 10, 0, 10],
        insetTop: 5,
        insetRight: 15,
        insetBottom: 5,
        insetLeft: 15,
      }),
    ];
    const result = resolveColumns(defs, []);
    expect(result[0]!.position).toBe("absolute");
    expect(result[0]!.inset).toEqual([0, 10, 0, 10]);
    expect(result[0]!.insetTop).toBe(5);
    expect(result[0]!.insetRight).toBe(15);
    expect(result[0]!.insetBottom).toBe(5);
    expect(result[0]!.insetLeft).toBe(15);
  });

  it("passes through grid placement and self-alignment", () => {
    const defs = [
      helper.accessor("firstName", {
        header: "First",
        gridRow: [1, 3],
        gridColumn: "span 2",
        justifySelf: "center",
        alignSelf: "stretch",
      }),
    ];
    const result = resolveColumns(defs, []);
    expect(result[0]!.gridRow).toEqual([1, 3]);
    expect(result[0]!.gridColumn).toBe("span 2");
    expect(result[0]!.justifySelf).toBe("center");
    expect(result[0]!.alignSelf).toBe("stretch");
  });

  it("passes through individual padding properties", () => {
    const defs = [
      helper.accessor("firstName", {
        header: "First",
        paddingTop: 2,
        paddingRight: 4,
        paddingBottom: 6,
        paddingLeft: 8,
      }),
    ];
    const result = resolveColumns(defs, []);
    expect(result[0]!.paddingTop).toBe(2);
    expect(result[0]!.paddingRight).toBe(4);
    expect(result[0]!.paddingBottom).toBe(6);
    expect(result[0]!.paddingLeft).toBe(8);
  });

  it("passes through flexBasis and editor", () => {
    const defs = [
      helper.accessor("firstName", {
        header: "First",
        flexBasis: "50%",
        editor: "text",
      }),
    ];
    const result = resolveColumns(defs, []);
    expect(result[0]!.flexBasis).toBe("50%");
    expect(result[0]!.editor).toBe("text");
  });

  it("omits undefined properties (no spurious keys)", () => {
    const defs = [
      helper.accessor("firstName", { header: "First", size: 100 }),
    ];
    const result = resolveColumns(defs, []);
    expect("margin" in result[0]!).toBe(false);
    expect("borderWidth" in result[0]!).toBe(false);
    expect("position" in result[0]!).toBe(false);
    expect("height" in result[0]!).toBe(false);
    expect("gridRow" in result[0]!).toBe(false);
  });

  it("cell with JSX-like return resolves via resolveInstruction", () => {
    const defs = [
      helper.accessor("age", {
        header: "Age",
        cell: (info) => `Age: ${info.getValue()}`,
      }),
    ];
    const result = resolveColumns(defs, []);
    const instruction = result[0]!.children!(25);
    expect(instruction.type).toBe("text");
    expect(instruction.value).toBe("Age: 25");
  });
});

describe("getLeafColumns", () => {
  it("returns flat columns as-is", () => {
    const defs = [
      helper.accessor("firstName", { header: "First" }),
      helper.accessor("age", { header: "Age" }),
    ];
    const leaves = getLeafColumns(defs);
    expect(leaves).toHaveLength(2);
  });

  it("extracts leaf columns from groups", () => {
    const defs = [
      helper.group({
        header: "Name",
        columns: [
          helper.accessor("firstName", { header: "First" }),
          helper.accessor("lastName", { header: "Last" }),
        ],
      }),
      helper.accessor("age", { header: "Age" }),
    ];
    const leaves = getLeafColumns(defs);
    expect(leaves).toHaveLength(3);
    expect((leaves[0] as { accessorKey: string }).accessorKey).toBe("firstName");
    expect((leaves[1] as { accessorKey: string }).accessorKey).toBe("lastName");
    expect((leaves[2] as { accessorKey: string }).accessorKey).toBe("age");
  });
});

import { describe, expect, it } from "bun:test";
import { createColumnHelper } from "../column-helper";

type Person = {
  firstName: string;
  lastName: string;
  age: number;
  status: string;
};

describe("createColumnHelper", () => {
  const helper = createColumnHelper<Person>();

  describe("accessor with key", () => {
    it("creates a column def with accessorKey", () => {
      const col = helper.accessor("firstName", {
        header: "First Name",
        size: 150,
      });
      expect(col.accessorKey).toBe("firstName");
      expect(col.header).toBe("First Name");
      expect(col.size).toBe(150);
    });

    it("preserves all options", () => {
      const col = helper.accessor("age", {
        header: "Age",
        size: 80,
        enableSorting: true,
        align: "right",
        flexGrow: 1,
      });
      expect(col.accessorKey).toBe("age");
      expect(col.enableSorting).toBe(true);
      expect(col.align).toBe("right");
      expect(col.flexGrow).toBe(1);
    });
  });

  describe("accessor with function", () => {
    it("creates a column def with accessorFn", () => {
      const fn = (row: Person) => `${row.firstName} ${row.lastName}`;
      const col = helper.accessor(fn, {
        id: "fullName",
        header: "Full Name",
        size: 200,
      });
      expect(col.accessorFn).toBe(fn);
      expect(col.id).toBe("fullName");
      expect(col.header).toBe("Full Name");
    });
  });

  describe("display", () => {
    it("creates a display column def", () => {
      const col = helper.display({
        id: "actions",
        header: "Actions",
        size: 100,
      });
      expect(col.id).toBe("actions");
      expect(col.header).toBe("Actions");
    });
  });

  describe("group", () => {
    it("creates a group column def with sub-columns", () => {
      const col = helper.group({
        header: "Name",
        columns: [
          helper.accessor("firstName", { header: "First", size: 100 }),
          helper.accessor("lastName", { header: "Last", size: 100 }),
        ],
      });
      expect(col.header).toBe("Name");
      expect(col.columns).toHaveLength(2);
      expect(col.columns![0]!.accessorKey).toBe("firstName");
      expect(col.columns![1]!.accessorKey).toBe("lastName");
    });

    it("supports nested groups", () => {
      const col = helper.group({
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
      });
      expect(col.columns).toHaveLength(2);
      expect(col.columns![0]!.columns).toHaveLength(2);
    });
  });
});

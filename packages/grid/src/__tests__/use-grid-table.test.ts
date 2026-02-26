/**
 * Tests for useGridTable hook logic.
 *
 * Since we don't have @testing-library/react or a DOM environment,
 * we test the hook's core logic through buildGridInstance directly.
 * The hook is a thin wrapper that adds React state management
 * (useState + useMemo + useCallback) around buildGridInstance.
 *
 * What useGridTable adds over buildGridInstance:
 * 1. Controlled vs uncontrolled sorting state resolution
 * 2. SortingUpdater function evaluation (function → direct value)
 * 3. onSortingChange callback routing
 *
 * We test these three behaviors here using the same patterns.
 */
import { describe, expect, it } from "bun:test";
import { createColumnHelper } from "../column-helper";
import { buildGridInstance } from "../grid-instance";
import type { SortingState, SortingUpdater, GridColumnDef } from "../tanstack-types";
import type { GridState } from "../grid-instance";

type Person = { name: string; age: number; status: string };
const helper = createColumnHelper<Person>();

const columns: GridColumnDef<Person, any>[] = [
  helper.accessor("name", { header: "Name", size: 150 }),
  helper.accessor("age", { header: "Age", size: 80, enableSorting: true }),
  helper.accessor("status", { header: "Status", size: 120, enableSorting: true }),
];

/**
 * Simulate the hook's controlled/uncontrolled state resolution logic:
 * - If controlledState.sorting is provided, use it
 * - Otherwise, use internalSorting (default from initialState)
 * - onSortingChange: if controlled callback is provided, call it; else set internal
 */
function simulateHookState(opts: {
  controlledSorting?: SortingState;
  initialSorting?: SortingState;
  onSortingChange?: (updater: SortingUpdater) => void;
}) {
  let internalSorting: SortingState = opts.initialSorting ?? [];
  const sorting = opts.controlledSorting ?? internalSorting;

  const onSortingChange = (updater: SortingUpdater) => {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    if (opts.onSortingChange) {
      opts.onSortingChange(next);
    } else {
      internalSorting = next;
    }
  };

  const state: GridState = { sorting };

  return {
    instance: buildGridInstance({ columns, state, onSortingChange }),
    getSorting: () => opts.controlledSorting ?? internalSorting,
  };
}

describe("useGridTable state logic", () => {
  describe("uncontrolled mode", () => {
    it("defaults to empty sorting", () => {
      const { instance } = simulateHookState({});
      expect(instance.getState().sorting).toEqual([]);
    });

    it("uses initialState.sorting", () => {
      const { instance } = simulateHookState({
        initialSorting: [{ id: "age", desc: false }],
      });
      expect(instance.getState().sorting).toEqual([{ id: "age", desc: false }]);
    });

    it("toggleSorting updates internal state", () => {
      const { instance, getSorting } = simulateHookState({});
      instance.getColumn("age")!.toggleSorting();
      expect(getSorting()).toEqual([{ id: "age", desc: false }]);
    });

    it("setSorting updates internal state", () => {
      const { instance, getSorting } = simulateHookState({});
      instance.setSorting([{ id: "status", desc: true }]);
      expect(getSorting()).toEqual([{ id: "status", desc: true }]);
    });

    it("resetSorting clears to empty", () => {
      const { instance, getSorting } = simulateHookState({
        initialSorting: [{ id: "age", desc: true }],
      });
      instance.resetSorting();
      expect(getSorting()).toEqual([]);
    });
  });

  describe("controlled mode", () => {
    it("uses controlledSorting over initialSorting", () => {
      const { instance } = simulateHookState({
        controlledSorting: [{ id: "status", desc: false }],
        initialSorting: [{ id: "age", desc: true }],
      });
      expect(instance.getState().sorting).toEqual([{ id: "status", desc: false }]);
    });

    it("calls onSortingChange when toggle is invoked", () => {
      let captured: SortingUpdater | undefined;
      const { instance } = simulateHookState({
        controlledSorting: [],
        onSortingChange: (updater) => {
          captured = updater;
        },
      });
      instance.getColumn("age")!.toggleSorting();
      expect(captured).toBeDefined();
      expect(captured).toEqual([{ id: "age", desc: false }]);
    });

    it("calls onSortingChange on setSorting", () => {
      let captured: SortingUpdater | undefined;
      const { instance } = simulateHookState({
        controlledSorting: [],
        onSortingChange: (updater) => {
          captured = updater;
        },
      });
      instance.setSorting([{ id: "age", desc: true }]);
      expect(captured).toEqual([{ id: "age", desc: true }]);
    });

    it("calls onSortingChange on resetSorting", () => {
      let captured: SortingUpdater | undefined;
      const { instance } = simulateHookState({
        controlledSorting: [{ id: "age", desc: false }],
        onSortingChange: (updater) => {
          captured = updater;
        },
      });
      instance.resetSorting();
      expect(captured).toEqual([]);
    });
  });

  describe("SortingUpdater function evaluation", () => {
    it("evaluates function updater with current state", () => {
      let captured: SortingState | undefined;
      simulateHookState({
        controlledSorting: [{ id: "age", desc: false }],
        onSortingChange: (v) => {
          captured = v;
        },
      }).instance.setSorting((prev: SortingState) => prev.map((s) => ({ ...s, desc: !s.desc })));
      expect(captured).toEqual([{ id: "age", desc: true }]);
    });

    it("evaluates function updater for uncontrolled mode", () => {
      const { instance, getSorting } = simulateHookState({
        initialSorting: [{ id: "age", desc: false }],
      });
      instance.setSorting((prev: SortingState) => [...prev, { id: "status", desc: true }]);
      expect(getSorting()).toEqual([
        { id: "age", desc: false },
        { id: "status", desc: true },
      ]);
    });
  });

  describe("grouped columns with hook", () => {
    it("handles grouped column definitions", () => {
      const grouped = [
        helper.group({
          header: "Info",
          columns: [
            helper.accessor("name", { header: "Name" }),
            helper.accessor("age", { header: "Age", enableSorting: true }),
          ],
        }),
        helper.accessor("status", { header: "Status" }),
      ];

      const instance = buildGridInstance({
        columns: grouped,
        state: { sorting: [] },
        onSortingChange: () => {},
      });

      expect(instance.getAllColumns()).toHaveLength(2);
      expect(instance.getAllLeafColumns()).toHaveLength(3);
      expect(instance.getColumn("name")).toBeDefined();
      expect(instance.getColumn("age")!.getCanSort()).toBe(true);
    });
  });
});

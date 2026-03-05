import { describe, expect, it } from "bun:test";
import type {
  CssGridTrackSize,
  CssGridTrackList,
  CssGridAutoFlow,
  CssGridPlacement,
  CssGridLine,
  CssDisplay,
} from "../../types";

// ── Helper: simulate the resolveGridLine() from Grid.tsx ──────────────

function resolveGridLine(
  v: CssGridLine | undefined,
): number | string | [number | string, number | string] | undefined {
  if (v === undefined) return undefined;
  if (Array.isArray(v)) return v;
  return v;
}

// ── CssDisplay ────────────────────────────────────────────────────────

describe("CssDisplay includes grid", () => {
  it("accepts 'grid' as valid display value", () => {
    const display: CssDisplay = "grid";
    expect(display).toBe("grid");
  });

  it("accepts all display values", () => {
    const values: CssDisplay[] = ["flex", "grid", "block", "none"];
    expect(values).toHaveLength(4);
  });
});

// ── CssGridTrackSize ──────────────────────────────────────────────────

describe("CssGridTrackSize", () => {
  it("accepts number (px)", () => {
    const v: CssGridTrackSize = 200;
    expect(v).toBe(200);
  });

  it("accepts fr unit", () => {
    const v: CssGridTrackSize = "1fr";
    expect(v).toBe("1fr");
  });

  it("accepts percentage", () => {
    const v: CssGridTrackSize = "50%";
    expect(v).toBe("50%");
  });

  it("accepts auto", () => {
    const v: CssGridTrackSize = "auto";
    expect(v).toBe("auto");
  });

  it("accepts min-content", () => {
    const v: CssGridTrackSize = "min-content";
    expect(v).toBe("min-content");
  });

  it("accepts max-content", () => {
    const v: CssGridTrackSize = "max-content";
    expect(v).toBe("max-content");
  });

  it("accepts minmax()", () => {
    const v: CssGridTrackSize = "minmax(100px, 1fr)";
    expect(v).toBe("minmax(100px, 1fr)");
  });

  it("accepts fit-content()", () => {
    const v: CssGridTrackSize = "fit-content(200px)";
    expect(v).toBe("fit-content(200px)");
  });
});

// ── CssGridTrackList ──────────────────────────────────────────────────

describe("CssGridTrackList", () => {
  it("accepts a single track size", () => {
    const v: CssGridTrackList = "1fr";
    expect(v).toBe("1fr");
  });

  it("accepts a space-separated string", () => {
    const v: CssGridTrackList = "1fr 2fr 1fr";
    expect(v).toBe("1fr 2fr 1fr");
  });

  it("accepts an array of track sizes", () => {
    const v: CssGridTrackList = [200, "1fr", "1fr"];
    expect(v).toEqual([200, "1fr", "1fr"]);
    expect(v).toHaveLength(3);
  });

  it("accepts array with repeat()", () => {
    const v: CssGridTrackList = ["repeat(3, 1fr)"];
    expect(v).toHaveLength(1);
    expect(v[0]).toBe("repeat(3, 1fr)");
  });

  it("accepts mixed array with repeat and sizes", () => {
    const v: CssGridTrackList = [200, "repeat(2, 1fr)"];
    expect(v).toHaveLength(2);
  });
});

// ── CssGridAutoFlow ───────────────────────────────────────────────────

describe("CssGridAutoFlow", () => {
  it("accepts all valid values", () => {
    const values: CssGridAutoFlow[] = ["row", "column", "row dense", "column dense"];
    expect(values).toHaveLength(4);
    expect(values).toContain("row");
    expect(values).toContain("column");
    expect(values).toContain("row dense");
    expect(values).toContain("column dense");
  });
});

// ── CssGridPlacement ──────────────────────────────────────────────────

describe("CssGridPlacement", () => {
  it("accepts line number", () => {
    const v: CssGridPlacement = 1;
    expect(v).toBe(1);
  });

  it("accepts negative line number", () => {
    const v: CssGridPlacement = -1;
    expect(v).toBe(-1);
  });

  it("accepts span syntax", () => {
    const v: CssGridPlacement = "span 2";
    expect(v).toBe("span 2");
  });

  it("accepts auto", () => {
    const v: CssGridPlacement = "auto";
    expect(v).toBe("auto");
  });
});

// ── CssGridLine ───────────────────────────────────────────────────────

describe("CssGridLine", () => {
  it("accepts single placement", () => {
    const v: CssGridLine = 1;
    expect(resolveGridLine(v)).toBe(1);
  });

  it("accepts single span", () => {
    const v: CssGridLine = "span 2";
    expect(resolveGridLine(v)).toBe("span 2");
  });

  it("accepts [start, end] pair", () => {
    const v: CssGridLine = [1, 3];
    expect(resolveGridLine(v)).toEqual([1, 3]);
  });

  it("accepts [start, span] pair", () => {
    const v: CssGridLine = [1, "span 2"];
    expect(resolveGridLine(v)).toEqual([1, "span 2"]);
  });

  it("returns undefined for undefined input", () => {
    expect(resolveGridLine(undefined)).toBeUndefined();
  });
});

// ── containerLayout object construction ───────────────────────────────

describe("containerLayout object for WASM", () => {
  it("builds a grid container layout object", () => {
    const containerLayout = {
      display: "grid" as CssDisplay,
      gridTemplateColumns: "1fr 1fr 1fr",
      gridAutoFlow: "row" as CssGridAutoFlow,
      gap: 10,
    };

    expect(containerLayout.display).toBe("grid");
    expect(containerLayout.gridTemplateColumns).toBe("1fr 1fr 1fr");
    expect(containerLayout.gridAutoFlow).toBe("row");
    expect(containerLayout.gap).toBe(10);
  });

  it("builds with array-based track list", () => {
    const containerLayout = {
      display: "grid" as CssDisplay,
      gridTemplateColumns: [200, "1fr", "1fr"] as CssGridTrackList,
      gridTemplateRows: "auto" as CssGridTrackList,
    };

    expect(Array.isArray(containerLayout.gridTemplateColumns)).toBe(true);
    expect(containerLayout.gridTemplateRows).toBe("auto");
  });
});

// ── colLayout object construction ─────────────────────────────────────

describe("colLayout object for WASM (grid child)", () => {
  it("builds a column layout with grid placement", () => {
    const colLayout = {
      width: 0,
      flexGrow: 0,
      flexShrink: 0,
      align: "left" as const,
      gridRow: resolveGridLine(undefined),
      gridColumn: resolveGridLine("span 2"),
      justifySelf: "center" as const,
    };

    expect(colLayout.gridRow).toBeUndefined();
    expect(colLayout.gridColumn).toBe("span 2");
    expect(colLayout.justifySelf).toBe("center");
  });

  it("builds column layout with [start, end] grid line", () => {
    const colLayout = {
      gridRow: resolveGridLine([1, 3]),
      gridColumn: resolveGridLine([1, "span 2"]),
    };

    expect(colLayout.gridRow).toEqual([1, 3]);
    expect(colLayout.gridColumn).toEqual([1, "span 2"]);
  });
});

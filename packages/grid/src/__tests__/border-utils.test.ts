import { describe, it, expect } from "vitest";
import { parseBorderShorthand, resolveCellBorder } from "../react/border-utils";
import { DEFAULT_THEME } from "../types";

describe("parseBorderShorthand", () => {
  it("parses '1px solid #ccc'", () => {
    expect(parseBorderShorthand("1px solid #ccc")).toEqual({
      width: 1,
      style: "solid",
      color: "#ccc",
    });
  });

  it("parses '2px solid red'", () => {
    expect(parseBorderShorthand("2px solid red")).toEqual({
      width: 2,
      style: "solid",
      color: "red",
    });
  });

  it("parses '0.5px solid rgba(0,0,0,0.2)'", () => {
    expect(parseBorderShorthand("0.5px solid rgba(0,0,0,0.2)")).toEqual({
      width: 0.5,
      style: "solid",
      color: "rgba(0,0,0,0.2)",
    });
  });

  it("parses 'none'", () => {
    expect(parseBorderShorthand("none")).toEqual({
      width: 0,
      style: "none",
      color: "",
    });
  });

  it("parses '1px none #000'", () => {
    expect(parseBorderShorthand("1px none #000")).toEqual({
      width: 1,
      style: "none",
      color: "#000",
    });
  });

  it("returns null for empty string", () => {
    expect(parseBorderShorthand("")).toBeNull();
  });

  it("returns null for invalid string", () => {
    expect(parseBorderShorthand("invalid")).toBeNull();
  });

  it("trims whitespace", () => {
    expect(parseBorderShorthand("  1px solid #000  ")).toEqual({
      width: 1,
      style: "solid",
      color: "#000",
    });
  });
});

describe("resolveCellBorder", () => {
  it("returns empty config when no overrides (all defaults)", () => {
    const config = resolveCellBorder(DEFAULT_THEME, undefined, undefined);
    expect(config).toEqual({});
  });

  it("applies column-level color override", () => {
    const config = resolveCellBorder(
      DEFAULT_THEME,
      { color: "#f00" },
      undefined,
    );
    expect(config.top?.color).toBe("#f00");
    expect(config.right?.color).toBe("#f00");
    expect(config.bottom?.color).toBe("#f00");
    expect(config.left?.color).toBe("#f00");
  });

  it("applies column-level style override to none", () => {
    const config = resolveCellBorder(
      DEFAULT_THEME,
      { style: "none" },
      undefined,
    );
    expect(config.top?.style).toBe("none");
  });

  it("applies cell-level border shorthand", () => {
    const config = resolveCellBorder(DEFAULT_THEME, undefined, {
      border: "2px solid #333",
    });
    expect(config.top).toEqual({ width: 2, style: "solid", color: "#333" });
    expect(config.bottom).toEqual({ width: 2, style: "solid", color: "#333" });
  });

  it("applies cell-level per-side override", () => {
    const config = resolveCellBorder(DEFAULT_THEME, undefined, {
      borderBottom: "2px solid #333",
    });
    expect(config.bottom).toEqual({ width: 2, style: "solid", color: "#333" });
    // Other sides should use theme defaults
    expect(config.top?.width).toBe(DEFAULT_THEME.borderWidth);
  });

  it("cell-level overrides column-level", () => {
    const config = resolveCellBorder(
      DEFAULT_THEME,
      { color: "#f00" },
      { borderColor: "#0f0" },
    );
    expect(config.top?.color).toBe("#0f0");
  });

  it("cell-level borderWidth as number", () => {
    const config = resolveCellBorder(DEFAULT_THEME, undefined, {
      borderWidth: 3,
    });
    expect(config.top?.width).toBe(3);
  });

  it("cell-level borderWidth as string", () => {
    const config = resolveCellBorder(DEFAULT_THEME, undefined, {
      borderWidth: "2",
    });
    expect(config.top?.width).toBe(2);
  });

  it("cell-level border 'none' sets width 0", () => {
    const config = resolveCellBorder(DEFAULT_THEME, undefined, {
      border: "none",
    });
    expect(config.top).toEqual({ width: 0, style: "none", color: "" });
    expect(config.right).toEqual({ width: 0, style: "none", color: "" });
  });
});

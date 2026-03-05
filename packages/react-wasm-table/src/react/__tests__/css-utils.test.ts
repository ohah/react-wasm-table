import { describe, expect, it } from "bun:test";
import {
  resolveDimension,
  resolveLength,
  resolveLengthAuto,
  resolveRect,
  buildLengthRect,
  buildLengthAutoRect,
  resolveGridLine,
} from "../css-utils";

describe("resolveDimension", () => {
  it("returns undefined for undefined", () => {
    expect(resolveDimension(undefined)).toBeUndefined();
  });
  it("passes through numbers", () => {
    expect(resolveDimension(100)).toBe(100);
  });
  it("passes through 'auto'", () => {
    expect(resolveDimension("auto")).toBe("auto");
  });
  it("passes through percentage strings", () => {
    expect(resolveDimension("50%")).toBe("50%");
  });
});

describe("resolveLength", () => {
  it("returns undefined for undefined", () => {
    expect(resolveLength(undefined)).toBeUndefined();
  });
  it("passes through numbers", () => {
    expect(resolveLength(8)).toBe(8);
  });
  it("passes through percentage strings", () => {
    expect(resolveLength("25%")).toBe("25%");
  });
});

describe("resolveLengthAuto", () => {
  it("returns undefined for undefined", () => {
    expect(resolveLengthAuto(undefined)).toBeUndefined();
  });
  it("passes through numbers", () => {
    expect(resolveLengthAuto(16)).toBe(16);
  });
  it("passes through 'auto'", () => {
    expect(resolveLengthAuto("auto")).toBe("auto");
  });
  it("passes through percentage strings", () => {
    expect(resolveLengthAuto("75%")).toBe("75%");
  });
});

describe("resolveRect", () => {
  it("returns undefined when all values undefined", () => {
    expect(resolveRect(undefined)).toBeUndefined();
  });
  it("applies single shorthand to all sides", () => {
    expect(resolveRect(10)).toEqual({ top: 10, right: 10, bottom: 10, left: 10 });
  });
  it("applies 2-value shorthand [vert, horiz]", () => {
    expect(resolveRect([5, 10] as [number, number])).toEqual({
      top: 5,
      right: 10,
      bottom: 5,
      left: 10,
    });
  });
  it("applies 3-value shorthand [top, horiz, bottom]", () => {
    expect(resolveRect([1, 2, 3] as [number, number, number])).toEqual({
      top: 1,
      right: 2,
      bottom: 3,
      left: 2,
    });
  });
  it("applies 4-value shorthand [top, right, bottom, left]", () => {
    expect(resolveRect([1, 2, 3, 4] as [number, number, number, number])).toEqual({
      top: 1,
      right: 2,
      bottom: 3,
      left: 4,
    });
  });
  it("individual values override shorthand", () => {
    expect(resolveRect(10, 99)).toEqual({ top: 99, right: 10, bottom: 10, left: 10 });
  });
  it("uses custom resolver", () => {
    const resolver = (v: string | undefined) => (v ? v.toUpperCase() : undefined);
    expect(
      resolveRect("a" as any, undefined, undefined, undefined, undefined, resolver as any),
    ).toEqual({ top: "A", right: "A", bottom: "A", left: "A" });
  });
});

describe("buildLengthRect", () => {
  it("returns undefined when no values", () => {
    expect(buildLengthRect(undefined)).toBeUndefined();
  });
  it("resolves shorthand with resolveLength", () => {
    expect(buildLengthRect(8)).toEqual({ top: 8, right: 8, bottom: 8, left: 8 });
  });
  it("resolves percentage shorthand", () => {
    expect(buildLengthRect("50%")).toEqual({
      top: "50%",
      right: "50%",
      bottom: "50%",
      left: "50%",
    });
  });
  it("individual sides override shorthand", () => {
    expect(buildLengthRect(8, 16)).toEqual({ top: 16, right: 8, bottom: 8, left: 8 });
  });
});

describe("buildLengthAutoRect", () => {
  it("returns undefined when no values", () => {
    expect(buildLengthAutoRect(undefined)).toBeUndefined();
  });
  it("resolves 'auto' shorthand", () => {
    expect(buildLengthAutoRect("auto")).toEqual({
      top: "auto",
      right: "auto",
      bottom: "auto",
      left: "auto",
    });
  });
  it("resolves number shorthand", () => {
    expect(buildLengthAutoRect(4)).toEqual({ top: 4, right: 4, bottom: 4, left: 4 });
  });
});

describe("resolveGridLine", () => {
  it("returns undefined for undefined", () => {
    expect(resolveGridLine(undefined)).toBeUndefined();
  });
  it("passes through number", () => {
    expect(resolveGridLine(2)).toBe(2);
  });
  it("passes through string", () => {
    expect(resolveGridLine("span 2")).toBe("span 2");
  });
  it("passes through tuple", () => {
    expect(resolveGridLine([1, 3])).toEqual([1, 3]);
  });
});

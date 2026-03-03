import { describe, expect, it } from "bun:test";
import { evaluateTimingFunction, parseHex, lerpColor } from "../easing";

describe("evaluateTimingFunction", () => {
  it("clamps to 0 at p <= 0", () => {
    expect(evaluateTimingFunction("ease", 0)).toBe(0);
    expect(evaluateTimingFunction("ease", -0.5)).toBe(0);
  });

  it("clamps to 1 at p >= 1", () => {
    expect(evaluateTimingFunction("ease", 1)).toBe(1);
    expect(evaluateTimingFunction("ease", 1.5)).toBe(1);
  });

  it("linear is identity", () => {
    expect(evaluateTimingFunction("linear", 0.25)).toBe(0.25);
    expect(evaluateTimingFunction("linear", 0.5)).toBe(0.5);
    expect(evaluateTimingFunction("linear", 0.75)).toBe(0.75);
  });

  it("ease-in is below 0.5 at midpoint", () => {
    const mid = evaluateTimingFunction("ease-in", 0.5);
    expect(mid).toBeLessThan(0.5);
  });

  it("ease-out is above 0.5 at midpoint", () => {
    const mid = evaluateTimingFunction("ease-out", 0.5);
    expect(mid).toBeGreaterThan(0.5);
  });

  it("ease-in-out is close to 0.5 at midpoint", () => {
    const mid = evaluateTimingFunction("ease-in-out", 0.5);
    expect(Math.abs(mid - 0.5)).toBeLessThan(0.05);
  });

  it("ease returns value between 0 and 1 for midpoint", () => {
    const mid = evaluateTimingFunction("ease", 0.5);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });

  it("is monotonically non-decreasing for ease", () => {
    let prev = 0;
    for (let p = 0; p <= 1; p += 0.05) {
      const val = evaluateTimingFunction("ease", p);
      expect(val).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = val;
    }
  });
});

describe("parseHex", () => {
  it("parses 6-digit hex", () => {
    expect(parseHex("#ff0000")).toEqual([255, 0, 0]);
    expect(parseHex("#00ff00")).toEqual([0, 255, 0]);
    expect(parseHex("#0000ff")).toEqual([0, 0, 255]);
  });

  it("parses 3-digit hex", () => {
    expect(parseHex("#f00")).toEqual([255, 0, 0]);
    expect(parseHex("#0f0")).toEqual([0, 255, 0]);
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
  });

  it("handles without # prefix", () => {
    expect(parseHex("ff8800")).toEqual([255, 136, 0]);
  });
});

describe("lerpColor", () => {
  it("returns from color at t=0", () => {
    expect(lerpColor("#000000", "#ffffff", 0)).toBe("#000000");
  });

  it("returns to color at t=1", () => {
    expect(lerpColor("#000000", "#ffffff", 1)).toBe("#ffffff");
  });

  it("returns midpoint color at t=0.5", () => {
    const result = lerpColor("#000000", "#ffffff", 0.5);
    // Each channel: round(0 + 255*0.5) = 128
    expect(result).toBe("#808080");
  });

  it("interpolates arbitrary colors", () => {
    const result = lerpColor("#ff0000", "#0000ff", 0.5);
    // R: round(255*0.5)=128, G: 0, B: round(255*0.5)=128
    expect(result).toBe("#800080");
  });

  it("clamps at t < 0", () => {
    expect(lerpColor("#ff0000", "#0000ff", -1)).toBe("#ff0000");
  });

  it("clamps at t > 1", () => {
    expect(lerpColor("#ff0000", "#0000ff", 2)).toBe("#0000ff");
  });
});

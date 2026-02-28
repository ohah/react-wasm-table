import { describe, expect, it } from "bun:test";
import { buildRegions } from "../region";
import type { PinningInfo } from "../../resolve-columns";
import { LAYOUT_STRIDE } from "../../adapter/layout-reader";

/** Build a minimal layout buffer with header cells. Width is at offset 4 per stride. */
function makeLayoutBuf(widths: number[]): Float32Array {
  const buf = new Float32Array(widths.length * LAYOUT_STRIDE);
  let x = 0;
  for (let i = 0; i < widths.length; i++) {
    const base = i * LAYOUT_STRIDE;
    buf[base + 0] = 0; // row
    buf[base + 1] = i; // col
    buf[base + 2] = x; // x
    buf[base + 3] = 0; // y
    buf[base + 4] = widths[i]!; // width
    buf[base + 5] = 40; // height
    x += widths[i]!;
  }
  return buf;
}

const NO_PINNING: PinningInfo = { leftCount: 0, rightCount: 0, centerCount: 4 };

describe("buildRegions", () => {
  it("returns single center region when no pinning", () => {
    const buf = makeLayoutBuf([100, 150, 200, 100]);
    const result = buildRegions(600, 400, 50, buf, 4, NO_PINNING);

    expect(result.regions).toHaveLength(1);
    expect(result.regions[0]!.name).toBe("center");
    expect(result.regions[0]!.clipRect).toEqual([0, 0, 600, 400]);
    expect(result.regions[0]!.translateX).toBe(-50);
    expect(result.leftWidth).toBe(0);
    expect(result.rightWidth).toBe(0);
    expect(result.totalContentWidth).toBe(550);
  });

  it("creates 3 regions with left+right pinning", () => {
    // 4 cols: [100, 150, 200, 100] => left=1 (100), right=1 (100), center=2 (350)
    const pinning: PinningInfo = { leftCount: 1, rightCount: 1, centerCount: 2 };
    const buf = makeLayoutBuf([100, 150, 200, 100]);
    const result = buildRegions(500, 400, 30, buf, 4, pinning);

    expect(result.regions).toHaveLength(3);
    expect(result.leftWidth).toBe(100);
    expect(result.rightWidth).toBe(100);
    expect(result.totalContentWidth).toBe(550);

    // Left region
    const left = result.regions[0]!;
    expect(left.name).toBe("left");
    expect(left.clipRect).toEqual([0, 0, 100, 400]);
    expect(left.translateX).toBe(0);

    // Center region
    const center = result.regions[1]!;
    expect(center.name).toBe("center");
    expect(center.clipRect).toEqual([100, 0, 300, 400]);
    expect(center.translateX).toBe(-30);

    // Right region
    const right = result.regions[2]!;
    expect(right.name).toBe("right");
    expect(right.clipRect).toEqual([400, 0, 100, 400]);
    expect(right.translateX).toBe(500 - 550); // -50
  });

  it("computes leftWidth from header layout buffer", () => {
    const pinning: PinningInfo = { leftCount: 2, rightCount: 0, centerCount: 2 };
    const buf = makeLayoutBuf([80, 120, 200, 100]);
    const result = buildRegions(600, 400, 0, buf, 4, pinning);

    expect(result.leftWidth).toBe(200); // 80 + 120
    expect(result.rightWidth).toBe(0);
  });

  it("computes rightWidth from header layout buffer", () => {
    const pinning: PinningInfo = { leftCount: 0, rightCount: 2, centerCount: 2 };
    const buf = makeLayoutBuf([100, 150, 80, 120]);
    const result = buildRegions(600, 400, 0, buf, 4, pinning);

    expect(result.leftWidth).toBe(0);
    expect(result.rightWidth).toBe(200); // 80 + 120
  });

  it("clip rects cover full canvas width without overlap or gap", () => {
    const pinning: PinningInfo = { leftCount: 1, rightCount: 1, centerCount: 2 };
    const buf = makeLayoutBuf([100, 200, 150, 100]);
    const canvasW = 500;
    const result = buildRegions(canvasW, 400, 20, buf, 4, pinning);

    // Sum of clip widths should equal canvas width
    let totalClipW = 0;
    for (const r of result.regions) {
      totalClipW += r.clipRect[2];
    }
    expect(totalClipW).toBe(canvasW);

    // No overlaps: each region's x+w = next region's x
    for (let i = 0; i < result.regions.length - 1; i++) {
      const curr = result.regions[i]!;
      const next = result.regions[i + 1]!;
      expect(curr.clipRect[0] + curr.clipRect[2]).toBe(next.clipRect[0]);
    }
  });

  it("translateX values: left=0, center=-scrollLeft, right=canvasW-totalW", () => {
    const pinning: PinningInfo = { leftCount: 1, rightCount: 1, centerCount: 2 };
    const buf = makeLayoutBuf([100, 200, 150, 100]);
    const canvasW = 500;
    const scrollLeft = 40;
    const result = buildRegions(canvasW, 400, scrollLeft, buf, 4, pinning);
    const totalW = 100 + 200 + 150 + 100;

    const left = result.regions.find((r) => r.name === "left")!;
    const center = result.regions.find((r) => r.name === "center")!;
    const right = result.regions.find((r) => r.name === "right")!;

    expect(left.translateX).toBe(0);
    expect(center.translateX).toBe(-scrollLeft);
    expect(right.translateX).toBe(canvasW - totalW);
  });

  it("handles left-only pinning (2 regions)", () => {
    const pinning: PinningInfo = { leftCount: 2, rightCount: 0, centerCount: 2 };
    const buf = makeLayoutBuf([100, 100, 200, 200]);
    const result = buildRegions(500, 400, 10, buf, 4, pinning);

    expect(result.regions).toHaveLength(2);
    expect(result.regions[0]!.name).toBe("left");
    expect(result.regions[1]!.name).toBe("center");
  });

  it("handles right-only pinning (2 regions)", () => {
    const pinning: PinningInfo = { leftCount: 0, rightCount: 1, centerCount: 3 };
    const buf = makeLayoutBuf([100, 200, 150, 100]);
    const result = buildRegions(500, 400, 10, buf, 4, pinning);

    expect(result.regions).toHaveLength(2);
    expect(result.regions[0]!.name).toBe("center");
    expect(result.regions[1]!.name).toBe("right");
  });

  it("totalContentWidth sums all header widths", () => {
    const widths = [50, 75, 100, 125, 150];
    const pinning: PinningInfo = { leftCount: 1, rightCount: 1, centerCount: 3 };
    const buf = makeLayoutBuf(widths);
    const result = buildRegions(400, 300, 0, buf, 5, pinning);

    expect(result.totalContentWidth).toBe(500);
  });
});

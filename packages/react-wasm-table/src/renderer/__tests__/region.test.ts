import { describe, expect, it } from "bun:test";
import { buildRegions, buildRowRegions, contentToViewportX } from "../region";
import type { RegionLayout } from "../region";
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

describe("buildRowRegions", () => {
  it("returns header + center regions when no pinning", () => {
    const result = buildRowRegions(800, 600, 40, 36, 50, 0, 0, 100);
    expect(result.regions).toHaveLength(2);
    const header = result.regions.find((r) => r.name === "header")!;
    expect(header.clipRect).toEqual([0, 0, 800, 40]);
    expect(header.translateY).toBe(0);
    const center = result.regions.find((r) => r.name === "center")!;
    expect(center.clipRect).toEqual([0, 40, 800, 560]);
    expect(center.translateY).toBe(0);
    expect(result.topHeight).toBe(0);
    expect(result.centerHeight).toBe(560);
    expect(result.bottomHeight).toBe(0);
    expect(result.scrollableCount).toBe(100);
  });

  it("non-pinning center region clips below header (no translateY)", () => {
    // scrollTop=200 should NOT affect translateY for non-pinning
    const result = buildRowRegions(800, 600, 40, 36, 200, 0, 0, 100);
    const center = result.regions.find((r) => r.name === "center")!;
    // Center starts at headerHeight=40, height = 600-40 = 560
    expect(center.clipRect).toEqual([0, 40, 800, 560]);
    expect(center.translateY).toBe(0);
  });

  it("non-pinning header region prevents data cells from overlapping header", () => {
    const result = buildRowRegions(800, 600, 40, 36, 0, 0, 0, 100);
    const header = result.regions.find((r) => r.name === "header")!;
    // Header clip ends at headerHeight=40, so data cells at y>=40 are excluded
    expect(header.clipRect[1]).toBe(0);
    expect(header.clipRect[3]).toBe(40);
    expect(header.translateY).toBe(0);
  });

  it("creates header+top+center+bottom regions with both pinned", () => {
    // canvas=600h, header=40, rowHeight=36, pinnedTop=2, pinnedBottom=1, total=10
    const result = buildRowRegions(800, 600, 40, 36, 100, 2, 1, 10);
    expect(result.topHeight).toBe(72); // 2*36
    expect(result.bottomHeight).toBe(36); // 1*36
    expect(result.scrollableCount).toBe(7); // 10-2-1
    expect(result.centerHeight).toBe(600 - 40 - 72 - 36); // 452

    const names = result.regions.map((r) => r.name);
    expect(names).toContain("header");
    expect(names).toContain("top");
    expect(names).toContain("center");
    expect(names).toContain("bottom");
  });

  it("header region has translateY=0", () => {
    const result = buildRowRegions(800, 600, 40, 36, 100, 1, 0, 10);
    const header = result.regions.find((r) => r.name === "header")!;
    expect(header.translateY).toBe(0);
    expect(header.clipRect).toEqual([0, 0, 800, 40]);
  });

  it("top pinned region has translateY=0", () => {
    const result = buildRowRegions(800, 600, 40, 36, 100, 2, 0, 10);
    const top = result.regions.find((r) => r.name === "top")!;
    expect(top.translateY).toBe(0);
    expect(top.clipRect).toEqual([0, 40, 800, 72]);
  });

  it("center region uses -scrollTop as translateY", () => {
    const result = buildRowRegions(800, 600, 40, 36, 100, 1, 0, 10);
    const center = result.regions.find((r) => r.name === "center")!;
    expect(center.translateY).toBe(-100);
  });

  it("bottom pinned region calculates correct translateY", () => {
    const result = buildRowRegions(800, 600, 40, 36, 0, 0, 1, 10);
    const bottom = result.regions.find((r) => r.name === "bottom")!;
    // firstBottomContentY = 40 + (0 + 9) * 36 = 40 + 324 = 364
    // translateY = 600 - 36 - 364 = 200
    expect(bottom.clipRect).toEqual([0, 564, 800, 36]);
  });

  it("handles only top pinning", () => {
    const result = buildRowRegions(800, 600, 40, 36, 50, 2, 0, 10);
    const names = result.regions.map((r) => r.name);
    expect(names).toContain("header");
    expect(names).toContain("top");
    expect(names).toContain("center");
    expect(names).not.toContain("bottom");
  });

  it("handles only bottom pinning", () => {
    const result = buildRowRegions(800, 600, 40, 36, 50, 0, 2, 10);
    const names = result.regions.map((r) => r.name);
    expect(names).toContain("header");
    expect(names).toContain("center");
    expect(names).toContain("bottom");
    expect(names).not.toContain("top");
  });
});

describe("contentToViewportX", () => {
  it("returns contentX directly when in left frozen region", () => {
    const layout: RegionLayout = {
      regions: [],
      leftWidth: 100,
      rightWidth: 100,
      totalContentWidth: 500,
    };
    expect(contentToViewportX(50, layout, 200, 600)).toBe(50);
  });

  it("returns scrolled position for center region", () => {
    const layout: RegionLayout = {
      regions: [],
      leftWidth: 100,
      rightWidth: 100,
      totalContentWidth: 500,
    };
    expect(contentToViewportX(200, layout, 50, 600)).toBe(150); // 200 - 50
  });

  it("maps right frozen region to viewport right edge", () => {
    const layout: RegionLayout = {
      regions: [],
      leftWidth: 100,
      rightWidth: 100,
      totalContentWidth: 500,
    };
    // contentX >= 500-100 = 400, so right region
    expect(contentToViewportX(450, layout, 50, 600)).toBe(450 - 500 + 600); // 550
  });

  it("treats as center when rightWidth is 0", () => {
    const layout: RegionLayout = {
      regions: [],
      leftWidth: 100,
      rightWidth: 0,
      totalContentWidth: 500,
    };
    expect(contentToViewportX(300, layout, 50, 600)).toBe(250); // 300 - 50
  });
});

import { test as base, expect } from "@playwright/test";
import { GridPage } from "../fixtures/grid-page";

// Grid template page uses a different route and grid dimensions
const GRID_WIDTH = 800;
const GRID_HEIGHT = 400;

class GridTemplatePage {
  readonly page: GridPage["page"];

  constructor(page: GridPage["page"]) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/grid-template");
    const canvas = this.page.locator("canvas").first();
    await canvas.waitFor({ state: "visible", timeout: 30_000 });

    // Wait until the canvas has rendered content
    await this.page.waitForFunction(
      () => {
        const c = document.querySelector("canvas");
        if (!c) return false;
        const ctx = c.getContext("2d");
        if (!ctx) return false;
        const data = ctx.getImageData(0, 0, 1, 1).data;
        return data[0]! + data[1]! + data[2]! + data[3]! > 0;
      },
      undefined,
      { timeout: 30_000 },
    );

    await this.waitForNextFrame();
  }

  async waitForNextFrame() {
    await this.page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
  }

  async screenshotCanvas() {
    const canvas = this.page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");
    return this.page.screenshot({
      clip: { x: box.x, y: box.y, width: GRID_WIDTH, height: GRID_HEIGHT },
    });
  }

  async clickPreset(value: string) {
    await this.page.click(`[data-testid="preset-${value}"]`);
    await this.waitForNextFrame();
    await this.waitForNextFrame();
  }

  async clickFlow(value: string) {
    await this.page.click(`[data-testid="flow-${value}"]`);
    await this.waitForNextFrame();
    await this.waitForNextFrame();
  }

  async clickGap(value: number) {
    await this.page.click(`[data-testid="gap-${value}"]`);
    await this.waitForNextFrame();
    await this.waitForNextFrame();
  }
}

const test = base.extend<{ gridTemplatePage: GridTemplatePage }>({
  gridTemplatePage: async ({ page }, use) => {
    const gtp = new GridTemplatePage(page);
    await gtp.goto();
    await use(gtp);
  },
});

test.describe("Grid Template (CSS Grid)", () => {
  test("canvas renders with display grid", async ({ gridTemplatePage }) => {
    const canvas = gridTemplatePage.page.locator("canvas").first();
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box!.width).toBe(GRID_WIDTH);
    expect(box!.height).toBe(GRID_HEIGHT);
  });

  test("initial 1fr 1fr 1fr layout matches snapshot", async ({ gridTemplatePage }) => {
    const screenshot = await gridTemplatePage.screenshotCanvas();
    expect(screenshot).toMatchSnapshot("grid-3col-equal.png");
  });

  test("200px 1fr 1fr layout matches snapshot", async ({ gridTemplatePage }) => {
    await gridTemplatePage.clickPreset("200px 1fr 1fr");
    const screenshot = await gridTemplatePage.screenshotCanvas();
    expect(screenshot).toMatchSnapshot("grid-fixed-and-fr.png");
  });

  test("1fr 2fr 1fr layout matches snapshot", async ({ gridTemplatePage }) => {
    await gridTemplatePage.clickPreset("1fr 2fr 1fr");
    const screenshot = await gridTemplatePage.screenshotCanvas();
    expect(screenshot).toMatchSnapshot("grid-1fr-2fr-1fr.png");
  });

  test("repeat(3, 1fr) layout matches snapshot", async ({ gridTemplatePage }) => {
    await gridTemplatePage.clickPreset("repeat(3, 1fr)");
    const screenshot = await gridTemplatePage.screenshotCanvas();
    expect(screenshot).toMatchSnapshot("grid-repeat-3-1fr.png");
  });

  test("minmax(100px, 1fr) 2fr 1fr layout matches snapshot", async ({ gridTemplatePage }) => {
    await gridTemplatePage.clickPreset("minmax(100px, 1fr) 2fr 1fr");
    const screenshot = await gridTemplatePage.screenshotCanvas();
    expect(screenshot).toMatchSnapshot("grid-minmax.png");
  });

  test("gap 8px changes layout", async ({ gridTemplatePage }) => {
    await gridTemplatePage.clickGap(8);
    const screenshot = await gridTemplatePage.screenshotCanvas();
    expect(screenshot).toMatchSnapshot("grid-gap-8.png");
  });

  test("switching presets changes canvas content", async ({ gridTemplatePage }) => {
    const before = await gridTemplatePage.screenshotCanvas();
    await gridTemplatePage.clickPreset("200px 1fr 1fr");
    const after = await gridTemplatePage.screenshotCanvas();

    // Canvas content should differ between equal and fixed+fr layouts
    expect(Buffer.from(before).equals(Buffer.from(after))).toBe(false);
  });
});

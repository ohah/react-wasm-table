import { test, expect } from "../fixtures";
import { GRID_WIDTH, GRID_HEIGHT } from "../fixtures/coordinate-helpers";

test.describe("Initial Render", () => {
  test("canvas has correct dimensions", async ({ gridPage }) => {
    const box = await gridPage.canvasBBox();
    expect(box.width).toBe(GRID_WIDTH);
    expect(box.height).toBe(GRID_HEIGHT);
  });

  test("page shows row count", async ({ gridPage }) => {
    await expect(gridPage.page.locator("text=50,000")).toBeVisible();
  });

  test("canvas is visible and rendered", async ({ gridPage }) => {
    const canvas = gridPage.page.locator("canvas").first();
    await expect(canvas).toBeVisible();
  });

  test("header area matches snapshot", async ({ gridPage }) => {
    const screenshot = await gridPage.screenshotHeader();
    expect(screenshot).toMatchSnapshot("header.png");
  });

  test("initial full grid matches snapshot", async ({ gridPage }) => {
    const screenshot = await gridPage.screenshotCanvas();
    expect(screenshot).toMatchSnapshot("initial-render.png");
  });
});

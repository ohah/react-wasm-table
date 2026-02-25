import { test, expect } from "../fixtures";

test.describe("Cell Click", () => {
  test("clicking a cell does not crash", async ({ gridPage }) => {
    // Cell click is currently a no-op, just verify stability
    await gridPage.clickCell(0, 1);

    // Canvas should still be visible and intact
    const canvas = gridPage.page.locator("canvas").first();
    await expect(canvas).toBeVisible();
  });

  test("grid remains stable after multiple clicks", async ({ gridPage }) => {
    const before = await gridPage.screenshotCanvas();

    await gridPage.clickCell(0, 0);
    await gridPage.clickCell(2, 3);
    await gridPage.clickCell(5, 1);

    const after = await gridPage.screenshotCanvas();
    // Without selection state, grid should be identical
    expect(Buffer.from(before).equals(Buffer.from(after))).toBe(true);
  });

  test("double-click a cell does not crash", async ({ gridPage }) => {
    await gridPage.dblClickCell(1, 2);

    const canvas = gridPage.page.locator("canvas").first();
    await expect(canvas).toBeVisible();
  });
});

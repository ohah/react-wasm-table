import { test, expect } from "../fixtures";

test.describe("Sort + Scroll Combination", () => {
  test("sorted order persists after scrolling down and back up", async ({ gridPage }) => {
    // Sort by Name ascending
    await gridPage.clickHeader(1);
    const sortedTop = await gridPage.screenshotDataArea();

    // Scroll down
    await gridPage.scroll(500);
    // Scroll back up to top
    await gridPage.scroll(-10000);

    const backToTop = await gridPage.screenshotDataArea();
    expect(Buffer.from(sortedTop).equals(Buffer.from(backToTop))).toBe(true);
  });

  test("sorting a different column replaces previous sort", async ({ gridPage }) => {
    // Sort by Name
    await gridPage.clickHeader(1);
    const sortedByName = await gridPage.screenshotDataArea();

    // Sort by Department (different column)
    await gridPage.clickHeader(3);
    const sortedByDept = await gridPage.screenshotDataArea();

    // Should be different from name sort
    expect(Buffer.from(sortedByName).equals(Buffer.from(sortedByDept))).toBe(false);
  });

  test("sorting while scrolled changes visible data", async ({ gridPage }) => {
    // Scroll down first
    await gridPage.scroll(500);
    const scrolledUnsorted = await gridPage.screenshotDataArea();

    // Sort — visible rows should change because data is reordered
    await gridPage.clickHeader(1);
    const scrolledSorted = await gridPage.screenshotDataArea();

    expect(Buffer.from(scrolledUnsorted).equals(Buffer.from(scrolledSorted))).toBe(false);
  });
});

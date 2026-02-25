import { test, expect } from "../fixtures";

test.describe("Scroll", () => {
  test("wheel scroll changes data area", async ({ gridPage }) => {
    const before = await gridPage.screenshotDataArea();

    await gridPage.scroll(500);

    const after = await gridPage.screenshotDataArea();
    expect(Buffer.from(before).equals(Buffer.from(after))).toBe(false);
  });

  test("header stays fixed after scroll", async ({ gridPage }) => {
    const headerBefore = await gridPage.screenshotHeader();

    await gridPage.scroll(500);

    const headerAfter = await gridPage.screenshotHeader();
    expect(Buffer.from(headerBefore).equals(Buffer.from(headerAfter))).toBe(true);
  });

  test("scroll to top boundary stays at first row", async ({ gridPage }) => {
    // Scroll up past the top
    await gridPage.scroll(-10000);

    const atTop = await gridPage.screenshotCanvas();
    expect(atTop).toMatchSnapshot("scroll-top.png");
  });

  test("scroll to bottom boundary clamps", async ({ gridPage }) => {
    // Scroll way down with multiple large scrolls to reach absolute bottom
    for (let i = 0; i < 5; i++) {
      await gridPage.scroll(999999);
    }
    const atBottom1 = await gridPage.screenshotDataArea();

    // Scroll even further — should not change
    for (let i = 0; i < 3; i++) {
      await gridPage.scroll(999999);
    }
    const atBottom2 = await gridPage.screenshotDataArea();

    expect(Buffer.from(atBottom1).equals(Buffer.from(atBottom2))).toBe(true);
  });
});

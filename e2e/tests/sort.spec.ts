import { test, expect } from "../fixtures";

test.describe("Sort", () => {
  test("clicking header sorts ascending then descending then resets", async ({ gridPage }) => {
    const initial = await gridPage.screenshotDataArea();

    // 1st click → ascending (use Name column — ID is already in order)
    await gridPage.clickHeader(1); // Name column
    const asc = await gridPage.screenshotDataArea();
    expect(Buffer.from(initial).equals(Buffer.from(asc))).toBe(false);

    // 2nd click → descending
    await gridPage.clickHeader(1);
    const desc = await gridPage.screenshotDataArea();
    expect(Buffer.from(asc).equals(Buffer.from(desc))).toBe(false);

    // 3rd click → reset to original
    await gridPage.clickHeader(1);
    const reset = await gridPage.screenshotDataArea();
    expect(Buffer.from(initial).equals(Buffer.from(reset))).toBe(true);
  });

  test("sort ascending shows header indicator", async ({ gridPage }) => {
    await gridPage.clickHeader(0); // Sort by ID ascending
    const header = await gridPage.screenshotHeader();
    expect(header).toMatchSnapshot("sort-asc-header.png");
  });

  test("sort descending shows header indicator", async ({ gridPage }) => {
    await gridPage.clickHeader(0); // asc
    await gridPage.clickHeader(0); // desc
    const header = await gridPage.screenshotHeader();
    expect(header).toMatchSnapshot("sort-desc-header.png");
  });

  test("sorting a numeric column reorders rows", async ({ gridPage }) => {
    // Click "Salary" column (index 5)
    await gridPage.clickHeader(5);
    const sorted = await gridPage.screenshotDataArea();
    expect(sorted).toMatchSnapshot("sort-salary-asc.png");
  });
});

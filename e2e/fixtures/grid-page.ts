import type { Page } from "@playwright/test";
import { headerCenter, cellCenter, GRID_WIDTH, GRID_HEIGHT } from "./coordinate-helpers";

export class GridPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** Navigate to demo and wait until the canvas is rendered with actual pixels. */
  async goto() {
    await this.page.goto("/");
    // Wait for the canvas element to appear
    const canvas = this.page.locator("canvas").first();
    await canvas.waitFor({ state: "visible", timeout: 30_000 });

    // Poll until the canvas has non-transparent pixels (WASM initialized and rendered)
    await this.page.waitForFunction(
      () => {
        const c = document.querySelector("canvas");
        if (!c) return false;
        const ctx = c.getContext("2d");
        if (!ctx) return false;
        const data = ctx.getImageData(0, 0, 1, 1).data;
        // At least one non-zero channel means something was drawn
        return data[0]! + data[1]! + data[2]! + data[3]! > 0;
      },
      undefined,
      { timeout: 30_000 },
    );

    // One extra frame to ensure paint is fully flushed
    await this.waitForNextFrame();
  }

  /** Wait for a full render cycle (double-rAF). */
  async waitForNextFrame() {
    await this.page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
  }

  /** Get the bounding box of the canvas element on the page. */
  async canvasBBox() {
    const canvas = this.page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");
    return box;
  }

  /** Click a header cell by column index. */
  async clickHeader(col: number) {
    const box = await this.canvasBBox();
    const { x, y } = headerCenter(col);
    await this.page.mouse.click(box.x + x, box.y + y);
    await this.waitForNextFrame();
  }

  /** Click a data cell by visible row and column index. */
  async clickCell(visibleRow: number, col: number) {
    const box = await this.canvasBBox();
    const { x, y } = cellCenter(visibleRow, col);
    await this.page.mouse.click(box.x + x, box.y + y);
    await this.waitForNextFrame();
  }

  /** Double-click a data cell. */
  async dblClickCell(visibleRow: number, col: number) {
    const box = await this.canvasBBox();
    const { x, y } = cellCenter(visibleRow, col);
    await this.page.mouse.dblclick(box.x + x, box.y + y);
    await this.waitForNextFrame();
  }

  /** Scroll the grid by moving the mouse to center then wheeling. */
  async scroll(deltaY: number) {
    const box = await this.canvasBBox();
    const cx = box.x + GRID_WIDTH / 2;
    const cy = box.y + GRID_HEIGHT / 2;
    await this.page.mouse.move(cx, cy);
    await this.page.mouse.wheel(0, deltaY);
    await this.waitForNextFrame();
    // Extra frame for scroll settle
    await this.waitForNextFrame();
  }

  /** Take a clipped screenshot of the canvas only. */
  async screenshotCanvas() {
    const box = await this.canvasBBox();
    return this.page.screenshot({
      clip: {
        x: box.x,
        y: box.y,
        width: GRID_WIDTH,
        height: GRID_HEIGHT,
      },
    });
  }

  /** Take a clipped screenshot of just the header area. */
  async screenshotHeader() {
    const box = await this.canvasBBox();
    return this.page.screenshot({
      clip: {
        x: box.x,
        y: box.y,
        width: GRID_WIDTH,
        height: 40,
      },
    });
  }

  /** Take a clipped screenshot of the data area (below header). */
  async screenshotDataArea() {
    const box = await this.canvasBBox();
    return this.page.screenshot({
      clip: {
        x: box.x,
        y: box.y + 40,
        width: GRID_WIDTH,
        height: GRID_HEIGHT - 40,
      },
    });
  }
}

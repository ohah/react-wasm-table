import { test as base } from "@playwright/test";
import { GridPage } from "./grid-page";

type Fixtures = {
  gridPage: GridPage;
};

export const test = base.extend<Fixtures>({
  gridPage: async ({ page }, use) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();
    await use(gridPage);
  },
});

export { expect } from "@playwright/test";

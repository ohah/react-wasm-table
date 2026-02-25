import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
    },
  },

  use: {
    baseURL: "http://localhost:12313",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        deviceScaleFactor: 1,
        viewport: { width: 1400, height: 900 },
      },
    },
  ],

  webServer: {
    command: "bun run dev:demo",
    cwd: "..",
    port: 12313,
    reuseExistingServer: !process.env.CI,
  },
});

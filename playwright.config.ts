import { defineConfig, devices } from "@playwright/test";

/**
 * E2E test config for the India Dashboard.
 *
 * The Next.js dev server is expected to be ALREADY running on port 3456
 * (started manually, see task instructions). No `webServer` is configured.
 *
 * Run with:  npx playwright test
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL: "http://localhost:3456",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], headless: true },
    },
  ],
});
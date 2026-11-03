import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests against a running production build:
 *   npm run build && npm start -- -p 3100
 *   BASE_URL=http://localhost:3100 npm run test:e2e
 * Without BASE_URL, Playwright starts `npm start` itself on :3100.
 * Screenshots go to SCREENSHOT_DIR (default ./test-results/screens).
 */
const baseURL = process.env.BASE_URL || "http://localhost:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: "npm start -- -p 3100", url: `${baseURL}/api/health`, reuseExistingServer: true, timeout: 120_000 },
});

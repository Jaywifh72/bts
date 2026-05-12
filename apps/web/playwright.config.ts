import { defineConfig } from '@playwright/test';

/**
 * Smoke pack — verifies the top 6 routes load without errors and surface
 * the expected basic structure. Not a comprehensive UI test suite; the
 * goal is to catch ship-breaking regressions in CI.
 *
 * Run locally: `pnpm --filter @bts/web exec playwright test`
 * Run in CI: same — the workflow ensures dev server is up.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  // The dev server should already be running locally; in CI we'll spin
  // it up explicitly in the workflow rather than via webServer.
});

import { defineConfig } from "@playwright/test";

// End-to-end checks against a local dev server using the DEVELOPMENT Supabase project only
// (tests/e2e/dev-harness.ts refuses anything else). Run: npm run test:e2e
// Uses the installed Google Chrome by default; set PW_CHANNEL= (empty) to use Playwright's Chromium.
const channel = process.env.PW_CHANNEL ?? "chrome";
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "*.spec.ts",
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: { baseURL: "http://localhost:3000", ...(channel ? { channel } : {}), trace: "retain-on-failure" },
  projects: [
    { name: "phone", use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } },
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
  ],
  // Local dev must be reached as localhost (Next.js blocks dev resources for 127.0.0.1).
  webServer: { command: "npm run dev -- --port 3000", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
});

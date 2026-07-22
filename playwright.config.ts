import { defineConfig } from "@playwright/test";

/**
 * The MISSION FLOW lives in tests/mission.spec.ts and must keep passing
 * after every phase. Run locally with: npm run test:e2e
 * (First time: npx playwright install chromium)
 */
export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});

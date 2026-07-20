import { defineConfig, devices } from "@playwright/test";

const localChannel = process.env.CI ? undefined : process.env.PLAYWRIGHT_CHANNEL;
const channelOptions = localChannel ? { channel: localChannel } : {};
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "true";
const executionOptions = process.env.CI
  ? { retries: 2, workers: 1, reporter: "github" as const }
  : { retries: 0, workers: 1, reporter: "list" as const };

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  timeout: 60_000,
  forbidOnly: Boolean(process.env.CI),
  ...executionOptions,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], ...channelOptions },
    },
    {
      name: "chromium-mobile",
      use: {
        ...devices["Desktop Chrome"],
        ...channelOptions,
        viewport: { width: 360, height: 800 },
      },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:3000/api/health/live",
    reuseExistingServer,
    timeout: 120_000,
  },
});

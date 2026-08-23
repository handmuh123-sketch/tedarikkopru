import { defineConfig, devices } from "@playwright/test";
import { config as loadEnvironment } from "dotenv";

loadEnvironment({ path: process.env.PLAYWRIGHT_ENV_FILE ?? ".env", override: true, quiet: true });

const localChannel = process.env.CI ? undefined : process.env.PLAYWRIGHT_CHANNEL;
const channelOptions = localChannel ? { channel: localChannel } : {};
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "true";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? process.env.APP_URL ?? "http://localhost:3000";
const webServerEnvironment: Record<string, string> = {};
for (const [key, value] of Object.entries(process.env)) {
  if (typeof value === "string") webServerEnvironment[key] = value;
}
const executionOptions = process.env.CI
  ? { retries: 2, workers: 1, reporter: "github" as const }
  : { retries: 0, workers: 1, reporter: "list" as const };

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  forbidOnly: Boolean(process.env.CI),
  ...executionOptions,
  use: {
    baseURL,
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
    env: webServerEnvironment,
    url: `${baseURL}/api/health/live`,
    reuseExistingServer,
    timeout: 120_000,
  },
});

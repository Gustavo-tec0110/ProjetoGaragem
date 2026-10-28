import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const port = Number(process.env.PORT ?? 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
// Only the automatically managed local test server enables previews by default.
// External servers must opt in explicitly; npm start/build never enable them.
if (!process.env.PLAYWRIGHT_BASE_URL) {
  process.env.PROFILE_IMAGE_EDITOR_TEST_HARNESS ??= "1";
  process.env.MODIFICATION_PHOTOS_TEST_HARNESS ??= "1";
  process.env.CATALOG_OFFERS_DEMO ??= "1";
  process.env.SKELETON_VISUAL_TEST ??= "1";
}
const serverCommand = process.env.CI
  ? `npm run start -- --hostname 127.0.0.1 --port ${port}`
  : `npm run dev -- --hostname 127.0.0.1 --port ${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  workers: process.env.CI ? 1 : undefined,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: serverCommand,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      testMatch: /(public|integration-local|catalog-expansion|project-modifications|modification-photos|profile-image-editor|image-security|authenticated-city)\.spec\.ts/,
      use: { ...devices["Pixel 5"] },
    },
  ],
});

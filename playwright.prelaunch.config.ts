import { defineConfig, devices } from "@playwright/test";

// No .env loading and no automatically reused server: explicit disposable loopback.
export default defineConfig({
  testDir: "./tests/e2e", workers: 1, timeout: 90_000, expect: { timeout: 15_000 },
  reporter: [["list"]], use: { baseURL: "http://127.0.0.1:3152", trace: "off" },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", testMatch: /(public|integration-local|profile-image-editor|prelaunch-crop)\.spec\.ts/,
      use: { ...devices["Pixel 5"] } },
  ],
});

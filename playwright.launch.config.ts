import { defineConfig, devices } from "@playwright/test";

// Read-only smoke is scripts/smoke-launch-hosted.mjs. This config is deliberately
// separate: the existing authenticated suite creates only its own test projects.
if (process.env.GARAGEM_HOSTED_MUTATIONS_AUTHORIZED !== "1") {
  throw new Error("Requires explicit owner authorization for hosted test-account writes.");
}
if (!process.env.E2E_USER_EMAIL || !process.env.E2E_USER_PASSWORD ||
    !process.env.E2E_SECOND_USER_EMAIL || !process.env.E2E_SECOND_USER_PASSWORD ||
    process.env.E2E_USER_EMAIL === process.env.E2E_SECOND_USER_EMAIL) {
  throw new Error("Provide two distinct, explicitly authorized test accounts.");
}
export default defineConfig({
  testDir: "./tests/e2e", testMatch: "authenticated.spec.ts", workers: 1,
  timeout: 90_000, expect: { timeout: 20_000 }, reporter: [["list"]],
  use: { baseURL: "https://projetogaragem.com.br", trace: "off", screenshot: "off", video: "off" },
  projects: [{ name: "desktop-chromium", use: devices["Desktop Chrome"] }],
});

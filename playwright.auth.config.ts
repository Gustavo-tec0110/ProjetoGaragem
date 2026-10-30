import { defineConfig } from "@playwright/test";

// No .env loading: this suite is exclusively loopback with fabricated credentials.
const root = process.env.AUTH_ISOLATED_ROOT;
if (!root?.startsWith("/tmp/garagem-auth-")) throw new Error("Run node scripts/test-auth-local.mjs");
export default defineConfig({
  testDir: "./tests/e2e", testMatch: "auth-terms.spec.ts", workers: 1, timeout: 90_000,
  expect: { timeout: 30_000 }, reporter: [["list"]], use: { baseURL: "http://127.0.0.1:3198", trace: "off" },
  webServer: [
    { command: "node tests/fixtures/auth-local-server.mjs", url: "http://127.0.0.1:3199/__fixture/calls", reuseExistingServer: false },
    { command: "npm run dev -- --webpack --hostname 127.0.0.1 --port 3198", cwd: root,
      url: "http://127.0.0.1:3198/login", reuseExistingServer: false, timeout: 120_000,
      env: { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:3199", NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-fixture-key",
        NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3198", NEXT_PUBLIC_TURNSTILE_MODE: "test", NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA" } },
  ],
});

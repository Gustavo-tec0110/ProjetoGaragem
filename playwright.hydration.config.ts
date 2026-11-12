import { defineConfig, devices } from '@playwright/test';

const root = process.env.HYDRATION_ISOLATED_ROOT;
if (!root?.startsWith('/tmp/garagem-auth-')) throw new Error('Run node scripts/test-hydration-local.mjs');
export default defineConfig({
  testDir: './tests/e2e', testMatch: 'hydration-early.spec.ts', workers: 1, timeout: 90_000,
  expect: { timeout: 15_000 }, reporter: [['list']],
  outputDir: 'results/etapa5-20261104/hydration-output',
  use: { baseURL: 'http://127.0.0.1:3155', trace: 'off' },
  projects: [
    { name: 'desktop-chromium', use: devices['Desktop Chrome'] },
    { name: 'mobile-chromium', use: devices['Pixel 5'] },
  ],
  webServer: [
    { command: 'node tests/fixtures/auth-local-server.mjs', url: 'http://127.0.0.1:3199/__fixture/calls', reuseExistingServer: false },
    { command: 'npm run start -- --hostname 127.0.0.1 --port 3155', cwd: root,
      url: 'http://127.0.0.1:3155/login', reuseExistingServer: false, timeout: 60_000 },
  ],
});

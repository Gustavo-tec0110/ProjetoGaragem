/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const fs = require('node:fs');
const { chromium } = require('@playwright/test');
const origin = 'http://127.0.0.1:3101';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const device of [
      { name: 'mobile', viewport: { width: 412, height: 823 }, isMobile: true, hasTouch: true },
      { name: 'desktop', viewport: { width: 1366, height: 768 }, isMobile: false, hasTouch: false },
    ]) {
      const context = await browser.newContext(device);
      const page = await context.newPage();
      await page.route(/\/explorar\?_rsc=/, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        await route.continue();
      });
      await page.goto(origin + '/', { waitUntil: 'domcontentloaded' });
      const link = device.name === 'mobile'
        ? page.getByRole('navigation', { name: 'Navegação principal mobile' }).getByRole('link', { name: 'Explorar' })
        : page.locator('header nav').getByRole('link', { name: 'Explorar' });
      await link.click();
      const skeleton = page.locator('main[aria-busy="true"]');
      const observed = await skeleton.waitFor({ state: 'visible', timeout: 1800 }).then(() => true).catch(() => false);
      await page.waitForURL(origin + '/explorar');
      await page.getByRole('heading', { name: 'Explorar projetos' }).waitFor();
      results.push({ device: device.name, delayedRscMs: 2500, skeletonObserved: observed, destination: new URL(page.url()).pathname });
      await context.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync('docs/evidencias-otimizacao-performance-etapa-3/skeleton-navigation.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
})().catch((error) => { console.error(error); process.exitCode = 1; });

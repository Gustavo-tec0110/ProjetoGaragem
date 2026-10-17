/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const origin = 'http://127.0.0.1:3101';
const results = [];
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const device of [
      { name: 'mobile', viewport: { width: 412, height: 823 }, isMobile: true, hasTouch: true },
      { name: 'desktop', viewport: { width: 1366, height: 768 }, isMobile: false, hasTouch: false },
    ]) {
      const context = await browser.newContext(device);
      const page = await context.newPage();
      const scriptsBeforeClick = [];
      const errors = [];
      page.on('request', (request) => {
        if (request.resourceType() === 'script' && page.url().startsWith(origin + '/explorar')) scriptsBeforeClick.push(request.url());
      });
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(origin + '/explorar', { waitUntil: 'networkidle' });
      assert.equal(scriptsBeforeClick.some((url) => url.includes('19hvplwf37y2e')), false);
      const link = page.getByRole('link', { name: 'Adicionar meu projeto', exact: true });
      assert.equal(await link.getAttribute('href'), '/criar-projeto');
      await link.click();
      await page.waitForURL(origin + '/criar-projeto');
      await page.getByRole('heading', { name: /Adicionar projeto sem Supabase|Criar projeto|Entre para criar seu projeto/ }).waitFor();
      assert.deepEqual(errors, []);
      results.push({ device: device.name, beforeClickScripts: scriptsBeforeClick.length, supabaseChunkBeforeClick: false, destination: new URL(page.url()).pathname, errors });
      await context.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync('docs/evidencias-otimizacao-performance-etapa-3/explore-navigation.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
})().catch((error) => { console.error(error); process.exitCode = 1; });

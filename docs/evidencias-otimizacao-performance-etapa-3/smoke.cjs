/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');

const label = process.argv[2];
if (!label) throw new Error('Uso: node smoke.cjs <label>');
const origin = process.env.BENCH_ORIGIN || 'http://127.0.0.1:3101';
const folder = path.join(__dirname, label);
fs.mkdirSync(folder, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const device of [
    { name: 'mobile', width: 412, height: 823, isMobile: true, hasTouch: true },
    { name: 'desktop', width: 1366, height: 768, isMobile: false, hasTouch: false },
  ]) {
    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: 1,
      isMobile: device.isMobile,
      hasTouch: device.hasTouch,
    });
    for (const [name, route] of Object.entries({
      inicial: '/', explorar: '/explorar', garagem: '/garagem',
      login: '/login', cadastro: '/register',
      projeto_inexistente: '/projeto/projeto-de-catalogo-removido',
      perfil_inexistente: '/perfil/perfil-inexistente',
    })) {
      const page = await context.newPage();
      const errors = [];
      const badResponses = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('response', (response) => { if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`); });
      const response = await page.goto(origin + route, { waitUntil: 'networkidle' });
      const layout = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        imageFailures: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc),
        footerTop: document.querySelector('footer')?.getBoundingClientRect().top ?? null,
      }));
      if (['inicial', 'explorar', 'garagem', 'login'].includes(name)) {
        await page.screenshot({ path: path.join(folder, `${device.name}-${name}.png`) });
      }
      results.push({ device: device.name, route, status: response?.status(), title: await page.title(), ...layout, errors, badResponses });
      await page.close();
    }
    await context.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(folder, 'smoke.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})().catch((error) => { console.error(error); process.exitCode = 1; });

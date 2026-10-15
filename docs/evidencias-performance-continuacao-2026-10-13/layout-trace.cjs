/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const label = process.argv[2];
const route = process.argv[3] || '/garagem';
if (!label) throw new Error('Informe um rótulo');
const origin = process.env.BENCH_ORIGIN || 'http://127.0.0.1:3101';
async function run() {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 412, height: 823 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1638.4 * 1024 / 8, uploadThroughput: 1638.4 * 1024 / 8 });
    await page.addInitScript(() => {
      window.__pgLayout = { shifts: [], samples: [] };
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__pgLayout.shifts.push({
            startTime: entry.startTime,
            value: entry.value,
            hadRecentInput: entry.hadRecentInput,
            sources: entry.sources?.map((source) => ({ node: source.node?.tagName, className: String(source.node?.className ?? '').slice(0, 100), previousRect: source.previousRect?.toJSON(), currentRect: source.currentRect?.toJSON() })),
          });
        }
      }).observe({ type: 'layout-shift', buffered: true });
      setInterval(() => {
        const wrapper = document.querySelector('.pg-route-enter');
        const footer = document.querySelector('footer');
        window.__pgLayout.samples.push({
          time: performance.now(),
          wrapperBottom: wrapper?.getBoundingClientRect().bottom,
          footerTop: footer?.getBoundingClientRect().top,
          title: document.querySelector('main h1')?.textContent?.trim(),
        });
      }, 100);
    });
    await page.goto(origin + route, { waitUntil: 'load' });
    await page.waitForTimeout(3500);
    const data = await page.evaluate(() => ({ ...window.__pgLayout, route: location.pathname, title: document.title, content: document.querySelector('main')?.textContent?.trim().slice(0, 150) }));
    fs.writeFileSync(path.join(__dirname, `${label}-layout-trace.json`), JSON.stringify(data, null, 2));
    await context.close();
  } finally {
    await browser.close();
  }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });

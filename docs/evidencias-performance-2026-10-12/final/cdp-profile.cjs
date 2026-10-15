const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const out = __dirname;
const base = 'https://projetogaragem.com.br';
const consentSaved = process.env.CONSENT_SAVED === '1';
const prefix = consentSaved ? 'consent-saved-' : '';
const routes = consentSaved ? [
  ['cadastro', '/register'],
  ['login', '/login'],
] : [
  ['cadastro', '/register'],
  ['login', '/login'],
  ['inicio', '/'],
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const summary = {
    collectedAt: new Date().toISOString(),
    browserVersion: browser.version(),
    method: 'CDP Profiler.start/stop, new isolated browser context per route',
    consentSaved,
    viewport: { width: 412, height: 823 },
    deviceScaleFactor: 1,
    cpuThrottlingRate: 4,
    network: { latencyMs: 150, downloadKbps: 1638.4, uploadKbps: 1638.4 },
    wait: 'DOMContentLoaded, then up to 12 s for load, then 3 s to capture post-load work',
    routes: [],
  };

  try {
    for (const [name, route] of routes) {
      const context = await browser.newContext({
        viewport: summary.viewport,
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
        serviceWorkers: 'block',
      });
      await context.addInitScript((saved) => {
        if (saved) {
          localStorage.setItem('projeto-garagem:cookie-consent', JSON.stringify({
            version: 1, necessary: true, analytics: false, marketing: false,
            decidedAt: '2026-10-12T00:00:00.000Z',
          }));
        }
        window.__perfEvidence = { longTasks: [], lcp: [] };
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            window.__perfEvidence.longTasks.push({ startTime: e.startTime, duration: e.duration });
          }
        }).observe({ type: 'longtask', buffered: true });
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            window.__perfEvidence.lcp.push({
              startTime: e.startTime,
              renderTime: e.renderTime,
              loadTime: e.loadTime,
              element: e.element?.outerHTML?.slice(0, 400) ?? null,
            });
          }
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      }, consentSaved);
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 150,
        downloadThroughput: 1638.4 * 1024 / 8,
        uploadThroughput: 1638.4 * 1024 / 8,
      });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await cdp.send('Profiler.enable');
      await cdp.send('Profiler.setSamplingInterval', { interval: 1000 });
      await cdp.send('Profiler.start');
      const started = Date.now();
      const response = await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('load', { timeout: 12000 }).catch(() => {});
      await page.waitForTimeout(3000);
      const state = await page.evaluate(() => ({
        timing: performance.getEntriesByType('navigation')[0]?.toJSON(),
        evidence: window.__perfEvidence,
        consentVisible: Boolean(document.querySelector('.pg-cookie-consent')),
        scripts: performance.getEntriesByType('resource')
          .filter((e) => e.name.includes('/_next/static/chunks/') && e.name.endsWith('.js'))
          .map((e) => ({ name: e.name, transferSize: e.transferSize, duration: e.duration })),
      }));
      const { profile } = await cdp.send('Profiler.stop');
      fs.writeFileSync(path.join(out, `${prefix}${name}-mobile-cpu-profile.json`), JSON.stringify(profile));
      summary.routes.push({
        name,
        url: base + route,
        status: response?.status() ?? null,
        elapsedWallMs: Date.now() - started,
        ...state,
        cpuProfileFile: `${prefix}${name}-mobile-cpu-profile.json`,
      });
      await context.close();
    }
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(out, `${prefix}cdp-summary.json`), JSON.stringify(summary, null, 2));
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });

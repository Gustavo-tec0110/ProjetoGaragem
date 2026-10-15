const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname);
const shotDir = path.join(root, 'screenshots');
const pages = [
  ['inicio', 'https://projetogaragem.com.br/'],
  ['login', 'https://projetogaragem.com.br/login'],
  ['cadastro', 'https://projetogaragem.com.br/register'],
  ['explorar', 'https://projetogaragem.com.br/explorar'],
];
const viewports = [
  { name: 'android-compacto-360x800', width: 360, height: 800, isMobile: true },
  { name: 'iphone-moderno-390x844', width: 390, height: 844, isMobile: true },
  { name: 'tablet-768x1024', width: 768, height: 1024, isMobile: true },
  { name: 'notebook-1366x768', width: 1366, height: 768, isMobile: false },
  { name: 'desktop-fullhd-1920x1080', width: 1920, height: 1080, isMobile: false },
];
(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const [pageName, url] of pages) for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.isMobile, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [], failedRequests = [], badResponses = [];
    const startedAt = new Date().toISOString();
    let domContentLoadedMs = null, loadMs = null;
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push({ type: m.type(), text: m.text() }); });
    page.on('requestfailed', r => failedRequests.push({ url: r.url(), method: r.method(), failure: r.failure()?.errorText || null }));
    page.on('response', r => { if (r.status() >= 400) badResponses.push({ url: r.url(), status: r.status(), statusText: r.statusText() }); });
    const start = Date.now();
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      domContentLoadedMs = Date.now() - start;
      const initialPath = path.join(shotDir, `${pageName}-${vp.name}-domcontentloaded.png`);
      await page.screenshot({ path: initialPath, fullPage: false });
      try { await page.waitForLoadState('load', { timeout: 20000 }); loadMs = Date.now() - start; } catch {}
      let networkIdle = true;
      try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch { networkIdle = false; await page.waitForTimeout(2000); }
      const finalPath = path.join(shotDir, `${pageName}-${vp.name}-settled.png`);
      await page.screenshot({ path: finalPath, fullPage: true });
      const observed = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        const resources = performance.getEntriesByType('resource');
        const root = document.documentElement;
        const body = document.body;
        const skeletons = [...document.querySelectorAll('[class*=skeleton i], [aria-busy=true]')].filter(e => {const r=e.getBoundingClientRect(); return r.width>0&&r.height>0}).length;
        return {
          title: document.title,
          url: location.href,
          viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
          document: { clientWidth: root.clientWidth, scrollWidth: root.scrollWidth, scrollHeight: Math.max(root.scrollHeight,body?.scrollHeight||0), horizontalOverflow: root.scrollWidth > root.clientWidth },
          visibleSkeletonOrBusyCount: skeletons,
          navigationTimingMs: nav ? { domContentLoaded: nav.domContentLoadedEventEnd, loadEvent: nav.loadEventEnd, responseEnd: nav.responseEnd, domInteractive: nav.domInteractive } : null,
          resources: { count: resources.length, transferSizeBytes: resources.reduce((n,r)=>n+(r.transferSize||0),0), encodedBodyBytes: resources.reduce((n,r)=>n+(r.encodedBodySize||0),0), decodedBodyBytes: resources.reduce((n,r)=>n+(r.decodedBodySize||0),0), entries: resources.map(r=>({name:r.name,initiatorType:r.initiatorType,durationMs:r.duration,transferSizeBytes:r.transferSize||0,encodedBodyBytes:r.encodedBodySize||0,decodedBodyBytes:r.decodedBodySize||0})) },
          pageTextStart: (body?.innerText||'').slice(0,1500),
        };
      });
      results.push({ page: pageName, requestedUrl: url, viewportName: vp.name, viewportPx: `${vp.width}x${vp.height}`, emulatedMobileContext: vp.isMobile, startedAt, responseStatus: response?.status() ?? null, domContentLoadedMs, loadEventMs: loadMs, networkIdleReached: networkIdle, screenshotDomContentLoaded: path.relative(root, initialPath), screenshotSettled: path.relative(root, finalPath), ...observed, consoleErrorsAndWarnings: errors, failedRequests, httpResponsesAtLeast400: badResponses });
    } catch (e) {
      results.push({ page: pageName, requestedUrl: url, viewportName: vp.name, viewportPx: `${vp.width}x${vp.height}`, emulatedMobileContext: vp.isMobile, startedAt, navigationError: String(e), consoleErrorsAndWarnings: errors, failedRequests, httpResponsesAtLeast400: badResponses });
    }
    await context.close();
    console.log(`${pageName} ${vp.name} done`);
  }
  await browser.close();
  fs.writeFileSync(path.join(root, 'summary.json'), JSON.stringify({ collectedAt: new Date().toISOString(), browser: 'Playwright Chromium bundled browser', browserVersion: require('playwright').chromium.executablePath(), cpuThrottling: 'not configured', networkThrottling: 'not configured', results }, null, 2));
})();

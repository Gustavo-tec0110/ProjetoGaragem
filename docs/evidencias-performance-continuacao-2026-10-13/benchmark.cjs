/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const label = process.argv[2];
const device = process.argv[3];
const runs = Number(process.argv[4]);
const selected = process.argv.slice(5);
const routes = {
  inicial: '/',
  explorar: '/explorar',
  garagem: '/garagem',
  login: '/login',
  cadastro: '/register',
};
const cli = '/home/gustavo/.npm/_npx/0f94ee7615faf582/node_modules/lighthouse/cli/index.js';
const chrome = '/home/gustavo/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const origin = process.env.BENCH_ORIGIN || 'http://127.0.0.1:3101';
if (!label || !['mobile', 'desktop'].includes(device) || !Number.isInteger(runs) || runs < 1 || selected.some((route) => !routes[route])) {
  throw new Error('Uso: node benchmark.cjs <label> <mobile|desktop> <runs> [inicial explorar garagem login cadastro]');
}
const folder = path.join(__dirname, label, device);
fs.mkdirSync(folder, { recursive: true });
fs.copyFileSync('.next/BUILD_ID', path.join(folder, 'BUILD_ID'));
fs.copyFileSync('.next/build-manifest.json', path.join(folder, 'build-manifest.json'));
const settings = {
  origin,
  device,
  runs,
  routes: selected.length ? selected : Object.keys(routes),
  lighthouse: require(path.join(path.dirname(cli), '../package.json')).version,
  chrome,
  throttlingMethod: 'simulate',
  cpuSlowdownMultiplier: device === 'mobile' ? 4 : 1,
  rttMs: device === 'mobile' ? 150 : 40,
  throughputKbps: device === 'mobile' ? 1638.4 : 10240,
  viewport: device === 'mobile' ? '412x823@1' : '1366x768@1',
  storageReset: 'Lighthouse default',
};
fs.writeFileSync(path.join(folder, 'config.json'), JSON.stringify(settings, null, 2));
const summary = [];
for (const route of settings.routes) {
  for (let run = 1; run <= runs; run++) {
    const file = path.join(folder, `${route}-${run}.json`);
    const args = [cli, origin + routes[route], '--output=json', `--output-path=${file}`,
      '--only-categories=performance', `--form-factor=${device}`,
      `--screenEmulation.mobile=${device === 'mobile'}`,
      `--screenEmulation.width=${device === 'mobile' ? 412 : 1366}`,
      `--screenEmulation.height=${device === 'mobile' ? 823 : 768}`,
      '--screenEmulation.deviceScaleFactor=1',
      '--throttling-method=simulate',
      `--throttling.cpuSlowdownMultiplier=${settings.cpuSlowdownMultiplier}`,
      `--throttling.rttMs=${settings.rttMs}`,
      `--throttling.throughputKbps=${settings.throughputKbps}`,
      '--quiet', '--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage'];
    console.log(`${label} ${device} ${route} ${run}/${runs}`);
    execFileSync(process.execPath, args, { stdio: 'inherit', env: { ...process.env, CHROME_PATH: chrome } });
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const requests = data.audits['network-requests']?.details?.items ?? [];
    const js = requests.filter((item) => item.resourceType === 'Script');
    summary.push({
      route,
      run,
      score: Math.round(data.categories.performance.score * 100),
      lcpMs: Math.round(data.audits['largest-contentful-paint']?.numericValue ?? 0),
      cls: data.audits['cumulative-layout-shift']?.numericValue ?? null,
      tbtMs: Math.round(data.audits['total-blocking-time']?.numericValue ?? 0),
      fcpMs: Math.round(data.audits['first-contentful-paint']?.numericValue ?? 0),
      speedIndexMs: Math.round(data.audits['speed-index']?.numericValue ?? 0),
      requests: requests.length,
      jsTransferBytes: js.reduce((total, item) => total + (item.transferSize ?? 0), 0),
    });
  }
}
fs.writeFileSync(path.join(folder, 'summary.json'), JSON.stringify({ settings, summary }, null, 2));

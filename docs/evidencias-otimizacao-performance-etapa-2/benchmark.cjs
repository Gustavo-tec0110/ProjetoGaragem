/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const label = process.argv[2];
const routes = process.argv.slice(3).length ? process.argv.slice(3) : ['inicio', 'login', 'cadastro'];
const paths = { inicio: '/', login: '/login', cadastro: '/register' };
const cli = process.env.LIGHTHOUSE_CLI;
const chrome = process.env.CHROME_PATH;
const origin = process.env.BENCH_ORIGIN || 'http://127.0.0.1:3101';
if (!label || !cli || !chrome || routes.some((route) => !paths[route])) {
  throw new Error('Uso: LIGHTHOUSE_CLI=... CHROME_PATH=... node benchmark.cjs <label> [inicio login cadastro]');
}
const dir = path.join(__dirname, label);
fs.mkdirSync(dir, { recursive: true });
const config = {
  label, origin, routes, runsPerRoute: 3,
  lighthouseCli: cli, chrome,
  settings: {
    formFactor: 'mobile', screen: '412x823@1', throttlingMethod: 'simulate',
    cpuSlowdownMultiplier: 4, rttMs: 150, throughputKbps: 1638.4,
    storageReset: 'Lighthouse default',
  },
};
fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(config, null, 2));
for (const route of routes) {
  for (let run = 1; run <= 3; run++) {
    const file = path.join(dir, `${route}-${run}.json`);
    const args = [cli, origin + paths[route], '--output=json', `--output-path=${file}`,
      '--only-categories=performance', '--form-factor=mobile',
      '--screenEmulation.mobile=true', '--screenEmulation.width=412',
      '--screenEmulation.height=823', '--screenEmulation.deviceScaleFactor=1',
      '--throttling-method=simulate', '--throttling.cpuSlowdownMultiplier=4',
      '--throttling.rttMs=150', '--throttling.throughputKbps=1638.4',
      '--quiet', '--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage'];
    console.log(`${label} ${route} ${run}/3`);
    execFileSync(process.execPath, args, { stdio: 'inherit', env: { ...process.env, CHROME_PATH: chrome } });
  }
}

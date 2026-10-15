/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const label = process.argv[2];
const origin = process.env.BENCH_ORIGIN || 'http://127.0.0.1:3101';
if (!label) throw new Error('Informe o rótulo do build');

const scenarios = [
  { name: 'home-login', from: '/', link: 'Entrar', target: '**/login', heading: 'Entre no Projeto Garagem' },
  { name: 'login-forgot', from: '/login', link: 'Esqueci minha senha', target: '**/forgot-password', heading: /Redefin|senha/i },
  { name: 'login-create', from: '/login', link: 'Criar', target: '**/criar-projeto', heading: /Entre para criar seu projeto|Criar projeto|Adicionar projeto/i, mobileNav: true },
  { name: 'register-create', from: '/register', link: 'Criar', target: '**/criar-projeto', heading: /Entre para criar seu projeto|Criar projeto|Adicionar projeto/i, mobileNav: true },
  { name: 'home-create', from: '/', link: 'Criar projeto', target: '**/criar-projeto', heading: /Entre para criar seu projeto|Criar projeto|Adicionar projeto/i },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const scenario of scenarios.filter((item) => process.argv.length <= 3 || process.argv.slice(3).includes(item.name))) {
      for (let run = 1; run <= 3; run++) {
        const context = await browser.newContext({ viewport: { width: 412, height: 823 }, isMobile: true, hasTouch: true });
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        await cdp.send('Network.enable');
        await cdp.send('Network.emulateNetworkConditions', {
          offline: false, latency: 150,
          downloadThroughput: 1638.4 * 1024 / 8,
          uploadThroughput: 1638.4 * 1024 / 8,
        });
        const errors = [];
        const beforeRequests = [];
        let clicking = false;
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('request', (request) => {
          if (!clicking && (request.url().includes('/forgot-password?_rsc=') || request.url().includes('/criar-projeto?_rsc=') || request.url().includes('19hvplwf37y2e.js'))) beforeRequests.push(request.url());
        });
        await page.goto(origin + scenario.from, { waitUntil: 'load' });
        await page.waitForTimeout(2500);
        const link = scenario.mobileNav
          ? page.getByRole('navigation', { name: 'Navegação principal mobile' }).getByRole('link', { name: scenario.link })
          : page.getByRole('link', { name: scenario.link, exact: true }).first();
        clicking = true;
        const started = Date.now();
        await link.click();
        await page.waitForURL(scenario.target);
        await page.getByRole('heading', { name: scenario.heading }).first().waitFor();
        const clickToHeadingMs = Date.now() - started;
        results.push({ scenario: scenario.name, run, clickToHeadingMs, destination: page.url(), beforeRequests, errors });
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(__dirname, `${label}-navigation.json`), JSON.stringify({ label, origin, settings: '412x823 Mobile, CDP CPU x4, RTT 150 ms, 1638.4 Kbps down/up, fresh context, 2.5 s before click', results }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const origin = process.env.BENCH_ORIGIN || 'http://127.0.0.1:3101';
const consentKey = 'projeto-garagem:cookie-consent';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const checks = [];
  try {
    for (const [name, viewport, isMobile] of [
      ['mobile', { width: 390, height: 844 }, true],
      ['desktop', { width: 1366, height: 768 }, false],
    ]) {
      const context = await browser.newContext({ viewport, isMobile, hasTouch: isMobile });
      const page = await context.newPage();
      for (const route of ['/', '/login', '/register']) {
        await page.goto(origin + route);
        await page.getByRole('region', { name: 'Preferências de cookies' }).waitFor();
        const widths = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
        assert.ok(widths.document <= widths.viewport, `${name} ${route}: overflow horizontal ${JSON.stringify(widths)}`);
        checks.push({ name, route, widths, bannerVisible: true });
      }
      await context.close();
    }

    for (const button of ['Aceitar', 'Recusar opcionais']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      await page.goto(origin + '/login');
      await page.getByRole('region', { name: 'Preferências de cookies' }).waitFor();
      await page.getByRole('button', { name: button, exact: true }).click();
      const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), consentKey);
      assert.equal(stored?.necessary, true);
      assert.equal(stored?.analytics, false);
      assert.equal(stored?.marketing, false);
      await page.reload();
      await page.getByRole('region', { name: 'Preferências de cookies' }).waitFor({ state: 'hidden' });
      await page.goto(origin + '/');
      const footerButton = page.getByRole('button', { name: 'Gerenciar cookies' });
      await footerButton.scrollIntoViewIfNeeded();
      const footerHit = await footerButton.evaluate((button) => {
        const rect = button.getBoundingClientRect();
        const target = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return { targetTag: target?.tagName, targetClass: target?.className, buttonReceivesClick: target === button || button.contains(target) };
      });
      checks.push({ choice: button, stored, savedVisitBannerHidden: true, footerHit });
      await context.close();
    }

    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await page.goto(origin + '/login');
    await page.getByRole('region', { name: 'Preferências de cookies' }).waitFor();
    await page.getByRole('button', { name: 'Preferências', exact: true }).click();
    await page.getByRole('dialog', { name: 'Preferências de cookies' }).waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    checks.push({ firstVisitPreferencesDialogOpens: true, escapeClosesDialog: true });
    await context.close();
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(__dirname, 'final-consent-responsive.json'), JSON.stringify({ origin, passed: true, checks }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

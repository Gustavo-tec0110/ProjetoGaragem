/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:3101';
const key = 'projeto-garagem:cookie-consent';
const output = __dirname;
const results = { origin, checks: [], screenshots: [], runtimeErrors: [], analyticsRequests: [] };

async function consent(page) {
  return page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey) || 'null'), key);
}

async function pageWithoutOverflow(page, route) {
  await page.goto(origin + route);
  const widths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  assert.ok(widths.document <= widths.viewport, `overflow em ${route}: ${JSON.stringify(widths)}`);
  return widths;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [device, viewport, isMobile] of [
      ['mobile', { width: 390, height: 844 }, true],
      ['desktop', { width: 1366, height: 768 }, false],
    ]) {
      const context = await browser.newContext({ viewport, isMobile, hasTouch: isMobile });
      const page = await context.newPage();
      page.on('pageerror', (error) => results.runtimeErrors.push(error.message));
      page.on('request', (request) => {
        if (/google-analytics\.com|googletagmanager\.com|\/g\/collect/.test(request.url())) results.analyticsRequests.push(request.url());
      });
      for (const route of ['/', '/privacy', '/terms']) {
        const widths = await pageWithoutOverflow(page, route);
        await page.getByRole('region', { name: 'Preferências de cookies' }).waitFor();
        const filename = `${device}-${route === '/' ? 'inicial' : route.slice(1)}.png`;
        await page.screenshot({ path: path.join(output, filename) });
        results.screenshots.push(filename);
        results.checks.push({ device, route, widths, banner: true });
      }

      await page.goto(origin + '/');
      const banner = page.getByRole('region', { name: 'Preferências de cookies' });
      assert.equal(await banner.getByRole('heading').innerText(), 'Utilizamos cookies');
      assert.equal(await banner.getByText('Usamos cookies para melhorar sua experiência. Ao aceitar, você permite o uso de cookies opcionais.').count(), 1);
      for (const [link, target] of [['Política de Privacidade', '/privacy'], ['Termos de Uso', '/terms']]) {
        assert.equal(await banner.getByRole('link', { name: link }).getAttribute('href'), target);
        await banner.getByRole('link', { name: link }).click();
        await page.waitForURL(origin + target);
        await page.goto(origin + '/');
        await banner.waitFor();
      }
      await banner.getByRole('button', { name: 'Configurar' }).click();
      const dialog = page.getByRole('dialog', { name: 'Preferências de cookies' });
      await dialog.waitFor();
      const checkbox = dialog.getByRole('checkbox');
      assert.equal(await checkbox.isChecked(), false, 'analytics deve iniciar desativado');
      await page.screenshot({ path: path.join(output, `${device}-configurar.png`) });
      results.screenshots.push(`${device}-configurar.png`);
      await checkbox.check();
      await dialog.getByRole('button', { name: 'Salvar preferência' }).click();
      assert.equal((await consent(page)).analytics, true);
      await page.reload();
      await banner.waitFor({ state: 'hidden' });

      for (const route of ['/', '/privacy', '/terms']) {
        await pageWithoutOverflow(page, route);
        await page.waitForTimeout(250);
        const layout = await page.evaluate(() => ({
          contentBottom: document.querySelector('main')?.getBoundingClientRect().bottom,
          footerTop: document.querySelector('footer')?.getBoundingClientRect().top,
        }));
        assert.ok(layout.footerTop >= layout.contentBottom - 4, `rodapé sobreposto em ${device} ${route}: ${JSON.stringify(layout)}`);
        const manage = page.getByRole('button', { name: 'Gerenciar cookies' });
        await manage.scrollIntoViewIfNeeded();
        const receivesClick = await manage.evaluate((button) => {
          const rect = button.getBoundingClientRect();
          const target = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
          return target === button || button.contains(target);
        });
        assert.equal(receivesClick, true, `botão do rodapé obstruído em ${device} ${route}`);
        await manage.click({ timeout: 3000 });
        await dialog.waitFor();
        assert.equal(await checkbox.isChecked(), true);
        await dialog.getByRole('button', { name: 'Fechar preferências de cookies' }).click();
      }
      await page.getByRole('button', { name: 'Gerenciar cookies' }).click();
      await checkbox.uncheck();
      await dialog.getByRole('button', { name: 'Salvar preferência' }).click();
      assert.equal((await consent(page)).analytics, false, 'revogação deve ser salva');
      await page.reload();
      assert.equal((await consent(page)).analytics, false);
      await banner.waitFor({ state: 'hidden' });
      results.checks.push({ device, configurable: true, analyticsDefaultOff: true, analyticsAccepted: true, revocable: true, footerAfterContentAndClickableOn: ['/', '/privacy', '/terms'] });
      await context.close();
    }

    for (const [button, expected] of [['Aceitar', true], ['Recusar', false]]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      page.on('request', (request) => {
        if (/google-analytics\.com|googletagmanager\.com|\/g\/collect/.test(request.url())) results.analyticsRequests.push(request.url());
      });
      await page.goto(origin + '/login');
      await page.getByRole('region', { name: 'Preferências de cookies' }).getByRole('button', { name: button, exact: true }).click();
      const stored = await consent(page);
      assert.equal(stored.analytics, expected);
      assert.equal(stored.marketing, false);
      await page.reload();
      await page.getByRole('region', { name: 'Preferências de cookies' }).waitFor({ state: 'hidden' });
      results.checks.push({ button, analytics: stored.analytics, persisted: true });
      await context.close();
    }
    const authContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const authPage = await authContext.newPage();
    await authPage.goto(origin + '/login');
    await authPage.getByRole('heading', { name: 'Entre no Projeto Garagem' }).waitFor();
    await authPage.getByRole('region', { name: 'Preferências de cookies' }).getByRole('button', { name: 'Recusar', exact: true }).click();
    await authPage.getByRole('button', { name: 'Entrar', exact: true }).click();
    assert.equal(await authPage.locator('form').evaluate((form) => form.checkValidity()), false);
    await authPage.getByRole('link', { name: 'Esqueci minha senha' }).click();
    await authPage.waitForURL(origin + '/forgot-password');
    await authPage.goto(origin + '/register');
    await authPage.getByRole('heading', { name: 'Crie sua conta' }).waitFor();
    await authPage.getByLabel('Nome completo').fill('Teste local');
    await authPage.getByLabel('Email').fill('teste-local@example.invalid');
    await authPage.getByLabel('Senha', { exact: true }).fill('123');
    await authPage.getByLabel('Confirmar senha').fill('123');
    await authPage.getByRole('button', { name: 'Criar conta' }).click();
    await authPage.getByRole('alert').getByText('A senha deve ter ao menos 6 caracteres.').waitFor();
    results.checks.push({ authNavigationAndLocalValidation: true, remoteSubmission: false });
    await authContext.close();
    assert.equal(results.runtimeErrors.length, 0, results.runtimeErrors.join('; '));
    assert.equal(results.analyticsRequests.length, 0, 'nenhum script ou coleta de analytics deve ser carregado');
    results.passed = true;
  } catch (error) {
    results.passed = false;
    results.error = String(error);
    throw error;
  } finally {
    fs.writeFileSync(path.join(output, 'resultado.json'), JSON.stringify(results, null, 2));
    await browser.close();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });

import { test, expect } from './fixtures';

test.beforeEach(async ({ context, baseURL }) => {
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort());
});

test('registration keeps the first input after document load and hydration with CPU 4x', async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', {rate:4});
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', {cacheDisabled:true});
  await cdp.send('Network.emulateNetworkConditions', {offline:false,latency:150,downloadThroughput:1.6e6/8,uploadThroughput:1.6e6/8});
  await page.goto('/register', {waitUntil:'load'});
  const name = page.getByLabel('Nome completo');
  await name.fill('Primeiro campo preservado');
  await page.getByLabel('Email', {exact:true}).fill('fixture@example.invalid');
  await page.getByLabel('Senha', {exact:true}).fill('fixture-password');
  await page.getByLabel('Confirmar senha').fill('fixture-password');
  await page.getByRole('button', {name:'Criar conta',exact:true}).click();
  await expect(page.locator('#terms-error')).toBeVisible();
  await expect(name).toHaveValue('Primeiro campo preservado');
  await expect(page.getByLabel('Email', {exact:true})).toHaveValue('fixture@example.invalid');
  await page.getByRole('checkbox', {name:/termos/i}).check();
  await expect(name).toHaveValue('Primeiro campo preservado');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('partnership anchors and offscreen content remain accessible', async ({ page }) => {
  await page.goto('/parcerias/criadores');
  await page.getByRole('link', {name:'Conheça o programa', exact:true}).click();
  await expect(page).toHaveURL(/#programa$/);
  await expect(page.locator('#programa-titulo')).toBeInViewport();
  for (const id of ['produtos-titulo', 'beneficios-titulo', 'media-kit-titulo']) {
    const heading = page.locator(`#${id}`);
    await heading.scrollIntoViewIfNeeded(); await expect(heading).toBeInViewport();
  }
  const summary = page.locator('summary').first();
  await summary.scrollIntoViewIfNeeded(); await summary.click();
  await expect(summary.locator('..')).toHaveAttribute('open', '');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

import { test, expect } from "@playwright/test";
import definitions from "../../src/lib/modifications/catalog-definitions.json";

test.beforeEach(async ({ context, baseURL }) => {
  await context.route("**/*", (route) => {
    const request = route.request();
    if (new URL(request.url()).origin !== new URL(baseURL!).origin) return route.abort();
    if (!['GET', 'HEAD'].includes(request.method())) return route.abort();
    if (request.url().includes('/offers?')) return route.fulfill({ json: {
      demonstration: true, offers: ['mercado_livre', 'shopee', 'amazon'].map((store) => ({
        id: `fixture-${store}`, store, destination_url: null, is_affiliate: false,
        price: null, price_checked_at: null, demonstration: true,
      })),
    } });
    return route.continue();
  });
  await context.addInitScript(() => localStorage.setItem('projeto-garagem:cookie-consent', JSON.stringify({
    version: 1, necessary: true, analytics: false, marketing: false, decidedAt: '2026-10-28',
  })));
});

async function openPicker(page: import('@playwright/test').Page) {
  await page.goto('/test-harness/catalog');
  await page.locator('[data-catalog-ready="true"]').waitFor({ state: 'attached' });
  await page.getByRole('button', { name: 'Adicionar modificação', exact: true }).click();
  return page.getByRole('dialog', { name: 'Adicionar modificação', exact: true });
}

test('all categories and selectable parts remain available; historical aliases and selection survive details', async ({ page }) => {
  const editor = await openPicker(page);
  const nav = editor.getByRole('navigation', { name: 'Categorias de peças' });
  for (const button of await nav.getByRole('button').all()) {
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(editor.getByLabel('Peças do catálogo').locator('button[aria-pressed]').first()).toBeAttached();
  }
  await nav.getByRole('button', { name: 'Todas', exact: true }).click();
  const more = editor.getByRole('button', { name: /Mostrar mais peças/ });
  while (await more.count()) await more.click();
  await expect(editor.getByLabel('Peças do catálogo').locator('button[aria-pressed]')).toHaveCount(definitions.filter(item => !item.selectionAliasOf).length);
  await editor.getByRole('searchbox').fill('turbina');
  const select = editor.getByLabel('Peças do catálogo').getByRole('button', { name: 'Turbocompressor Motor / Performance', exact: true });
  await select.click(); await expect(select).toHaveAttribute('aria-pressed', 'true');
  const trigger = editor.getByRole('button', { name: 'Detalhes de Turbocompressor', exact: true });
  await trigger.focus(); await page.keyboard.press('Enter');
  const details = page.getByRole('dialog', { name: 'Turbocompressor', exact: true });
  await expect(details).toBeVisible(); await expect(details.getByRole('button', { name: /Ver na loja/ })).toHaveCount(3);
  await details.getByRole('button', { name: /Ver na loja Amazon/ }).click();
  await expect(details.getByRole('status')).toContainText('Demonstração: Amazon');
  await page.keyboard.press('Escape'); await expect(trigger).toBeFocused(); await expect(select).toHaveAttribute('aria-pressed', 'true');
  await editor.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

for (const [width, height] of [[320,568],[390,844],[430,932],[768,1024],[1366,768],[1920,1080]]) {
  test(`shared details preserve layout, focus and hover at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const editor = await openPicker(page);
    await editor.getByRole('searchbox').fill('aerofolio');
    const trigger = editor.getByRole('button', { name: 'Ver detalhes de Aerofólio', exact: true });
    await trigger.hover(); await trigger.focus(); await page.keyboard.press('Enter');
    const details = page.getByRole('dialog', { name: 'Aerofólio', exact: true });
    await expect(details).toBeVisible();
    const box = await details.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1); expect(box!.y + box!.height).toBeLessThanOrEqual(height + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press('Escape'); await expect(trigger).toBeFocused(); await expect(editor).toBeVisible();
    await page.keyboard.press('Escape'); await expect(editor).toBeHidden();
  });
}

test('ranking decorative animations pause outside viewport and on hidden document, then resume', async ({ page }) => {
  await page.goto('/test-harness/performance?view=ranking');
  const layer = page.locator('.pg-scanlines');
  await expect(layer).toHaveCSS('animation-play-state', 'running');
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect(layer).toHaveCSS('animation-play-state', 'paused');
  await page.evaluate(() => scrollTo(0, 0));
  await expect(layer).toHaveCSS('animation-play-state', 'running');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(layer).toHaveCSS('animation-play-state', 'paused');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(layer).toHaveCSS('animation-play-state', 'running');
});

test('production offers API preserves the development-only demonstration guard', async ({ request }) => {
  expect((await request.get('/api/catalog/invalid/offers')).status()).toBe(400);
  const response = await request.get('/api/catalog/74f41706-15c6-470c-9c55-0b426e72e209/offers?demonstration=1');
  expect(response.headers()['cache-control']).toBe('no-store');
  const data = await response.json();
  expect(data.demonstration).toBe(false);
  expect(data.offers).toHaveLength(0);
});

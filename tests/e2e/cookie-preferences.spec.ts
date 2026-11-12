import { test, expect } from './fixtures';

test.beforeEach(async ({ context, baseURL }) => {
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort());
});

test('cookie preferences preserve modal focus, dismissal, consent and scroll restoration', async ({ page }) => {
  await page.goto('/');
  const configure = page.getByRole('button', { name: 'Configurar', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Preferências de cookies', exact: true });
  const close = page.getByRole('button', { name: 'Fechar preferências de cookies' });
  await configure.click();
  await expect(dialog).toBeVisible();
  await expect(close).toBeFocused();
  await expect(dialog).toHaveAccessibleDescription(/Escolha o uso de estatísticas/);
  await expect(dialog.getByRole('checkbox')).not.toBeChecked();
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  const box = await dialog.boundingBox(), viewport = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
  if (viewport.width < 640) expect(Math.abs(viewport.height - box!.y - box!.height - 16)).toBeLessThan(1);
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Salvar preferência' })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(close).toBeFocused();
  await dialog.getByRole('checkbox').check();
  await page.keyboard.press('Escape'); await expect(dialog).toBeHidden(); await expect(configure).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem('projeto-garagem:cookie-consent'))).toBeNull();
  expect(await page.locator('body').evaluate(el => el.style.overflow)).toBe('');
  await configure.click(); await expect(dialog.getByRole('checkbox')).not.toBeChecked();
  await page.mouse.click(2, 2); await expect(dialog).toBeHidden(); await expect(configure).toBeFocused();
  await configure.click(); await close.click(); await expect(dialog).toBeHidden();
  await configure.click(); await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Salvar preferência' }).click();
  const consent = await page.evaluate(() => JSON.parse(localStorage.getItem('projeto-garagem:cookie-consent')!));
  expect(consent).toMatchObject({ version: 1, necessary: true, analytics: true, marketing: false });
  await page.reload(); await expect(configure).toBeHidden();
  const manage = page.getByRole('button', { name: 'Gerenciar cookies', exact: true });
  await manage.click(); await expect(dialog.getByRole('checkbox')).toBeChecked();
  await dialog.getByRole('checkbox').uncheck();
  await dialog.getByRole('button', { name: 'Salvar preferência' }).click();
  await expect(manage).toBeFocused();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('projeto-garagem:cookie-consent')!).analytics)).toBe(false);
  await page.reload(); await expect(configure).toBeHidden();
});

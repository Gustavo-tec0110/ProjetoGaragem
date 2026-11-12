import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('projeto-garagem:cookie-consent', JSON.stringify({ version: 1, necessary: true, analytics: false, marketing: false, decidedAt: new Date().toISOString() })));
});

test('a new query immediately removes suggestions for the previous query', async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/projects/search-suggestions?*', async route => {
    const query = new URL(route.request().url()).searchParams.get('q');
    if (query === 'civic') await held;
    await route.fulfill({ json: { suggestions: [{ term: query === 'gol' ? 'Gol antigo' : 'Civic novo', source: 'Projeto', href: '/projeto/fixture' }] } });
  });
  await page.goto('/explorar');
  const input = page.getByRole('combobox', { name: 'Buscar projetos', exact: true });
  await input.fill('gol');
  await expect(page.getByRole('listbox').getByRole('option', { name: /Gol antigo/ })).toBeVisible();
  await input.fill('civic');
  try { await expect(page.getByRole('listbox').getByRole('option', { name: /Gol antigo/ })).toHaveCount(0); }
  finally { release(); }
  await expect(page.getByRole('listbox').getByRole('option', { name: /Civic novo/ })).toBeVisible();
});

test('returning to a cached query cancels the loading indicator from an aborted query', async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/projects/search-suggestions?*', async route => {
    if (new URL(route.request().url()).searchParams.get('q') === 'civic') await held;
    await route.fulfill({ json: { suggestions: [{ term: 'Gol antigo', source: 'Projeto' }] } });
  });
  await page.goto('/explorar');
  const input = page.getByRole('combobox', { name: 'Buscar projetos', exact: true });
  await input.fill('gol');
  await expect(page.getByRole('listbox').getByRole('option')).toBeVisible();
  await input.fill('civic');
  await expect(input.locator('..').locator('.animate-spin')).toBeVisible();
  await input.fill('gol');
  try {
    await expect(page.getByRole('listbox').getByRole('option')).toBeVisible();
    await expect(input.locator('..').locator('.animate-spin')).toHaveCount(0);
  } finally { release(); }
});

test('suggestion requests start only when the search field is active', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/projects/search-suggestions?*', async route => {
    requests++;
    await route.fulfill({ json: { suggestions: [{ term: 'Gol', source: 'Projeto' }] } });
  });
  await page.goto('/explorar?q=gol');
  const input = page.getByRole('combobox', { name: 'Buscar projetos', exact: true });
  await expect(input).toHaveValue('gol');
  await page.waitForLoadState('networkidle');
  expect(requests).toBe(0);
  await input.focus();
  await expect(page.getByRole('listbox').getByRole('option', { name: /Gol/ })).toBeVisible();
  expect(requests).toBe(1);
});

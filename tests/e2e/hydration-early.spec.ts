import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

// This suite owns a synthetic Auth fixture and must never run against a normal app.
test.skip(!process.env.HYDRATION_ISOLATED_ROOT?.startsWith('/tmp/garagem-auth-'), 'Run node scripts/test-hydration-local.mjs');

const fixture = 'http://127.0.0.1:3199';
async function gateScripts(page: Page) {
  let release!: () => void;
  let held = 0;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/_next/**/*.js*', async route => {
    held++;
    await gate;
    await route.continue();
  });
  return { release, held: () => held };
}
async function session(page: Page) {
  const sub = '11111111-1111-4111-8111-111111111111';
  const access = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub, role: 'authenticated', exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url'), 'fixture-signature'].join('.');
  const data = { access_token: access, refresh_token: 'fixture-refresh-token', token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now()/1000)+3600, user: { id: sub, email: 'fixture@example.invalid', app_metadata: {}, user_metadata: {} } };
  await page.context().addCookies([{ name: 'sb-127-auth-token', value: 'base64-'+Buffer.from(JSON.stringify(data)).toString('base64url'), domain: '127.0.0.1', path: '/' }]);
}
test.beforeEach(async ({ page, context, request, baseURL }) => {
  await request.post(fixture+'/__fixture/reset', { data: { accepted: false } });
  await context.route('**/*', route => ['127.0.0.1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.route('https://challenges.cloudflare.com/**', route => route.fulfill({ contentType: 'application/javascript', body: `
    window.turnstile={render(el,options){window.hydrationWidget=options;options.callback('fixture-valid');el.textContent='CAPTCHA local pronto';return 'fixture';},remove(){}};
  ` }));
  expect(new URL(baseURL!).hostname).toBe('127.0.0.1');
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6/8, uploadThroughput: 1.6e6/8 });
});

// Same timing and assertions as the diagnostic retained in etapa4.
test('etapa4: registration keeps the first input from navigation commit', async ({ page }) => {
  await page.goto('/register', { waitUntil: 'commit' });
  await page.getByLabel('Nome completo').fill('Primeiro campo preservado');
  await page.getByLabel('Email', { exact: true }).fill('fixture@example.invalid');
  await page.getByLabel('Senha', { exact: true }).fill('fixture-password');
  await page.getByLabel('Confirmar senha').fill('fixture-password');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.locator('#terms-error')).toBeVisible();
  await expect(page.getByLabel('Nome completo')).toHaveValue('Primeiro campo preservado');
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('fixture@example.invalid');
  await page.getByRole('checkbox', { name: /termos/i }).check();
  await expect(page.getByLabel('Nome completo')).toHaveValue('Primeiro campo preservado');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const flow of ['register', 'login', 'forgot-password', 'reset-password'] as const) {
  test(`${flow}: native typing before any React script survives hydration and reaches SDK`, async ({ page, request, runtimeMonitor }) => {
    if (flow === 'reset-password') await session(page);
    const gate = await gateScripts(page);
    const fields = flow === 'register' ? [['Nome completo','Pessoa antes do React'],['Email','fixture@example.invalid'],['Senha','fixture-password'],['Confirmar senha','fixture-password']]
      : flow === 'reset-password' ? [['Nova senha','fixture-password'],['Confirmar senha','fixture-password']]
      : flow === 'login' ? [['Email','fixture@example.invalid'],['Senha','fixture-password']] : [['Email','fixture@example.invalid']];
    try {
      await page.goto('/'+flow, { waitUntil: 'commit' });
      for (const [label, value] of fields) {
        const field = page.getByLabel(label, { exact: true });
        await field.pressSequentially(value);
        await expect(field).toHaveValue(value);
      }
      if (flow === 'register') await page.getByRole('checkbox').check();
      expect(gate.held()).toBeGreaterThan(0);
      // Keep the actual server-rendered node: replacing the tree must also fail.
      await page.getByLabel(fields[0][0], { exact: true }).evaluate(el => { (window as unknown as { earlyInput: Element }).earlyInput = el; });
    } finally { gate.release(); }
    await page.waitForLoadState('load');
    if (flow !== 'reset-password') await expect(page.getByText('CAPTCHA local pronto')).toBeVisible();
    for (const [label,value] of fields) await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
    expect(await page.getByLabel(fields[0][0], { exact: true }).evaluate(el => el === (window as unknown as { earlyInput: Element }).earlyInput)).toBe(true);
    if (flow === 'register') {
      await expect(page.getByRole('checkbox')).toBeChecked();
      // Force validation re-renders and ensure both early data and native edits survive.
      await page.getByRole('checkbox').uncheck();
      await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
      await expect(page.locator('#terms-error')).toContainText('Você precisa aceitar');
      for (const [label,value] of fields) await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
      await page.getByRole('checkbox').check();
    }
    const action = { register: 'Criar conta', login: 'Entrar', 'forgot-password': 'Enviar link', 'reset-password': 'Salvar' }[flow];
    if (flow === 'register') {
      await page.route('**/auth/v1/signup**', route => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'captcha_failed', msg: 'Desafio recusado na fixture' }) }), { times: 1 });
      await page.getByRole('button', { name: action, exact: true }).click();
      await expect(page.locator('#terms-error')).toContainText('Desafio recusado');
      for (const [label,value] of fields) await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
      await expect(page.getByRole('checkbox')).toBeChecked();
      await expect(page.getByRole('button', { name: action, exact: true })).toBeEnabled();
      await expect(page.getByText('CAPTCHA local pronto')).toBeVisible();
    }
    await page.getByRole('button', { name: action, exact: true }).click();
    if (flow === 'register') await expect(page.getByText(/Cadastro iniciado/)).toBeVisible();
    else if (flow === 'forgot-password') await expect(page.getByRole('status')).toContainText('Se o email estiver cadastrado');
    else await expect(page).toHaveURL(flow === 'login' ? /\/accept-terms\?next=/ : /\/login$/);
    const calls = await (await request.get(fixture+'/__fixture/calls')).json();
    const endpoint = { register: '/auth/v1/signup', login: '/auth/v1/token', 'forgot-password': '/auth/v1/recover', 'reset-password': '/auth/v1/user' }[flow];
    const call = calls.find((c: {path: string; method: string}) => c.path === endpoint && c.method === (flow === 'reset-password' ? 'PUT' : 'POST'));
    expect(call).toBeTruthy();
    if (flow !== 'reset-password') { expect(call.body.email).toBe('fixture@example.invalid'); expect(call.body.gotrue_meta_security.captcha_token).toBe('fixture-valid'); }
    if (flow !== 'forgot-password') expect(call.body.password).toBe('fixture-password');
    if (flow === 'register') {
      expect(call.body.data.full_name).toBe('Pessoa antes do React');
      // Consume only the exact resource error deliberately injected for CAPTCHA rejection.
      // Any additional runtime error still fails here and in the shared monitor.
      expect(runtimeMonitor.issues).toEqual(['console.error: Failed to load resource: the server responded with a status of 400 (Bad Request)']);
      runtimeMonitor.issues.splice(0, 1);
    }
  });
}

test('accept-terms: acceptance made before React is read on submit', async ({ page }) => {
  await session(page);
  const gate = await gateScripts(page);
  try {
    await page.goto('/accept-terms?next=%2Fonboarding', { waitUntil: 'commit' });
    await page.getByRole('checkbox').check();
    expect(gate.held()).toBeGreaterThan(0);
  } finally { gate.release(); }
  await page.waitForLoadState('load');
  await page.getByRole('button', { name: 'Aceitar e continuar' }).click();
  await expect(page).toHaveURL('/onboarding');
});

test('other forms: search typed before React survives focus updates and native submit', async ({ page, isMobile, request }, info) => {
  await page.route('**/api/projects/search-suggestions?**', route => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ suggestions: new URL(route.request().url()).searchParams.get('q') === 'Civic K20' ? [{ term: 'Civic K20', source: 'Busca local' }] : [] }),
  }));
  // A cold query and delayed fixture force the streamed fallback to be exercised.
  await request.post(fixture+'/__fixture/reset', { data: { carsDelayMs: 6000 } });
  const gate = await gateScripts(page);
  const search = page.getByRole('combobox', { name: isMobile ? 'Pesquisar catálogo no celular' : 'Buscar projetos', exact: true });
  try {
    await page.goto('/explorar?q=hydration-'+info.project.name+'-'+Date.now(), { waitUntil: 'commit' });
    const fallback = page.getByLabel('Carregando catálogo público', { exact: true });
    await expect(fallback).toBeVisible();
    await expect(fallback.locator('input,select,textarea')).toHaveCount(0);
    await search.fill('');
    await search.pressSequentially('Civic K20');
    await search.evaluate(el => { (window as unknown as { earlySearch: Element }).earlySearch = el; });
    expect(gate.held()).toBeGreaterThan(0);
  } finally { gate.release(); }
  await page.waitForLoadState('load');
  // Keeping focus across hydration must also initialize autocomplete with the live query.
  await expect(page.getByRole('option', { name: 'Civic K20 Busca local', exact: true })).toBeVisible();
  await search.blur(); await search.focus();
  await expect(search).toHaveValue('Civic K20');
  expect(await search.evaluate(el => el === (window as unknown as { earlySearch: Element }).earlySearch)).toBe(true);
  await search.press('Enter');
  await expect(page).toHaveURL(/q=Civic(?:\+|%20)K20/);
});

test('other forms: onboarding keeps native profile fields through hydration and validation', async ({ page, request }) => {
  await request.post(fixture+'/__fixture/reset', { data: { accepted: true } });
  await session(page);
  const gate = await gateScripts(page);
  const username = page.getByLabel('Username', { exact: true });
  const instagram = page.locator('#social-instagram');
  try {
    await page.goto('/onboarding', { waitUntil: 'commit' });
    await page.getByLabel('Nome', { exact: true }).fill('Nome antes do React');
    await username.fill('nome-antes-react');
    await instagram.fill('https://instagram.com/garagem');
    expect(gate.held()).toBeGreaterThan(0);
  } finally { gate.release(); }
  await page.waitForLoadState('load');
  await instagram.blur();
  await expect(username).toHaveValue('nome-antes-react');
  await expect(instagram).toHaveValue('https://www.instagram.com/garagem');
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('Nome antes do React');
  await instagram.fill('https://evil.invalid/garagem');
  await instagram.blur();
  await expect(instagram).toHaveAttribute('aria-invalid', 'true');
  await expect(username).toHaveValue('nome-antes-react');
});

test('registration: submit before scripts is replayed without reloading or clearing fields', async ({ page }) => {
  const gate = await gateScripts(page);
  let navigations = 0;
  page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) navigations++; });
  try {
    await page.goto('/register', { waitUntil: 'commit' });
    await page.getByLabel('Nome completo').fill('Envio antes do React');
    await page.getByLabel('Email', { exact: true }).fill('fixture@example.invalid');
    await page.getByLabel('Senha', { exact: true }).fill('fixture-password');
    await page.getByLabel('Confirmar senha').fill('fixture-password');
    expect(gate.held()).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Criar conta', exact: true }).click({ noWaitAfter: true });
  } finally { gate.release(); }
  await expect(page.locator('#terms-error')).toContainText('Você precisa aceitar');
  await expect(page.getByLabel('Nome completo')).toHaveValue('Envio antes do React');
  expect(navigations).toBe(1);
  expect(new URL(page.url()).search).toBe('');
});

test('other forms: new project name and year survive hydration and a brand change', async ({ page, request }) => {
  await request.post(fixture+'/__fixture/reset', { data: { accepted: true } });
  await session(page);
  const gate = await gateScripts(page);
  try {
    await page.goto('/criar-projeto', { waitUntil: 'commit' });
    await page.getByLabel('Nome do projeto', { exact: true }).fill('Projeto antes do React');
    await page.getByLabel('Ano', { exact: true }).fill('1994');
    await page.getByLabel('Tags do projeto', { exact: true }).fill('tag-antes-react');
    await page.getByLabel('Imagem por URL', { exact: true }).fill('/ref/hero-opala-ss.webp');
    expect(gate.held()).toBeGreaterThan(0);
  } finally { gate.release(); }
  await page.waitForLoadState('load');
  await page.getByRole('combobox', { name: 'Marca', exact: true }).selectOption('Volkswagen');
  await expect(page.getByLabel('Nome do projeto', { exact: true })).toHaveValue('Projeto antes do React');
  await expect(page.getByLabel('Ano', { exact: true })).toHaveValue('1994');
  await expect(page.getByLabel('Tags do projeto', { exact: true })).toHaveValue('tag-antes-react');
  await expect(page.getByLabel('Imagem por URL', { exact: true })).toHaveValue('/ref/hero-opala-ss.webp');
  await page.getByLabel('Tags do projeto', { exact: true }).press('Enter');
  await expect(page.locator('input[name="tags_csv"]')).toHaveValue('#tag-antes-react');
  await expect(page.getByLabel('Tags do projeto', { exact: true })).toBeEmpty();
  await page.getByLabel('Imagem por URL', { exact: true }).locator('..').getByRole('button', { name: 'Adicionar', exact: true }).click();
  await expect(page.locator('input[name="main_photo_url"]')).toHaveValue('/ref/hero-opala-ss.webp');
  await page.getByRole('combobox', { name: 'Modelo', exact: true }).selectOption('__other__');
  await page.getByPlaceholder('Digite o modelo').fill('Modelo manual');
  await expect(page.getByPlaceholder('Digite o modelo')).toHaveValue('Modelo manual');
});

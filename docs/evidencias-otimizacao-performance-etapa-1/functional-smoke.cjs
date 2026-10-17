/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const label = process.argv[2];
const origin = process.env.BENCH_ORIGIN || 'http://127.0.0.1:3101';
if (!label) throw new Error('Informe o rótulo do cenário');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const failures = [];
  const prefetches = [];
  const createPrefetches = [];
  const sdkRequests = [];
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') failures.push(message.text()); });
  page.on('request', (request) => {
    if (request.url().includes('/forgot-password?_rsc=')) prefetches.push(request.url());
    if (request.url().includes('/criar-projeto?_rsc=')) createPrefetches.push(request.url());
    if (request.url().includes('19hvplwf37y2e.js')) sdkRequests.push(request.url());
  });
  const result = { label, origin, startedAt: new Date().toISOString(), checks: [] };
  try {
    await page.goto(origin + '/login', { waitUntil: 'load' });
    await page.getByRole('heading', { name: 'Entre no Projeto Garagem' }).waitFor();
    await page.getByRole('region', { name: 'Preferências de cookies' }).waitFor();
    result.checks.push('login e aviso visíveis na primeira visita');
    await page.waitForTimeout(2500);
    result.forgotPrefetchRequestsBeforeClick = prefetches.length;
    result.createPrefetchRequestsBeforeClick = createPrefetches.length;
    result.supabaseSdkRequestsBeforeClick = sdkRequests.length;
    await page.getByRole('button', { name: 'Preferências', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button', { name: 'Salvar preferência' }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.reload({ waitUntil: 'load' });
    await page.getByRole('region', { name: 'Preferências de cookies' }).waitFor({ state: 'hidden' });
    result.checks.push('preferência salva e aviso ausente após reload');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    assert.equal(await page.locator('form').evaluate((form) => form.checkValidity()), false);
    result.checks.push('campos obrigatórios do login impedem envio vazio');
    await page.getByRole('link', { name: 'Esqueci minha senha' }).click();
    await page.waitForURL('**/forgot-password');
    result.checks.push('navegação para recuperar senha');
    await page.goto(origin + '/register');
    await page.getByRole('heading', { name: 'Crie sua conta' }).waitFor();
    await page.getByLabel('Nome completo').waitFor();
    result.checks.push('cadastro acessível sem enviar dados');
    await page.getByLabel('Nome completo').fill('Teste local');
    await page.getByLabel('Email').fill('teste-local@example.invalid');
    await page.getByLabel('Senha', { exact: true }).fill('123');
    await page.getByLabel('Confirmar senha').fill('123');
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await page.getByRole('alert').getByText('A senha deve ter ao menos 6 caracteres.').waitFor();
    result.checks.push('senha curta bloqueada antes de chamar cadastro remoto');
    await page.getByRole('navigation', { name: 'Navegação principal mobile' }).getByRole('link', { name: 'Criar' }).click();
    await page.waitForURL('**/criar-projeto');
    result.checks.push('navegação para criar projeto sem envio de dados');
    await page.goto(origin + '/');
    const createRequestsBeforeHome = createPrefetches.length;
    const sdkRequestsBeforeHome = sdkRequests.length;
    await page.waitForTimeout(2500);
    result.homeCreatePrefetchRequestsBeforeClick = createPrefetches.length - createRequestsBeforeHome;
    result.homeSupabaseSdkRequestsBeforeClick = sdkRequests.length - sdkRequestsBeforeHome;
    await page.getByRole('link', { name: 'Criar projeto', exact: true }).first().click();
    await page.waitForURL('**/criar-projeto');
    result.checks.push('criar projeto acessível a partir da página inicial');
    await page.goto(origin + '/');
    await page.getByRole('link', { name: 'Explorar', exact: true }).first().click();
    await page.waitForURL('**/explorar');
    result.checks.push('navegação pública');
    assert.equal(failures.length, 0, `Erros de runtime: ${failures.join('; ')}`);
    result.passed = true;
  } catch (error) {
    result.passed = false;
    result.error = String(error);
    throw error;
  } finally {
    result.finishedAt = new Date().toISOString();
    result.runtimeErrors = failures;
    fs.writeFileSync(path.join(__dirname, `${label}-functional.json`), JSON.stringify(result, null, 2));
    await browser.close();
  }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });

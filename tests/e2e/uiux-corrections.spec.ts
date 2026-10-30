import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const sizes = [[320,568],[390,844],[430,932],[768,1024],[1366,768],[1920,1080]];
const evidence = path.resolve('docs/auditorias/ui-ux/correcoes-evidencias');

test.beforeEach(async ({ context, baseURL }) => {
  expect(['localhost','127.0.0.1']).toContain(new URL(baseURL!).hostname);
  await context.route('**/*', route => {
    const request = route.request();
    return ['localhost','127.0.0.1'].includes(new URL(request.url()).hostname) && ['GET','HEAD'].includes(request.method()) ? route.continue() : route.abort();
  });
  await context.addInitScript(() => localStorage.setItem('projeto-garagem:cookie-consent', JSON.stringify({version:1,necessary:true,analytics:false,marketing:false,decidedAt:'2026-10-28'})));
  fs.mkdirSync(evidence, { recursive:true });
});

for (const [width,height] of sizes) {
  test(`UIUX-02/14: autenticação contida ${width}`, async ({ page }) => {
    await page.setViewportSize({width,height});
    for (const route of ['/login','/register']) {
      await page.goto(route);
      const section = page.locator('[data-auth-shell] section');
      await expect(section).toBeVisible();
      for (const element of await section.locator('input,button,h1,p').all()) {
        const box = await element.boundingBox();
        if (box) { expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x+box.width).toBeLessThanOrEqual(width+1); }
      }
      await expect(section).not.toContainText('NEXT_PUBLIC_');
      await page.screenshot({path:path.join(evidence,`${route.slice(1)}-${width}.png`),fullPage:true,animations:'disabled',style:'nextjs-portal{display:none!important}'});
    }
  });
  test(`UIUX-03/04/13: comparação identificada ${width}`, async ({ page }) => {
    await page.setViewportSize({width,height});
    await page.goto('/comparar');
    await expect(page.getByLabel('Projeto A',{exact:true})).toHaveAttribute('name','left');
    await expect(page.getByLabel('Projeto B',{exact:true})).toHaveAttribute('name','right');
    const metric = page.getByRole('group',{name:'Potência',exact:true});
    await expect(metric.locator('dt')).toHaveText('Potência');
    await expect(metric.locator('dd')).toHaveCount(2);
    await expect(metric.locator('dd').nth(0)).toContainText('Projeto A');
    await expect(metric.locator('dd').nth(1)).toContainText('Projeto B');
    await expect(page.getByRole('group',{name:'Número de modificações'})).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path:path.join(evidence,`comparar-${width}.png`),fullPage:true,animations:'disabled',style:'nextjs-portal{display:none!important}'});
  });
  test(`UIUX-15/18: ausência e 404 ${width}`, async ({ page }) => {
    await page.setViewportSize({width,height});
    await page.goto('/projeto/uiux-local-inexistente');
    const title = page.getByRole('heading',{name:'Essa ficha não está mais na pista'});
    await expect(title).toBeVisible();
    const intro = page.getByText('Projeto não encontrado',{exact:true});
    const top = (await intro.boundingBox())!.y;
    const headerBottom = await page.locator('header').first().evaluate(el => el.getBoundingClientRect().bottom);
    expect(top).toBeGreaterThanOrEqual(headerBottom);
    await expect(page.locator('main')).toHaveCount(1);
    await page.screenshot({path:path.join(evidence,`ausencia-${width}.png`),animations:'disabled',style:'nextjs-portal{display:none!important}'});
    await page.goto('/uiux-rota-inexistente');
    await expect(page.getByRole('heading',{name:'Essa rota saiu da pista'})).toBeVisible();
    await expect(page.locator('main')).toHaveCount(1);
  });
  test(`UIUX-19: ofertas extensas ${width}`, async ({ page }) => {
    await page.setViewportSize({width,height});
    await page.route('**/api/catalog/*/offers?*', r => r.fulfill({json:{demonstration:true,offers:[{id:'local-uiux',store:'amazon',demonstration:true,product_name:'Produto de demonstração com nome extenso para conferir legibilidade e disposição no celular',compatibility_notes:'Aplicação ilustrativa: confirme as medidas e a instalação no seu veículo.',is_affiliate:false}]}}));
    await page.goto('/test-harness/catalog-details');
    await page.getByRole('button',{name:'Ver detalhes de Aerofólio',exact:true}).click();
    const dialog=page.getByRole('dialog');
    const button=dialog.getByRole('button',{name:/Ver na loja Amazon/});
    await button.scrollIntoViewIfNeeded();
    const text=dialog.getByText(/^Produto de demonstração/);
    const textBox=(await text.boundingBox())!, btnBox=(await button.boundingBox())!;
    if (width<640) {
      expect(textBox.width).toBeGreaterThan(170);
      expect(btnBox.y).toBeGreaterThan(textBox.y+textBox.height);
    }
    const box=(await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width+1);
    await page.screenshot({path:path.join(evidence,`ofertas-${width}.png`),animations:'disabled',style:'nextjs-portal{display:none!important}'});
    await button.click();
    await expect(dialog.getByRole('status').last()).toContainText('Nenhuma loja foi aberta');
  });
}

test('UIUX-16: filtros nos dois sentidos, orientação e foco', async ({ page }) => {
  await page.setViewportSize({width:390,height:844}); await page.goto('/explorar');
  const trigger=page.getByRole('button',{name:'Abrir filtros avançados'});
  for (const [width,height] of [[768,1024],[844,390],[932,430],[1366,768]]) {
    await page.setViewportSize({width:390,height:844});
    await trigger.click(); await expect(page.getByRole('dialog')).toBeVisible();
    await page.setViewportSize({width,height});
    await expect(page.locator('[role=dialog]')).toHaveCount(0);
    await expect.poll(()=>page.locator('body').evaluate(e=>getComputedStyle(e).pointerEvents)).not.toBe('none');
    await expect(page.getByRole('combobox',{name:'Buscar projetos'})).toBeFocused();
    await page.getByRole('combobox',{name:'Buscar projetos'}).click();
    await expect(page.getByRole('combobox',{name:'Buscar projetos'})).toBeFocused();
  }
  await page.setViewportSize({width:767,height:568});await trigger.click();
  await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
  await trigger.click();await page.setViewportSize({width:768,height:568});
  await expect(page.locator('[role=dialog]')).toHaveCount(0);
  await page.setViewportSize({width:320,height:568});await expect(trigger).toBeVisible();
  await trigger.click();await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button',{name:'Fechar filtros'}).click();await expect(trigger).toBeFocused();
});

test('UIUX-06: setas, seleção Enter, Escape tardio, Tab e mouse', async ({page})=>{
  await page.setViewportSize({width:1366,height:768});
  await page.route('**/api/projects/search-suggestions?*',r=>r.fulfill({json:{suggestions:[{term:'Gol',source:'Modelo'},{term:'Gol turbo',source:'Projeto',href:'/projeto/uiux-local-inexistente'}]}}));
  await page.goto('/explorar');
  const input=page.getByRole('combobox',{name:'Buscar projetos'});
  await input.fill('gol');await expect(page.getByRole('option').filter({hasText:'Gol turbo'})).toBeVisible();
  await input.press('ArrowDown');await expect(page.getByRole('option',{name:'Gol Modelo'})).toHaveAttribute('aria-selected','true');
  expect(await input.getAttribute('aria-activedescendant')).toBe(await page.getByRole('option',{name:'Gol Modelo'}).getAttribute('id'));
  await input.press('ArrowUp');await expect(page.getByRole('option',{name:'Gol turbo Projeto'})).toHaveAttribute('aria-selected','true');
  await input.press('ArrowDown');await input.press('Enter');await page.waitForURL(u=>u.searchParams.get('q')==='Gol');
  await input.fill('gol');await expect(page.getByRole('option',{name:'Gol Modelo'})).toBeVisible();await input.press('Escape');
  await expect(input).toHaveAttribute('aria-expanded','false');await expect(input).toBeFocused();
  await input.press('ArrowUp');await expect(page.getByRole('option',{name:'Gol turbo Projeto'})).toHaveAttribute('aria-selected','true');await input.press('Enter');await page.waitForURL(/projeto\/uiux-local-inexistente/);
  await page.goto('/explorar');await input.fill('gol');await expect(page.getByRole('option',{name:'Gol Modelo'})).toBeVisible();
  await input.press('Tab');await expect(page.getByRole('listbox')).toHaveCount(0);
  await input.focus();await page.getByRole('option',{name:'Gol Modelo'}).click();await page.waitForURL(u=>u.searchParams.get('q')==='Gol');
  await input.fill('nova');await input.press('Escape');await page.waitForTimeout(400);await expect(input).toHaveAttribute('aria-expanded','false');
});

test('UIUX-07/14: convites com retorno e callback compreensível',async({page})=>{
  for (const route of ['/perfil','/onboarding']) {
    await page.goto(route);await expect(page.locator('main').getByRole('link',{name:'Entrar',exact:true})).toHaveAttribute('href',`/login?next=${route}`);
  }
  await page.goto('/auth/auth-code-error');
  await expect(page.locator('main')).toContainText('O link de entrada pode ter expirado');
  await expect(page.locator('main')).not.toContainText('Supabase');
});

test('UIUX-08: senha curta, confirmação e validação antes de envio',async({page})=>{
  const requests:string[]=[];page.on('request',r=>{if(r.method()==='POST')requests.push(r.url());});
  await page.goto('/reset-password');
  const password=page.getByLabel('Nova senha',{exact:true}),confirm=page.getByLabel('Confirmar senha',{exact:true});
  await password.fill('a');await confirm.fill('a');await page.getByRole('button',{name:'Salvar',exact:true}).click();
  expect(await password.evaluate((e:HTMLInputElement)=>e.validity.tooShort)).toBe(true);await expect(password).toBeFocused();
  await password.fill('abcdef');await confirm.fill('abcdeg');await page.getByRole('button',{name:'Salvar',exact:true}).click();
  await expect(confirm).toHaveAttribute('aria-invalid','true');await expect(confirm).toBeFocused();await expect(page.locator('form').getByRole('alert')).toContainText('confirmação');
  expect(requests).toEqual([]);
});

test('UIUX-05: categorias e CTA com contraste suficiente',async({page})=>{
  await page.goto('/test-harness/catalog');await page.getByRole('button',{name:'Adicionar modificação',exact:true}).click();
  const categories=page.getByRole('navigation',{name:'Categorias de peças'});
  for(const name of ['Todas','Motor / Performance']) {
    const button=categories.getByRole('button',{name,exact:true});await button.click();await expect(button).toHaveAttribute('aria-pressed','true');
    const ratio=await button.evaluate(e=>{
      const luminance=(color:string)=>{const [r,g,b]=color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v=>{const n=v/255;return n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4;});return r*0.2126+g*0.7152+b*0.0722;};
      const fg=luminance(getComputedStyle(e).color),bg=luminance(getComputedStyle(e).backgroundColor);return (Math.max(fg,bg)+0.05)/(Math.min(fg,bg)+0.05);
    }); expect(ratio).toBeGreaterThanOrEqual(4.5);
  }
});

test('UIUX-17: cópia negada, indisponível e bem sucedida sem exceção',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/test-harness/project-overview?owner=1');
  const group=page.getByRole('group',{name:'Ações do projeto',exact:true});
  for(const mode of ['denied','absent','success']) {
    await page.evaluate(mode=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:mode==='absent'?undefined:{writeText:async()=>{if(mode==='denied')throw new DOMException('negada','NotAllowedError');}}}),mode);
    await group.getByRole('button',{name:/Copiar link|Copiado/,exact:true}).click();
    if(mode==='success') {await expect(group.getByRole('status')).toHaveText('Link copiado');await expect(group.getByLabel('Link do projeto')).toHaveCount(0);}
    else {await expect(group.getByRole('status')).toContainText('Não foi possível copiar');const url=group.getByLabel('Link do projeto');await expect(url).toHaveValue(page.url());await url.click();await url.press('ControlOrMeta+A');expect(await url.evaluate((e:HTMLInputElement)=>e.selectionEnd! - e.selectionStart!)).toBe(page.url().length);}
  }
  expect(errors).toEqual([]);
});

test('UIUX-09/10/11/12/18: componentes com fixtures locais privadas',async({page})=>{
  test.skip(process.env.UIUX_PRIVATE_HARNESS!=='1','Requer fixture temporária criada por tests/fixtures/uiux-local-harness.mjs.');
  await page.setViewportSize({width:390,height:844});await page.goto('/test-harness/uiux');
  await expect(page.getByLabel('Tags do projeto',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Imagem por URL',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Comentário',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Adicionar modificação atual',exact:true}).click();
  await expect(page.getByLabel('Imagem da peça (URL)',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Observação da peça',{exact:true})).toBeVisible();
  await page.getByLabel('Meta do projeto',{exact:true}).focus();
  await page.keyboard.press('Tab');
  const keyboardRadio=page.locator('input[type=radio]:focus');
  await expect(keyboardRadio).toHaveCount(1);
  expect(await keyboardRadio.evaluate(e=>getComputedStyle(e.closest('label')!).boxShadow)).not.toBe('none');
  await keyboardRadio.press('ArrowRight');const focused=page.locator('input[type=radio]:focus');await expect(focused).toBeChecked();await focused.locator('..').screenshot({path:path.join(evidence,'radio-foco-390.png')});
  const navigation=page.getByRole('navigation',{name:'Conteúdo do perfil'});
  await expect(navigation.getByRole('link',{name:'Projetos',exact:true})).toHaveAttribute('aria-current','page');await expect(navigation.getByRole('tab')).toHaveCount(0);await expect(navigation.getByRole('tablist')).toHaveCount(0);
  await expect(page.getByRole('region',{name:'Erro local'}).locator('main')).toHaveCount(1);
  await page.emulateMedia({reducedMotion:'reduce'});
  const card=page.locator('.pg-premium-card').first();await card.scrollIntoViewIfNeeded();await card.hover();await expect(card).toHaveCSS('transform','none');await page.mouse.down();await expect(card).toHaveCSS('transform','none');await page.mouse.up();
  await page.screenshot({path:path.join(evidence,'fixture-foco-390.png'),animations:'disabled',style:'nextjs-portal{display:none!important}'});
});

for(const [width,height] of sizes) test(`UIUX-04: comparação preenchida local ${width}`,async({page})=>{
  test.skip(process.env.UIUX_PRIVATE_HARNESS!=='1','Requer cópia local com fonte de dados de demonstração.');
  await page.setViewportSize({width,height});await page.goto('/test-harness/uiux-compare?left=fixture-a&right=fixture-b');
  const power=page.getByRole('group',{name:'Potência',exact:true});
  await expect(power.locator('dd').nth(0)).toContainText('Projeto A · Opala de teste A');await expect(power.locator('dd').nth(0)).toContainText('140 cv');
  await expect(power.locator('dd').nth(1)).toContainText('Projeto B · Opala de teste B');await expect(power.locator('dd').nth(1)).toContainText('180 cv');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await power.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(evidence,`comparar-preenchido-${width}.png`),animations:'disabled',style:'nextjs-portal{display:none!important}'});
});

test('UIUX-16: rotação de toque libera a página e permite reabrir filtros',async({browser,baseURL})=>{
  const context=await browser.newContext({baseURL,viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'&&r.request().method()==='GET'?r.continue():r.abort());
  await context.addInitScript(()=>localStorage.setItem('projeto-garagem:cookie-consent',JSON.stringify({version:1,necessary:true,analytics:false,marketing:false,decidedAt:'2026-10-28'})));
  const page=await context.newPage();await page.goto('/explorar');
  const trigger=page.getByRole('button',{name:'Abrir filtros avançados'});
  await trigger.tap();await expect(page.getByRole('dialog')).toBeVisible();await page.setViewportSize({width:844,height:390});
  await expect(page.locator('[role=dialog]')).toHaveCount(0);await expect.poll(()=>page.locator('body').evaluate(e=>getComputedStyle(e).pointerEvents)).not.toBe('none');
  await page.setViewportSize({width:390,height:844});await trigger.tap();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Fechar filtros'}).tap();await context.close();
});

test('UIUX-17: ações compartilhadas oferecem cópia manual',async({page})=>{
  test.skip(process.env.UIUX_PRIVATE_HARNESS!=='1','Requer fixture temporária.');
  await page.goto('/test-harness/uiux');await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined}));
  const group=page.getByRole('region',{name:'Compartilhamento local'});await group.getByRole('button',{name:'Copiar link',exact:true}).click();await expect(group.getByLabel('Link do projeto')).toHaveValue(page.url());await expect(group.getByRole('status')).toContainText('Não foi possível copiar');
});

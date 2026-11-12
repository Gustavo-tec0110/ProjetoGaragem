import { expect, test, type Page } from "@playwright/test";

async function mockWidget(page: Page, behavior = "valid") {
  await page.route("https://challenges.cloudflare.com/**", (route) => route.fulfill({ contentType: "application/javascript", body: `
    window.fixtureWidgets=[];
    window.turnstile={
      render(el,options){
        const id=String(window.fixtureWidgets.length);window.fixtureWidgets.push(options);
        el.innerHTML=options.size==='compact'?'<div style="width:150px;height:140px;background:#202020;color:white">Verificação local simulada</div>':'<div style="width:100%;min-width:300px;height:65px;background:#202020;color:white">Verificação local simulada</div>';
        window.fixtureCurrent=options;
        ${behavior === "valid" ? "options.callback('fixture-valid');" : behavior === "error" ? "options['error-callback']();" : ""}
        return id;
      },remove(){},
    };` }));
}
async function fillRegistration(page: Page) {
  await page.getByLabel("Nome completo").fill("Pessoa fictícia");
  await page.getByLabel("Email", { exact: true }).fill("fixture@example.invalid");
  await page.getByLabel("Senha", { exact: true }).fill("fixture-password");
  await page.getByLabel("Confirmar senha").fill("fixture-password");
}
async function localSession(page: Page) {
  const sub = "11111111-1111-4111-8111-111111111111";
  const access = ["eyJhbGciOiJIUzI1NiJ9", Buffer.from(JSON.stringify({ sub, role: "authenticated", exp: Math.floor(Date.now()/1000)+3600 })).toString("base64url"), "fixture-signature"].join(".");
  const session = { access_token: access, refresh_token: "fixture-refresh-token", token_type: "bearer", expires_in: 3600,
    expires_at: Math.floor(Date.now()/1000)+3600, user: { id: sub, email: "fixture@example.invalid", app_metadata: { provider: "google" }, user_metadata: {} } };
  await page.context().addCookies([{ name: "sb-127-auth-token", value: "base64-"+Buffer.from(JSON.stringify(session)).toString("base64url"), domain: "127.0.0.1", path: "/" }]);
}

test.beforeEach(async ({ page, request }) => {
  await request.post("http://127.0.0.1:3199/__fixture/reset", { data: {} });
  // Block every external browser request. Only the widget is fulfilled by a mock.
  await page.route(/https?:\/\//, (route) => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  await mockWidget(page);
});

for (const [width,height] of [[320,568],[390,844],[430,932],[768,1024],[1366,768],[1920,1080]]) {
  test(`cadastro acessível sem overflow ${width}x${height}`,async({page})=>{
    await page.setViewportSize({width,height});await page.goto('/register');
    const checkbox=page.getByRole('checkbox');await expect(checkbox).not.toBeChecked();
    await fillRegistration(page);await page.getByRole('button',{name:'Criar conta',exact:true}).click();
    await expect(page.locator('#terms-error')).toContainText('Você precisa aceitar os Termos de Uso para criar sua conta.');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await expect(page.locator('form').getByRole('link',{name:'Termos de Uso',exact:true})).toHaveAttribute('href','/terms');
    await expect(page.locator('form').getByRole('link',{name:'Política de Privacidade',exact:true})).toHaveAttribute('href','/privacy');
    await checkbox.focus();await page.keyboard.press('Space');await expect(checkbox).toBeChecked();
    await expect(checkbox).toHaveAttribute('aria-invalid','false');
    await expect(page.locator('#terms-error')).toHaveCount(0);
    await page.evaluate(()=>window.scrollTo(0,0));
    if(width===390||width===1366) await page.screenshot({path:`${process.env.GARAGEM_AUTH_EVIDENCE_DIR ?? "docs/auditorias/auth/evidencias"}/register-${width}.png`,fullPage:true});
  });
}

test('notificações distinguem falha de consulta de lista vazia e permitem recuperar',async({page,request})=>{
  await request.post('http://127.0.0.1:3199/__fixture/reset',{data:{accepted:true,notificationFailure:true}});
  await localSession(page);
  await page.goto('/notificacoes');
  await expect(page.locator('main').getByRole('alert')).toContainText('Não foi possível carregar suas notificações');
  await expect(page.getByText('Contagem indisponível',{exact:true})).toBeVisible();
  await expect(page.getByText(/Nenhuma notificação por enquanto/)).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('Private fixture diagnostics');
  await request.post('http://127.0.0.1:3199/__fixture/reset',{data:{accepted:true}});
  await page.getByRole('link',{name:'Tentar novamente',exact:true}).click();
  await expect(page.getByText('Interação local',{exact:true})).toBeVisible();
  await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
});

test('falha ao marcar notificação mantém estado e permite tentar novamente',async({page,request})=>{
  await request.post('http://127.0.0.1:3199/__fixture/reset',{data:{accepted:true,notificationWriteFailure:true}});
  await localSession(page);
  await page.goto('/notificacoes');
  const button=page.getByRole('button',{name:'Marcar lida',exact:true});
  await button.click();
  await expect(page.locator('main').getByRole('alert')).toContainText('Não foi possível marcar a notificação como lida');
  await expect(button).toBeEnabled();
  const calls = await (await request.get('http://127.0.0.1:3199/__fixture/calls')).json();
  expect(calls.filter((call: { path: string; method: string }) =>
    call.path === '/rest/v1/notifications' && call.method === 'PATCH'
  )).toHaveLength(1);
  await request.post('http://127.0.0.1:3199/__fixture/reset',{data:{accepted:true}});
  await button.click();
  await expect(button).toHaveCount(0);
  await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
});

test('cadastro com aceite envia CAPTCHA nativo e aguarda confirmação',async({page,request})=>{
  await page.goto('/register');await fillRegistration(page);await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'Criar conta',exact:true}).click();
  await expect(page.getByText(/Cadastro iniciado/)).toBeVisible();
  const calls=await (await request.get('http://127.0.0.1:3199/__fixture/calls')).json();
  const signup=calls.filter((call:{path:string})=>call.path==='/auth/v1/signup');
  expect(signup).toHaveLength(1);expect(signup[0].body.gotrue_meta_security.captcha_token).toBe('fixture-valid');
  expect(signup[0].body.data.accepted).toBeUndefined();
});

test('cadastro duplicado exibe a mesma orientação de confirmação',async({page,request})=>{
  await request.post('http://127.0.0.1:3199/__fixture/reset',{data:{duplicateSignup:true}});
  await page.goto('/register');
  await fillRegistration(page);
  await page.getByRole('checkbox').check();
  await expect(page.getByText('Verificação local simulada')).toBeVisible();
  await page.getByRole('button',{name:'Criar conta',exact:true}).click();
  await expect(page.getByText(/Se a conta precisar de confirmação/)).toBeVisible();
  await expect(page.getByText('User already registered')).toHaveCount(0);
});

test('cadastro recusa email inválido e senha curta antes de chamar o provedor', async ({ page, request }) => {
  await page.goto('/register');
  await fillRegistration(page);
  await page.getByRole('checkbox').check();
  await expect(page.getByText('Verificação local simulada')).toBeVisible();

  const email = page.getByLabel('Email', { exact: true });
  const submit = page.getByRole('button', { name: 'Criar conta', exact: true });
  await email.fill('email-invalido');
  await submit.click();
  await expect(email).toBeFocused();
  expect(await email.evaluate((input: HTMLInputElement) => input.validity.typeMismatch)).toBe(true);

  await email.fill('fixture@example.invalid');
  await page.getByLabel('Senha', { exact: true }).fill('12345');
  await page.getByLabel('Confirmar senha').fill('12345');
  await submit.click();
  await expect(page.getByText('A senha deve ter ao menos 6 caracteres.', { exact: true })).toBeVisible();
  const calls = await (await request.get('http://127.0.0.1:3199/__fixture/calls')).json();
  expect(calls.filter((call: { path: string }) => call.path === '/auth/v1/signup')).toHaveLength(0);
});

test('token ausente bloqueia operação',async({page,request})=>{
  await mockWidget(page,'empty');await page.goto('/register');await fillRegistration(page);await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'Criar conta',exact:true}).click();
  await expect(page.locator('#terms-error')).toContainText('Conclua a verificação');
  expect((await (await request.get('http://127.0.0.1:3199/__fixture/calls')).json()).some((call:{path:string})=>call.path==='/auth/v1/signup')).toBe(false);
});

for(const failure of ['invalid','expired','reused','service']) {
  test(`CAPTCHA ${failure}: recusa e permite novo desafio`,async({page})=>{
    await page.goto('/register');await fillRegistration(page);await page.getByRole('checkbox').check();
    await expect(page.getByText('Verificação local simulada')).toBeVisible();
    await page.route('http://127.0.0.1:3199/auth/v1/signup**',route=>route.fulfill({status:failure==='service'?503:400,contentType:'application/json',body:JSON.stringify({code:'captcha_failed',msg:failure})}));
    await page.getByRole('button',{name:'Criar conta',exact:true}).click();await expect(page.locator('#terms-error')).toBeVisible();
    await expect(page.getByRole('button',{name:'Criar conta',exact:true})).toBeEnabled();
    await page.getByRole('button',{name:'Refazer verificação'}).click();
    expect(await page.evaluate(()=>((window as unknown as {fixtureWidgets:unknown[]}).fixtureWidgets).length)).toBeGreaterThan(1);
  });
}

test('expiração do widget limpa token e exige refazer',async({page})=>{
  await page.goto('/register');await fillRegistration(page);await page.getByRole('checkbox').check();
  await expect(page.getByText('Verificação local simulada')).toBeVisible();
  await page.evaluate(()=>((window as unknown as {fixtureCurrent:Record<string,()=>void>}).fixtureCurrent)['expired-callback']());
  await page.getByRole('button',{name:'Criar conta',exact:true}).click();
  await expect(page.getByText('Conclua a verificação de segurança para continuar.')).toBeVisible();
});

test('envio duplicado faz uma chamada',async({page,request})=>{
  await page.goto('/register');await fillRegistration(page);await page.getByRole('checkbox').check();
  await page.evaluate(()=>{const form=document.querySelector('form')!;form.requestSubmit();form.requestSubmit();});
  await expect(page.getByText(/Cadastro iniciado/)).toBeVisible();
  const calls=await(await request.get('http://127.0.0.1:3199/__fixture/calls')).json();
  expect(calls.filter((call:{path:string})=>call.path==='/auth/v1/signup')).toHaveLength(1);
});

test('recuperação envia captchaToken e preserva callback de redefinição',async({page,request})=>{
  await page.goto('/forgot-password');await page.getByLabel('Email',{exact:true}).fill('fixture@example.invalid');
  await page.getByRole('button',{name:'Enviar link'}).click();await expect(page.getByRole('status')).toContainText('Se o email estiver cadastrado');
  const calls=await(await request.get('http://127.0.0.1:3199/__fixture/calls')).json();
  expect(calls.find((call:{path:string})=>call.path==='/auth/v1/recover').body.gotrue_meta_security.captcha_token).toBe('fixture-valid');
});

test('login por senha envia token e leva conta sem aceite para etapa obrigatória',async({page,request})=>{
  // The proxy response is checked separately from the cold dev page compilation.
  test.setTimeout(120_000);
  const unauthenticated = await page.request.get('/onboarding', { maxRedirects: 0 });
  expect(unauthenticated.status()).toBe(307);
  expect(unauthenticated.headers()['cache-control']).toContain('no-store');
  await page.goto('/login?next=%2Fonboarding');await page.getByLabel('Email',{exact:true}).fill('fixture@example.invalid');await page.getByLabel('Senha',{exact:true}).fill('fixture-password');
  await expect(page.getByText('Verificação local simulada')).toBeVisible();
  const protectedNavigation = page.waitForResponse(response =>
    new URL(response.url()).pathname === '/onboarding' && response.request().isNavigationRequest(),
  );
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  const redirect = await protectedNavigation;
  expect(redirect.status()).toBe(307);
  expect(await redirect.headerValue('location')).toContain('/accept-terms?next=');
  await expect(page).toHaveURL(/\/accept-terms\?next=/, {timeout:60_000});
  await page.reload({ waitUntil: 'domcontentloaded' });
  const session = await page.request.get('/api/auth/session');
  expect(await session.json()).toEqual({ authenticated: true });
  const calls=await(await request.get('http://127.0.0.1:3199/__fixture/calls')).json();
  expect(calls.find((call:{path:string})=>call.path==='/auth/v1/token').body.gotrue_meta_security.captcha_token).toBe('fixture-valid');

  const terms = page.getByRole('checkbox');
  await expect(terms).not.toBeChecked();
  await terms.check();
  const acceptance = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/terms');
  await page.getByRole('button', { name: 'Aceitar e continuar' }).click();
  expect((await acceptance).status()).toBe(200);
  await expect(page).toHaveURL('/onboarding');
});

for(const provider of ['google','email']) {
  test(`callback PKCE ${provider} sem aceite preserva destino e sessão`,async({page,request})=>{
    // This isolated runner uses next dev: first compilation of the destination
    // can exceed the normal assertion window on a memory-constrained machine.
    test.setTimeout(120_000);
    await request.post('http://127.0.0.1:3199/__fixture/reset',{data:{provider}});
    await page.context().addCookies([{name:'sb-127-auth-token-code-verifier',value:'base64-'+Buffer.from(JSON.stringify('fixture-verifier')).toString('base64url'),domain:'127.0.0.1',path:'/'}]);
    await page.goto('/auth/callback?code=fixture-code&next=%2Fonboarding%3Ffrom%3Dfixture');
    await expect(page).toHaveURL(/\/accept-terms\?next=%2Fonboarding%3Ffrom%3Dfixture/);
    await expect(page.getByRole('checkbox')).not.toBeChecked();
    await page.getByRole('checkbox').check();
    const acceptanceResponse=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/auth/terms',{timeout:60_000});
    await page.getByRole('button',{name:'Aceitar e continuar'}).click();
    expect((await acceptanceResponse).status()).toBe(200);
    await expect(page).toHaveURL('/onboarding?from=fixture',{timeout:60_000});
  });
}

test('usuário existente com aceite passa pelo callback sem exigir novamente',async({page,request})=>{
  await request.post('http://127.0.0.1:3199/__fixture/reset',{data:{accepted:true}});
  await page.context().addCookies([{name:'sb-127-auth-token-code-verifier',value:'base64-'+Buffer.from(JSON.stringify('fixture-verifier')).toString('base64url'),domain:'127.0.0.1',path:'/'}]);
  await page.goto('/auth/callback?code=fixture-code&next=%2Fonboarding');await expect(page).toHaveURL('/onboarding?auth_redirect=1');
});

test('acesso direto e POST restrito não contornam aceite',async({page})=>{
  await localSession(page);await page.goto('/onboarding?from=direct');await expect(page).toHaveURL(/\/accept-terms/);
  const response=await page.request.post('/criar-projeto',{data:{}});expect(response.status()).toBe(403);
});

test('endpoint rejeita identidade forjada, versão incorreta e origem externa',async({page})=>{
  await localSession(page);
  for(const data of [{accepted:true,termsVersion:'forged',privacyVersion:'forged'},{accepted:true,termsVersion:'terms-v1',privacyVersion:'privacy-v1',user_id:'other'}])
    expect((await page.request.post('/api/auth/terms',{data})).status()).toBe(400);
  expect((await page.request.post('/api/auth/terms',{headers:{origin:'https://evil.invalid'},data:{}})).status()).toBe(403);
});

test('sessão expirada permite voltar ao login',async({page,request})=>{
  await localSession(page);await request.post('http://127.0.0.1:3199/__fixture/reset',{data:{expired:true}});
  const redirected = page.waitForResponse(response =>
    new URL(response.url()).pathname === '/garagem' && response.request().isNavigationRequest(),
  );
  await page.goto('/garagem');
  const redirect = await redirected;
  expect(redirect.status()).toBe(307);
  expect(await redirect.headerValues('set-cookie')).toEqual(
    expect.arrayContaining([expect.stringMatching(/^sb-127-auth-token=;/)]),
  );
  await expect(page).toHaveURL('/login?next=%2Fgaragem');
  expect((await page.context().cookies()).some(cookie => cookie.name === 'sb-127-auth-token')).toBe(false);
  await page.goto('/accept-terms?next=%2Fonboarding');await expect(page).toHaveURL(/\/login\?next=/);
  expect((await page.request.post('/api/auth/terms',{data:{}})).status()).toBe(401);
});

test('logout disponível antes do aceite',async({page})=>{
  await localSession(page);await page.goto('/accept-terms');await page.getByRole('button',{name:'Sair da conta'}).click();await expect(page).toHaveURL('/login');
  expect((await page.context().cookies()).some(cookie=>cookie.name==='sb-127-auth-token')).toBe(false);
});

test('recuperação não entra em loop de aceite no callback',async({page})=>{
  await page.context().addCookies([{name:'sb-127-auth-token-code-verifier',value:'base64-'+Buffer.from(JSON.stringify('fixture-verifier')).toString('base64url'),domain:'127.0.0.1',path:'/'}]);
  await page.goto('/auth/callback?code=fixture-code&next=%2Freset-password');await expect(page).toHaveURL('/reset-password?auth_redirect=1');
});


test('retomada após login Google preserva destino aninhado com segurança',async({page})=>{
  await page.context().addCookies([{name:'sb-127-auth-token-code-verifier',value:'base64-'+Buffer.from(JSON.stringify('fixture-verifier')).toString('base64url'),domain:'127.0.0.1',path:'/'}]);
  await page.goto('/auth/callback?code=fixture-code&next='+encodeURIComponent('/accept-terms?next='+encodeURIComponent('/onboarding?from=resumed')));
  await expect(page).toHaveURL(/\/accept-terms\?next=%2Fonboarding%3Ffrom%3Dresumed/);
});

test('falha do script mostra erro controlado e permite tentar novamente',async({page})=>{
  await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
  await page.goto('/register');await fillRegistration(page);await page.getByRole('checkbox').check();
  await expect(page.getByText('Verificação de segurança indisponível. Tente novamente mais tarde.')).toBeVisible();
  await mockWidget(page);await page.getByRole('button',{name:'Refazer verificação'}).click();
  await expect(page.getByText('Verificação local simulada')).toBeVisible();
});

for (const route of ['/login','/register']) test(`UIUX-02: Google configurado e texto longo em 320 px ${route}`,async({page})=>{
  await page.setViewportSize({width:320,height:568});await page.goto(route);
  const google=page.getByRole('button',{name:'Continuar com Google'});await expect(google).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const box=await google.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(320);
  await page.getByLabel('Email',{exact:true}).fill('endereco-muito-longo-de-teste@example.invalid');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('UIUX-08: erro extenso do Auth permanece legível em 320 px',async({page})=>{
  await page.setViewportSize({width:320,height:568});await localSession(page);await page.goto('/reset-password');
  await page.route('http://127.0.0.1:3199/auth/v1/user',route=>route.request().method()==='PUT'?
    route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({code:'weak_password',msg:'Escolha uma senha mais forte. '.repeat(20)})}):route.continue());
  await page.getByLabel('Nova senha',{exact:true}).fill('123456');await page.getByLabel('Confirmar senha',{exact:true}).fill('123456');
  await page.getByRole('button',{name:'Salvar',exact:true}).click();await expect(page.locator('#reset-password-error')).toContainText('senha mais forte');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('UIUX-08: sessão de recuperação valida confirmação e transmite mínimo aceito ao SDK',async({page,request})=>{
  await request.post('http://127.0.0.1:3199/__fixture/reset',{data:{accepted:true}});await localSession(page);
  await page.goto('/reset-password');
  await page.getByLabel('Nova senha',{exact:true}).fill('12345');await page.getByLabel('Confirmar senha',{exact:true}).fill('12345');
  await page.getByRole('button',{name:'Salvar',exact:true}).click();
  expect(await page.getByLabel('Nova senha',{exact:true}).evaluate((e:HTMLInputElement)=>e.validity.tooShort)).toBe(true);
  await page.getByLabel('Nova senha',{exact:true}).fill('123456');await page.getByLabel('Confirmar senha',{exact:true}).fill('654321');
  await page.getByRole('button',{name:'Salvar',exact:true}).click();
  await expect(page.locator('#reset-password-error')).toContainText('igual');await expect(page.getByLabel('Confirmar senha',{exact:true})).toBeFocused();
  await expect(page.getByLabel('Confirmar senha',{exact:true})).toHaveAttribute('aria-invalid','true');
  expect((await(await request.get('http://127.0.0.1:3199/__fixture/calls')).json()).filter((c:{path:string,method:string})=>c.path==='/auth/v1/user'&&c.method==='PUT')).toHaveLength(0);
  await page.getByLabel('Confirmar senha',{exact:true}).fill('123456');await page.getByRole('button',{name:'Salvar',exact:true}).click();
  await expect(page).toHaveURL('/login');
  const updates=(await(await request.get('http://127.0.0.1:3199/__fixture/calls')).json()).filter((c:{path:string,method:string})=>c.path==='/auth/v1/user'&&c.method==='PUT');
  expect(updates).toHaveLength(1);expect(updates[0].body.password).toBe('123456');
});

for(const destination of ['https://evil.invalid/path','//evil.invalid/path','/%2f%2fevil.invalid','/login?next=/perfil']) {
  test(`UIUX-01: callback recusa destino externo ou circular ${destination}`,async({page,request})=>{
    await request.post('http://127.0.0.1:3199/__fixture/reset',{data:{accepted:true}});
    await page.context().addCookies([{name:'sb-127-auth-token-code-verifier',value:'base64-'+Buffer.from(JSON.stringify('fixture-verifier')).toString('base64url'),domain:'127.0.0.1',path:'/'}]);
    await page.goto('/auth/callback?code=fixture-code&next='+encodeURIComponent(destination));
    await expect(page).toHaveURL('/garagem?auth_redirect=1');
  });
}

for(const [tab,relation] of [['projetos',null],['salvos','car_saves'],['curtidos','car_likes'],['seguindo','user_follows']] as const) {
  test(`PERF-03: perfil autenticado consulta apenas a aba ${tab}`,async({page,request})=>{
    await request.post('http://127.0.0.1:3199/__fixture/reset',{data:{accepted:true}});await localSession(page);
    await page.goto('/test-harness/prelaunch-profile?aba='+tab);await expect(page.getByRole('heading',{name:'Fixture local',exact:true})).toBeVisible();
    const calls=await(await request.get('http://127.0.0.1:3199/__fixture/calls')).json();
    for(const table of ['car_saves','car_likes','user_follows']) {
      const queries=calls.filter((c:{path:string})=>c.path==='/rest/v1/'+table);
      expect(queries.length,table).toBe(table===relation?1:0);
    }
    if(tab==='projetos') {
      let actions=0;page.on('request',r=>{if(r.headers()['next-action'])actions++;});
      const summary=page.locator('summary').filter({hasText:'Ferramenta privada'});
      await summary.click();await expect(page.getByText('Carregando planejador…')).toHaveCount(0,{timeout:60_000});
      await expect(page.getByText('Adicione um carro primeiro para liberar o planejamento privado.',{exact:true})).toBeVisible({timeout:60_000});
      expect(actions).toBe(1);await summary.click();await summary.click();await page.waitForTimeout(200);expect(actions).toBe(1);
    }
  });
}

test('PERF-03: visitante autenticado não consulta abas privadas de outro perfil',async({page,request})=>{
  await request.post('http://127.0.0.1:3199/__fixture/reset',{data:{accepted:true}});await localSession(page);
  await page.goto('/test-harness/prelaunch-profile?aba=salvos&other=1');
  await expect(page.getByRole('heading',{name:'Fixture local',exact:true})).toBeVisible();
  const calls=await(await request.get('http://127.0.0.1:3199/__fixture/calls')).json();
  expect(calls.filter((c:{path:string})=>['car_saves','car_likes','user_follows'].some(t=>c.path==='/rest/v1/'+t))).toHaveLength(0);
  expect(calls.filter((c:{path:string,query:string})=>c.path==='/rest/v1/cars').every((c:{query:string})=>c.query.includes('is_public=eq.true'))).toBe(true);
  await expect(page.locator('summary').filter({hasText:'Ferramenta privada'})).toHaveCount(0);
});

test('busca móvel encontra perfil público por termo parcial e navega para o perfil', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.addInitScript(() => localStorage.setItem('projeto-garagem:cookie-consent', JSON.stringify({
    version: 1, necessary: true, analytics: false, marketing: false, decidedAt: new Date().toISOString(),
  })));
  await page.goto('/explorar', { waitUntil: 'domcontentloaded' });
  const input = page.getByRole('combobox', { name: 'Pesquisar catálogo no celular', exact: true });
  await input.fill('@fixt');
  const option = page.getByRole('listbox').getByRole('option', { name: /Fixture local.*@fixture-local/ });
  await expect(option).toBeVisible();
  await input.press('Escape');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/explorar\?q=%40fixt/);
  const results = page.getByRole('region', { name: 'Usuários encontrados' });
  const profile = results.getByRole('link', { name: /Fixture local.*@fixture-local/ });
  await expect(profile).toHaveAttribute('href', '/perfil/fixture-local');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await profile.click();
  await expect(page).toHaveURL(/\/perfil\/fixture-local$/);
  await expect(page.getByRole('heading', { name: 'Fixture local', exact: true })).toBeVisible();
});

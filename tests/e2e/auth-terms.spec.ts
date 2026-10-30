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
    if(width===390||width===1366) await page.screenshot({path:`docs/auditorias/auth/evidencias/register-${width}.png`,fullPage:true});
  });
}

test('cadastro com aceite envia CAPTCHA nativo e aguarda confirmação',async({page,request})=>{
  await page.goto('/register');await fillRegistration(page);await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'Criar conta',exact:true}).click();
  await expect(page.getByText(/Cadastro iniciado/)).toBeVisible();
  const calls=await (await request.get('http://127.0.0.1:3199/__fixture/calls')).json();
  const signup=calls.filter((call:{path:string})=>call.path==='/auth/v1/signup');
  expect(signup).toHaveLength(1);expect(signup[0].body.gotrue_meta_security.captcha_token).toBe('fixture-valid');
  expect(signup[0].body.data.accepted).toBeUndefined();
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
  await page.goto('/login?next=%2Fonboarding');await page.getByLabel('Email',{exact:true}).fill('fixture@example.invalid');await page.getByLabel('Senha',{exact:true}).fill('fixture-password');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page).toHaveURL(/\/accept-terms\?next=/);
  const calls=await(await request.get('http://127.0.0.1:3199/__fixture/calls')).json();
  expect(calls.find((call:{path:string})=>call.path==='/auth/v1/token').body.gotrue_meta_security.captcha_token).toBe('fixture-valid');
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
  await page.goto('/auth/callback?code=fixture-code&next=%2Fonboarding');await expect(page).toHaveURL('/onboarding');
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
  await page.goto('/accept-terms?next=%2Fonboarding');await expect(page).toHaveURL(/\/login\?next=/);
  expect((await page.request.post('/api/auth/terms',{data:{}})).status()).toBe(401);
});

test('logout disponível antes do aceite',async({page})=>{
  await localSession(page);await page.goto('/accept-terms');await page.getByRole('button',{name:'Sair da conta'}).click();await expect(page).toHaveURL('/login');
  expect((await page.context().cookies()).some(cookie=>cookie.name==='sb-127-auth-token')).toBe(false);
});

test('recuperação não entra em loop de aceite no callback',async({page})=>{
  await page.context().addCookies([{name:'sb-127-auth-token-code-verifier',value:'base64-'+Buffer.from(JSON.stringify('fixture-verifier')).toString('base64url'),domain:'127.0.0.1',path:'/'}]);
  await page.goto('/auth/callback?code=fixture-code&next=%2Freset-password');await expect(page).toHaveURL('/reset-password');
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

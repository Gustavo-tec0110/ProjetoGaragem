/* global window, PerformanceObserver, document, innerWidth, performance */
// Anonymous GET-only smoke. Never logs in, solves CAPTCHA, sends mail or writes data.
import fs from 'node:fs';
import process from 'node:process';
import path from 'node:path';
import { URL } from 'node:url';
import { chromium } from '@playwright/test';

const origin=process.env.GARAGEM_SMOKE_ORIGIN ?? 'https://projetogaragem.com.br';
const url=new URL(origin);
if (!(url.origin==='https://projetogaragem.com.br' || (url.protocol==='http:' && url.hostname==='127.0.0.1')) || url.pathname!=='/' || url.search || url.hash) throw new Error('Expected official origin or loopback');
const output=process.env.GARAGEM_SMOKE_OUT ?? 'artifacts/launch-20261101/smoke-hosted.json';
const browser=await chromium.launch({headless:true});
const rows=[];
const authGates=['OAuth Google real','Turnstile com interação humana','cadastro e email de recuperação','aceite persistido e política de senha','garagem e CRUD com dois usuários autorizados','curtidas, comentários e notificações entre contas de teste','perfil, rankings, Storage privado e revogação CDN','RPCs novas via PostgREST após aplicação'];
try {
  for (const width of [390,1440]) {
    const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
    let blockedWrites=0;
    await context.route('**/*',route=>{
      if (!['GET','HEAD'].includes(route.request().method())) { blockedWrites++; return route.abort(); }
      const target=new URL(route.request().url());
      // No tracking, external shops, OAuth providers or CAPTCHA interaction in read-only mode.
      if (target.origin!==url.origin && !target.hostname.endsWith('.supabase.co')) return route.abort();
      return route.continue();
    });
    await context.addInitScript(()=>{
      window.launchMetrics={lcp:0,cls:0};
      new PerformanceObserver(list=>{for(const e of list.getEntries())window.launchMetrics.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
      new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.launchMetrics.cls+=e.value;}).observe({type:'layout-shift',buffered:true});
    });
    const page=await context.newPage();
    for (const pathname of ['/','/login','/register','/forgot-password','/garagem','/explorar','/rankings','/terms','/privacy','/parcerias/criadores']) {
      const row={width,path:pathname,checks:{},failures:[]};
      try {
        const response=await page.goto(origin+pathname,{waitUntil:'networkidle',timeout:45_000});
        await page.waitForTimeout(500);
        row.status=response.status();row.finalPath=new URL(page.url()).pathname;
        row.checks.http=row.status===200;
        row.checks.heading=await page.locator('main h1').count()>0;
        row.checks.noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
        const headers=response.headers();
        row.checks.nosniff=headers['x-content-type-options']==='nosniff';
        row.checks.frameDenied=headers['x-frame-options']==='DENY';
        row.checks.csp=/object-src 'none'/.test(headers['content-security-policy']??'');
        row.metrics=await page.evaluate(()=>({...window.launchMetrics,fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime}));
        if (pathname==='/garagem') row.checks.anonymousRedirect=row.finalPath==='/login';
        if (pathname==='/register') {
          row.checks.termsCheckbox=await page.getByRole('checkbox').count()>0;
          row.checks.legalLinks=await page.locator('main a[href="/terms"]').count()>0 && await page.locator('main a[href="/privacy"]').count()>0;
        }
        if (['/login','/register'].includes(pathname)) row.googleButtonPresent=await page.getByRole('button',{name:/Google/}).count()>0;
        row.failures=Object.entries(row.checks).filter(([,v])=>!v).map(([k])=>k);
      } catch(error) {row.failures.push(error.name+': '+error.message.split('\n')[0]);}
      rows.push(row);
    }
    rows.push({width,blockedWrites,methodGuard:true});
    await context.close();
  }
} finally {await browser.close();}
const report={createdAt:new Date().toISOString(),origin,mode:'anonymous-read-only-no-load-test',postDeployValidation:false,failures:rows.filter(r=>r.failures?.length),rows,pendingHumanOrAuthorizedTests:authGates};
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
process.stdout.write(JSON.stringify({pages:20,failedPages:report.failures.length,output})+'\n');
if(report.failures.length)process.exitCode=1;

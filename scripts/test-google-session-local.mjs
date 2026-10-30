// Supplemental real Google/GoTrue test. Temporary capture route exists ONLY in /tmp copy.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import https from 'node:https';
import process from 'node:process';
import console from 'node:console';
import { createServerClient } from '@supabase/ssr';
import { localRoot, localState, sqlLocal } from './auth-real-local-utils.mjs';

const { fetch, AbortSignal, URL, Headers, Response } = globalThis;
const origin = 'http://127.0.0.1:3196';
const privateFile = localRoot + '/google-session-qa.private.json';
const captureFile = localRoot + '/google-session-code.private.json';
const route = localRoot + '/app/src/app/qa-oauth-capture/route.ts';
const useHttps = process.argv[2] === 'verify-https';
const callbackOrigin = useHttps ? 'https://127.0.0.1:3197' : origin;
const resultFile = 'docs/auditorias/auth/encerramento-tecnico/google-session-security' + (useHttps ? '-https' : '') + '.json';
async function appRequest(url, options = {}) {
  if (!useHttps) return fetch(url, { ...options, signal: AbortSignal.timeout(30000) });
  assert.equal(new URL(url).origin, callbackOrigin);
  const ca = fs.readFileSync(localRoot + '/https-test/cert.pem');
  return new Promise((resolve, reject) => {
    const req = https.request(url, {ca, rejectUnauthorized:true, headers:options.headers}, res => {
      const headers = new Headers();
      for(let i=0;i<res.rawHeaders.length;i+=2) headers.append(res.rawHeaders[i],res.rawHeaders[i+1]);
      res.resume(); res.on('end', () => resolve(new Response(null,{status:res.statusCode,headers})));
    });
    req.setTimeout(30000, () => req.destroy(new Error('local_https_timeout')));
    req.on('error',reject); req.end();
  });
}
const env = localState();
const makeClient = (jar) => createServerClient(env.API_URL, env.ANON_KEY, {
  cookieOptions: { secure: useHttps },
  cookies: { getAll: () => jar, setAll: cookies => {
    for (const c of cookies) { const old = jar.findIndex(v => v.name === c.name); if(old >= 0) jar.splice(old,1); jar.push(c); }
  } },
  global: { fetch: (url, init) => {
    assert.equal(new URL(String(url)).hostname, '127.0.0.1');
    return fetch(url, { ...init, signal: AbortSignal.timeout(20000) });
  } },
});
const writePrivate = (path, data) => fs.writeFileSync(path, JSON.stringify(data), {mode:0o600, flag:'wx'});

if (process.argv[2] === 'prepare') {
  assert.equal(fs.existsSync(route), false, 'Refuse to overwrite an existing route');
  assert.equal(fs.existsSync(privateFile), false, 'Finish previous test before preparing another');
  fs.mkdirSync(localRoot + '/app/src/app/qa-oauth-capture', {recursive:true});
  fs.writeFileSync(route, `import fs from 'node:fs';
export async function GET(request: Request) {
 const code = new URL(request.url).searchParams.get('code');
 if (!code) return new Response('OAuth code missing', { status:400 });
 fs.writeFileSync(${JSON.stringify(captureFile)}, JSON.stringify({code}), {mode:0o600, flag:'wx'});
 return Response.redirect('${origin}/login?qa=code-captured', 303);
}\n`, {mode:0o600,flag:'wx'});
  const jar = [];
  const sdk = makeClient(jar);
  const {data,error} = await sdk.auth.signInWithOAuth({provider:'google',options:{
    redirectTo:origin+'/qa-oauth-capture',skipBrowserRedirect:true,
  }});
  assert.ifError(error);
  assert.equal(new URL(data.url).origin, new URL(env.API_URL).origin);
  writePrivate(privateFile, {url:data.url,jar});
  console.info('Prepared loopback-only capture; sign in using the existing authorized Google account.');
} else if (['verify','verify-https'].includes(process.argv[2])) {
  const checks = [];
  let sessionClient;
  let accountId;
  const record = (name) => {checks.push({name,result:'passed'}); console.info('PASS '+name);};
  try {
    const {jar} = JSON.parse(fs.readFileSync(privateFile,'utf8'));
    const {code} = JSON.parse(fs.readFileSync(captureFile,'utf8'));
    // Endpoint tests use the actual fresh Google-issued GoTrue code; never persist tokens in evidence.
    const callback = callbackOrigin+'/auth/callback?code='+encodeURIComponent(code)+'&next=%2Fgaragem';
    const noVerifier = await appRequest(callback,{redirect:'manual',signal:AbortSignal.timeout(30000)});
    assert.equal(new URL(noVerifier.headers.get('location')).pathname,'/auth/auth-code-error');
    assert.equal(noVerifier.headers.getSetCookie().some(c=>/^sb-.*-auth-token(?:\.\d+)?=base64-/.test(c)),false);
    record('application refuses fresh Google callback without verifier');
    const wrong = await fetch(env.API_URL+'/auth/v1/token?grant_type=pkce',{
      method:'POST',headers:{apikey:env.ANON_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({auth_code:code,code_verifier:crypto.randomBytes(48).toString('base64url')}),
      signal:AbortSignal.timeout(10000),
    });
    assert.equal(wrong.ok,false);
    const wrongBody=await wrong.json();
    assert.equal(Boolean(wrongBody.access_token),false);
    record('real GoTrue refuses wrong verifier');
    const valid = await appRequest(callback, {redirect:'manual',headers:{Cookie:jar.map(c=>c.name+'='+c.value).join('; ')},signal:AbortSignal.timeout(30000)});
    assert.equal(valid.status,307);
    assert.equal(new URL(valid.headers.get('location')).pathname,'/garagem');
    const setCookies = valid.headers.getSetCookie();
    const authCookies = setCookies.filter(c=>/^sb-.*-auth-token(?:\.\d+)?=base64-/.test(c));
    assert.ok(authCookies.length);
    for (const c of authCookies) {assert.match(c,/; Path=\//i);assert.match(c,/; SameSite=lax/i);if(useHttps) assert.match(c,/; Secure/i); else assert.doesNotMatch(c,/; Secure/i);}
    assert.match(valid.headers.get('cache-control'),/no-store/i);
    record('valid Google code and verifier create session with expected HTTP/HTTPS cookie attributes and no-store');
    const sessionJar = setCookies.map(c=>{const pair=c.split(';')[0];const at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1)};});
    sessionClient=makeClient(sessionJar);
    const current=await sessionClient.auth.getSession();assert.ifError(current.error);assert.ok(current.data.session);
    const verified=await sessionClient.auth.getUser();assert.ifError(verified.error);
    accountId=verified.data.user.id;
    const identityCount=sqlLocal(`select count(*) from auth.identities where user_id='${accountId}' and provider='google'`);
    assert.equal(identityCount,'1');
    assert.equal(sqlLocal(`select count(*) from legal_private.terms_acceptances where user_id='${accountId}' and terms_version='terms-v1' and privacy_version='privacy-v1'`),'1');
    record('existing Google identity and single approved receipt remain intact');
    const replay=await appRequest(callback,{redirect:'manual',headers:{Cookie:jar.map(c=>c.name+'='+c.value).join('; ')},signal:AbortSignal.timeout(30000)});
    assert.equal(new URL(replay.headers.get('location')).pathname,'/auth/auth-code-error');
    record('application refuses replay of consumed Google code');
    assert.ifError((await sessionClient.auth.getUser()).error);
    const before=current.data.session.refresh_token;
    const refreshed=await sessionClient.auth.refreshSession();assert.ifError(refreshed.error);
    assert.equal(refreshed.data.user.id,accountId);assert.notEqual(refreshed.data.session.refresh_token,before);
    assert.ifError((await sessionClient.auth.getUser()).error);
    record('real Google session refresh rotates token and remains authenticated');
    for(const next of ['https://example.invalid','//example.invalid','/\\example.invalid','/%2f%2fexample.invalid','/%5cexample.invalid','/accept-terms?next=https://example.invalid']) {
      const r=await appRequest(callbackOrigin+'/auth/callback?next='+encodeURIComponent(next),{redirect:'manual',signal:AbortSignal.timeout(15000)});
      const dest=new URL(r.headers.get('location'));assert.equal(dest.origin,callbackOrigin);assert.equal(dest.pathname,'/login');assert.equal(dest.searchParams.get('next'),'/garagem');
    }
    record('real application normalizes invalid absolute, protocol-relative, backslash, encoded and nested destinations');
  } catch {
    checks.push({name:'remaining session security verification',result:'failed'});
    process.exitCode=1;
  } finally {
    if(sessionClient) {
      const logout=await sessionClient.auth.signOut();
      const sessions=accountId ? sqlLocal(`select count(*) from auth.sessions where user_id='${accountId}'`) : null;
      checks.push({name:'supplemental session logout',result:!logout.error && sessions==='0'?'passed':'failed'});
      if(logout.error || sessions!=='0') process.exitCode=1;
    }
    fs.writeFileSync(resultFile,JSON.stringify({date:'2026-10-29',mode:'real-google-code-real-gotrue-loopback',productionChanges:false,
      browserAutoRefreshAfterExpiryValidated:false,httpsSecureCookiesValidated:useHttps && checks.every(c=>c.result==='passed'),tlsTrust:useHttps?'explicit-private-test-certificate-with-hostname-verification':null,browserHttpsValidated:false,checks},null,2)+'\n');
    // Remove only artifacts created by this supplemental test; preserve prior fixtures and credentials.
    for(const file of [route,privateFile,captureFile]) if(fs.existsSync(file)) fs.unlinkSync(file);
  }
} else throw new Error('Use prepare, verify or verify-https');

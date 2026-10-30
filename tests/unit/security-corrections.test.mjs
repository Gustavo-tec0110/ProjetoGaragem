/* global Request, Response, Headers, URL, Buffer, AbortSignal, process, console, ReadableStream, Blob, fetch */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(file, imports = {}, extras = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  runInNewContext(source,{exports, require:n=>n in imports?imports[n]:require(n), Request, Response, Headers, URL, Buffer, AbortSignal, process, console, ...extras});
  return exports;
}
const {readBoundedBody} = load('src/lib/security/bounded-body.ts');
const {hasTrustedMutationOrigin} = load('src/lib/security/request-origin.ts');
const urls = load('src/lib/images/project-image-url.ts');
const {ogHeroImage} = load('src/lib/images/og-image.ts',{'./project-image-url':urls});
const key='11111111-1111-4111-8111-111111111111/cars/fixture.webp';

test('body limit counts streamed bytes without Content-Length and cancels excess', async()=>{
  let cancelled=false;
  const stream=new ReadableStream({pull(c){c.enqueue(new Uint8Array(8));},cancel(){cancelled=true;}});
  await assert.rejects(readBoundedBody(new Request('http://local',{method:'POST',body:stream,duplex:'half'}),10),/body_too_large/);
  assert.equal(cancelled,true);
  const body=await readBoundedBody(new Request('http://local',{method:'POST',body:'{"path":"ok"}',headers:{'content-type':'application/json'}}),100);
  assert.equal((await body.json()).path,'ok');
});

test('browser mutation Origin accepts local and rejects cross-origin, null and cross-site',()=>{
  for(const origin of ['http://local','https://evil.invalid','null']) {
    assert.equal(hasTrustedMutationOrigin(new Request('http://local/api',{headers:{origin}})),origin==='http://local');
  }
  assert.equal(hasTrustedMutationOrigin(new Request('http://local/api',{headers:{'sec-fetch-site':'cross-site'}})),false);
});

test('HTTPS cookie options preserve SDK defaults and allow HTTP localhost',()=>{
  for(const [mode,site,secure] of [['production',undefined,true],['development',undefined,false],['development','https://preview.invalid',true]]) {
    const {supabaseCookieOptions}=load('src/lib/supabase/cookie-options.ts',{}, {process:{env:{NODE_ENV:mode,NEXT_PUBLIC_SITE_URL:site}}});
    assert.equal(supabaseCookieOptions().secure,secure);assert.equal(supabaseCookieOptions().httpOnly,undefined);
  }
  for(const protocol of ['http:','https:']) {
    const {supabaseCookieOptions}=load('src/lib/supabase/cookie-options.ts',{}, {window:{location:{protocol}}});
    assert.equal(supabaseCookieOptions().secure,protocol==='https:');
  }
});

test('OG rejects arbitrary, loopback, private, redirect and malformed URLs without download',async()=>{
  let calls=0;
  for(const value of [null,'http://127.0.0.1:3199/a.png','http://169.254.169.254/a.png','http://10.0.0.1/a.png','https://evil.invalid/redirect','//evil.invalid/a.png','file:///etc/passwd','data:image/png;base64,a',`/api/media/project/${key}?redirect=x`]) {
    const hero=await ogHeroImage(value,{authorize:async()=>{calls++;return true;},download:async()=>{calls++;return null;}});
    assert.equal(hero.key,null);assert.match(hero.src,/^data:image\/jpeg;base64,/);
  }
  assert.equal(calls,0);
});

test('OG allows authorized Storage, rejects private objects and rechecks revocation',async()=>{
  const png=await require('sharp')({create:{width:8,height:8,channels:3,background:'red'}}).png().toBuffer();
  let downloads=0;
  const download=async()=>{downloads++;return new Blob([png],{type:'image/png'});};
  const denied=await ogHeroImage(`/api/media/project/${key}`,{authorize:async()=>false,download});
  assert.equal(denied.key,null);assert.equal(downloads,0);
  const allowed=await ogHeroImage(`/api/media/project/${key}`,{authorize:async()=>true,download});
  assert.equal(allowed.key,key);assert.match(allowed.src,/^data:image\/png;base64,/);
  let n=0;
  const revoked=await ogHeroImage(`/api/media/project/${key}`,{authorize:async()=>++n===1,download});
  assert.equal(revoked.key,null);
});

test('real OG handler produces PNG with photo and fallback, denies redirects and private transitions',async()=>{
  const {ImageResponse}=require('next/og');
  const png=await require('sharp')({create:{width:8,height:8,channels:3,background:'red'}}).png().toBuffer();
  let requests=[];let privateAfter=false;let queries=0;
  const car={id:'fixture',owner_id:'owner',main_photo_url:`/api/media/project/${key}`,name:'Fixture Gol',brand:'VW',model:'Gol',year:2000,category:'Projeto',likes_count:1,saves_count:2,comments_count:3};
  const client={from(table){const data=table==='cars'?(privateAfter&&++queries>1?null:car):table==='public_profiles'?{username:'fixture',display_name:'Fixture'}:[];const q={select:()=>q,eq:()=>q,limit:async()=>({data}),maybeSingle:async()=>({data})};return q;},rpc:async()=>({data:true}),storage:{from:()=>({download:async k=>{requests.push(k);return {data:new Blob([png],{type:'image/png'})};}})}};
  let capturedFetch;
  const route=load('src/app/api/og/[slug]/route.tsx',{'@supabase/supabase-js':{createClient:(url,key,options)=>{capturedFetch=options.global.fetch;return client;}},'next/og':{ImageResponse},'@/lib/supabase/env':{isSupabaseConfigured:true,supabaseUrl:'http://127.0.0.1:3199',supabaseAnonKey:'fixture'},'@/lib/images/og-image':{ogHeroImage},'@/lib/images/delivery':{MEDIA_NO_STORE_HEADERS:{'Cache-Control':'no-store'}},'@/lib/security/request-rate-limit':{allowRequest:()=>({ok:true})},'@/lib/security/bounded-body':{readBoundedBody}}, {fetch:async(input,init)=>{assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');throw new Error('redirect blocked');}});
  for(const value of [`/api/media/project/${key}`,'http://127.0.0.1:3199/attack',null]) {
    car.main_photo_url=value;
    const response=await route.GET(new Request('http://untrusted-host.invalid/api/og/fixture'),{params:Promise.resolve({slug:'fixture'})});
    assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/image\/png/);
    const metadata=await require('sharp')(Buffer.from(await response.arrayBuffer())).metadata();assert.equal(metadata.width,1200);assert.equal(metadata.height,630);
  }
  assert.equal(requests.length,1);
  await assert.rejects(capturedFetch('http://127.0.0.1:3199/redirect'),/redirect blocked/);
  privateAfter=true;queries=0;
  assert.equal((await route.GET(new Request('http://local/api/og/fixture'),{params:Promise.resolve({slug:'fixture'})})).status,404);
});

test('public limiter has a real cap on active buckets',()=>{
  const {allowRequest}=load('src/lib/security/request-rate-limit.ts',{'server-only':{}},{Date});
  for(let i=0;i<2000;i++)assert.equal(allowRequest(new Headers({'x-forwarded-for':String(i)}),'cap',1,60000).ok,true);
  assert.equal(allowRequest(new Headers({'x-forwarded-for':'extra'}),'cap',1,60000).ok,false);
  assert.equal(allowRequest(new Headers({'x-forwarded-for':'0'}),'cap',1,60000).ok,false);
});

test('redirect is refused by the real HTTP fetch before reaching its local target',async()=>{
  const http=require('node:http');let target=0;let initial=0;
  const receiver=http.createServer((req,res)=>{
    if(req.url==='/redirect'){initial++;res.writeHead(302,{Location:'/target'});res.end();}
    else {target++;res.end('not allowed');}
  });
  await new Promise(r=>receiver.listen(0,'127.0.0.1',r));
  const address=`http://127.0.0.1:${receiver.address().port}`;
  try {
    let boundedFetch;
    const client={from(){const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:null})};return q;}};
    const route=load('src/app/api/og/[slug]/route.tsx',{'@supabase/supabase-js':{createClient:(u,k,o)=>{boundedFetch=o.global.fetch;return client;}},'next/og':require('next/og'),'@/lib/supabase/env':{isSupabaseConfigured:true,supabaseUrl:address,supabaseAnonKey:'fixture'},'@/lib/images/og-image':{ogHeroImage},'@/lib/images/delivery':{MEDIA_NO_STORE_HEADERS:{}},'@/lib/security/request-rate-limit':{allowRequest:()=>({ok:true})},'@/lib/security/bounded-body':{readBoundedBody}},{fetch});
    await route.GET(new Request(address+'/api/og/fixture'),{params:Promise.resolve({slug:'fixture'})});
    await assert.rejects(boundedFetch(address+'/redirect'));
    assert.equal(initial,1);assert.equal(target,0);
  }finally{await new Promise(r=>receiver.close(r));}
});

test('real Supabase SSR SDK applies Secure to login, refresh and logout cookie writes',async()=>{
  const {supabaseCookieOptions}=load('src/lib/supabase/cookie-options.ts',{}, {process:{env:{NODE_ENV:'production'}}});
  const id='11111111-1111-4111-8111-111111111111';let stored=[];const writes=[];
  const jwt='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:id,exp:2000000000})).toString('base64url')+'.fixture';
  const payload={access_token:jwt,refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,user:{id,aud:'authenticated',email:'fixture@fixture.invalid'}};
  const client=require('@supabase/ssr').createServerClient('http://127.0.0.1:3199','fixture',{
    cookieOptions:supabaseCookieOptions(),cookies:{getAll:()=>stored,setAll:c=>{writes.push(...c);stored=c;}},
    global:{fetch:async input=>String(input).includes('/logout')?new Response(null,{status:204}):Response.json(payload)}
  });
  assert.equal((await client.auth.signInWithPassword({email:'fixture@fixture.invalid',password:'fixture-only'})).error,null);
  assert.ok(writes.length);assert.ok(writes.every(c=>c.options.secure===true&&c.options.httpOnly!==true));
  writes.length=0;assert.equal((await client.auth.refreshSession()).error,null);
  // Refresh may avoid a cookie write if the mocked token is unchanged.
  writes.length=0;assert.equal((await client.auth.signOut()).error,null);
  assert.ok(writes.length);assert.ok(writes.every(c=>c.options.secure===true));
});

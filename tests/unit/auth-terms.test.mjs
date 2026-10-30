/* global Request, Response, URL, URLSearchParams, process */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(file,mocks={},globals={}) {
  const exports={};
  const source=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  runInNewContext(source,{exports,require:n=>n in mocks?mocks[n]:require(n),Request,Response,URL,URLSearchParams,process,...globals});return exports;
}
const captcha=load('src/lib/auth/captcha.ts');
const legal=load('src/lib/auth/legal.ts');
const redirect=load('src/lib/auth/redirect.ts');

test('CAPTCHA configuration fails closed, dummy keys confined to explicit loopback test mode',()=>{
  for(const host of ['localhost','127.0.0.1','[::1]'])assert.equal(captcha.captchaConfiguration('1x00000000000000000000AA','test',host).error,null);
  for(const [key,mode,host] of [[undefined,undefined,'localhost'],['1x00000000000000000000AA','test','projetogaragem.com.br'],['1x00000000000000000000AA','production','localhost'],['real-site-key','test','localhost'],['real-site-key','off','localhost']])
    assert.ok(captcha.captchaConfiguration(key,mode,host).error);
  assert.equal(captcha.captchaConfiguration('real-site-key','production','projetogaragem.com.br').siteKey,'real-site-key');
  for(const key of ['2x00000000000000000000AB','3x00000000000000000000FF','1x00000000000000000000BB'])assert.equal(captcha.captchaConfiguration(key,'test','localhost').error,null);
});
test('missing and oversize CAPTCHA rejected before SDK call',()=>{
  for(const token of [undefined,'','x'.repeat(2049)])assert.throws(()=>captcha.requireCaptchaToken(token));
  assert.equal(captcha.requireCaptchaToken('fixture-token'),'fixture-token');
});
test('consent destinations reject external redirects and loops',()=>{
  const {termsDestination}=load('src/lib/auth/terms-server.ts',{'server-only':{},'@/lib/auth/redirect':redirect});
  for(const path of ['https://evil.invalid','//evil.invalid','/accept-terms','/login','/auth/callback'])assert.equal(termsDestination(path),'/accept-terms?next=%2Fgaragem');
  assert.equal(termsDestination('/accept-terms?next=%2Fonboarding%3Ffrom%3Dfixture'),'/accept-terms?next=%2Fonboarding%3Ffrom%3Dfixture');
  assert.equal(termsDestination('/onboarding?from=fixture'),'/accept-terms?next=%2Fonboarding%3Ffrom%3Dfixture');
});
test('database gate refuses false/null/RPC failure',async()=>{
  const {hasCurrentTerms}=load('src/lib/auth/terms-server.ts',{'server-only':{},'@/lib/auth/redirect':redirect});
  for(const reply of [{data:true,error:null},{data:false,error:null},{data:null,error:null},{data:true,error:{message:'unavailable'}}])
    assert.equal(await hasCurrentTerms({rpc:async()=>reply}),reply.data===true&&!reply.error);
});

test('real AuthProvider SDK contract sends captcha only to supported password/signup APIs',async()=>{
  const calls=[];
  const sdk={auth:{
    signUp:async args=>{calls.push(['signup',args]);return {data:{session:null,user:null},error:null};},
    signInWithPassword:async args=>{calls.push(['password',args]);return {data:{user:null},error:null};},
    signInWithOAuth:async args=>{calls.push(['oauth',args]);return {error:null};},
  }};
  const react={createContext:()=>({Provider:'provider'}),useState:value=>[value,()=>{}],useEffect:()=>{},useCallback:fn=>fn,useMemo:fn=>fn()};
  const {AuthProvider}=load('src/components/AuthProvider.tsx',{'react':react,'@/lib/auth/captcha':captcha,'@/lib/auth/redirect':redirect,
    '@/lib/supabase/browser':{getSupabaseBrowserClient:()=>sdk},'@/lib/supabase/env':{getSiteUrl:()=> 'http://localhost:3198',isSupabaseConfigured:true}},
    {window:{location:{pathname:'/register',search:'?next=%2Fonboarding'}}});
  const auth=AuthProvider({children:null}).props.value;
  await assert.rejects(auth.signUpWithEmail('fixture@example.invalid','fixture','Fixture'),/Conclua/);
  assert.equal(calls.length,0);
  await auth.signUpWithEmail('fixture@example.invalid','fixture','Fixture','signup-token');
  await auth.signInWithEmail('fixture@example.invalid','fixture','login-token');
  await auth.signInWithGoogle();
  assert.equal(calls[0][1].options.captchaToken,'signup-token');assert.equal(calls[1][1].options.captchaToken,'login-token');
  assert.equal(calls[2][1].options.captchaToken,undefined);assert.equal(calls[2][1].provider,'google');
  assert.equal(new URL(calls[2][1].options.redirectTo).searchParams.get('next'),'/onboarding');
});

test('acceptance endpoint derives identity from getUser and calls authenticated RPC with versions only',async()=>{
  const calls=[];
  const supabase={auth:{getUser:async()=>({data:{user:{id:'fixture'}},error:null})},rpc:async(...args)=>{calls.push(args);return{error:null};}};
  const {POST}=load('src/app/api/auth/terms/route.ts',{
    '@/lib/supabase/server':{getSupabaseServerClient:async()=>supabase},
    '@/lib/security/request-origin':load('src/lib/security/request-origin.ts'),
    '@/lib/security/bounded-body':load('src/lib/security/bounded-body.ts'),
    '@/lib/auth/legal':legal,
  });
  const request=data=>new Request('http://localhost/api/auth/terms',{method:'POST',headers:{'content-type':'application/json',origin:'http://localhost'},body:JSON.stringify(data)});
  const valid={accepted:true,termsVersion:legal.TERMS_VERSION,privacyVersion:legal.PRIVACY_VERSION};
  assert.equal((await POST(request(valid))).status,200);
  assert.equal(calls[0][0],'accept_current_terms');assert.deepEqual(Object.keys(calls[0][1]).sort(),['p_privacy_version','p_terms_version']);
  for(const data of [{...valid,user_id:'victim'},{...valid,accepted_at:'2000-01-01'},{...valid,accepted:false},{...valid,termsVersion:'fake'},null])
    assert.equal((await POST(request(data))).status,400);
  assert.equal(calls.length,1);
  supabase.rpc=async()=>({error:{message:'unavailable'}});assert.equal((await POST(request(valid))).status,503);
  supabase.auth.getUser=async()=>({data:{user:null},error:null});assert.equal((await POST(request(valid))).status,401);
});

test('CSRF compares browser Host when Next reconstructs localhost; rejects external and forwarded spoofing',()=>{
  const {hasTrustedMutationOrigin}=load('src/lib/security/request-origin.ts');
  for(const host of ['127.0.0.1:3198','localhost:3198','[::1]:3198'])
    assert.equal(hasTrustedMutationOrigin(new Request('http://localhost:3198/api',{headers:{host,origin:'http://'+host}})),true);
  for(const headers of [
    {host:'127.0.0.1:3198',origin:'https://evil.invalid'},
    {host:'127.0.0.1:3198',origin:'null'},
    {host:'127.0.0.1:3198',origin:'http://127.0.0.1:3198','sec-fetch-site':'cross-site'},
    {host:'127.0.0.1:3198',origin:'http://evil.invalid','x-forwarded-host':'evil.invalid'},
    {host:'evil.invalid@127.0.0.1:3198',origin:'http://127.0.0.1:3198'},
  ])assert.equal(hasTrustedMutationOrigin(new Request('http://localhost:3198/api',{headers})),false);
});

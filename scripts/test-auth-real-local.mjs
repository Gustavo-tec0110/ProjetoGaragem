// Real GoTrue, PostgREST and PostgreSQL on loopback. No mocks, remote DB or production keys.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import console from 'node:console';
import process from 'node:process';
import { URL } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { localState, sqlLocal } from './auth-real-local-utils.mjs';
const env = localState();
const client = key => createClient(env.API_URL, key, { auth:{ persistSession:false,autoRefreshToken:false }, global:{ fetch:(input, init)=>{
  if(new URL(String(input)).hostname!=='127.0.0.1')throw new Error('Non-loopback SDK request refused');
  return globalThis.fetch(input,init);
} } });
const admin=client(env.SERVICE_ROLE_KEY), anon=client(env.ANON_KEY), results=[];
let stage='initialization';
async function check(name, run) { stage=name;await run();results.push({name,result:'passed'});console.info('PASS '+name); }
async function fixture(label) {
  const email=`legal-${label}-${crypto.randomUUID()}@example.invalid`, password='Qa!'+crypto.randomUUID();
  const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(error);
  // Explicit fixture-only bootstrap. This is not a password/CAPTCHA success test.
  const link=await admin.auth.admin.generateLink({type:'magiclink',email});assert.ifError(link.error);
  const sdk=client(env.ANON_KEY);
  const session=await sdk.auth.verifyOtp({token_hash:link.data.properties.hashed_token,type:'magiclink'});assert.ifError(session.error);
  return {id:data.user.id,sdk};
}
try {
  await check('approved versions and frozen hashes exist in real PostgreSQL',()=>{
    assert.equal(sqlLocal("select count(*) from legal_private.document_versions where terms_version='terms-v1' and privacy_version='privacy-v1' and approved and is_current and length(terms_sha256)=64 and length(privacy_sha256)=64"),'1');
  });
  for(const [name,fn] of [
    ['signup without CAPTCHA',()=>anon.auth.signUp({email:`blocked-${crypto.randomUUID()}@example.invalid`,password:'Qa!'+crypto.randomUUID()})],
    ['signup invalid real CAPTCHA',()=>anon.auth.signUp({email:`blocked-${crypto.randomUUID()}@example.invalid`,password:'Qa!'+crypto.randomUUID(),options:{captchaToken:'invalid-real-token'}})],
    ['password login invalid real CAPTCHA',()=>anon.auth.signInWithPassword({email:'absent@example.invalid',password:'fixture',options:{captchaToken:'invalid-real-token'}})],
    ['recovery invalid real CAPTCHA',()=>anon.auth.resetPasswordForEmail('absent@example.invalid',{captchaToken:'invalid-real-token'})],
  ]) await check(name+' is rejected by real Supabase Auth',async()=>{
    const {error}=await fn();assert.ok(error);assert.equal(error.code,'captcha_failed');
  });
  const a=await fixture('erase'),b=await fixture('retain');
  await check('new authenticated account has no acceptance and cannot edit its profile',async()=>{
    const gate=await a.sdk.rpc('has_current_terms_acceptance');assert.ifError(gate.error);assert.equal(gate.data,false);
    const update=await a.sdk.from('profiles').update({bio:'bypass'}).eq('id',a.id).select('id');assert.ifError(update.error);assert.equal(update.data.length,0);
  });
  await check('anonymous cannot record acceptance',async()=>assert.ok((await anon.rpc('accept_current_terms',{p_terms_version:'terms-v1',p_privacy_version:'privacy-v1'})).error));
  await check('invented version cannot be recorded',async()=>assert.ok((await a.sdk.rpc('accept_current_terms',{p_terms_version:'invented',p_privacy_version:'privacy-v1'})).error));
  for(const fixtureUser of [a,b]) {
    const acceptance=await fixtureUser.sdk.rpc('accept_current_terms',{p_terms_version:'terms-v1',p_privacy_version:'privacy-v1'});assert.ifError(acceptance.error);
  }
  await check('real authenticated RPC records correct identity versions and server time',async()=>{
    const row=JSON.parse(sqlLocal(`select row_to_json(a) from legal_private.terms_acceptances a where user_id='${a.id}'`));
    assert.equal(row.user_id,a.id);assert.equal(row.terms_version,'terms-v1');assert.equal(row.privacy_version,'privacy-v1');
    assert.ok(Math.abs(Date.now()-new Date(row.accepted_at).getTime())<60000);assert.equal(row.context,'authenticated');
    assert.equal((await a.sdk.rpc('has_current_terms_acceptance')).data,true);
  });
  await check('repeat acceptance is idempotent',async()=>{
    const before=sqlLocal(`select accepted_at from legal_private.terms_acceptances where user_id='${a.id}'`);
    assert.ifError((await a.sdk.rpc('accept_current_terms',{p_terms_version:'terms-v1',p_privacy_version:'privacy-v1'})).error);
    assert.equal(sqlLocal(`select accepted_at from legal_private.terms_acceptances where user_id='${a.id}'`),before);
  });
  await check('private history is excluded from the real Data API',async()=>{
    const result=await a.sdk.schema('legal_private').from('terms_acceptances').select('*');assert.ok(result.error);
  });
  await check('clients cannot mutate retained history or invoke expunge',()=>{
    for(const sql of ["update legal_private.terms_acceptances set retention_basis='legal_claims'","delete from legal_private.terms_acceptances","select legal_private.purge_expired_terms_acceptances(1)"])
      assert.throws(()=>sqlLocal('set role authenticated; '+sql));
  });
  await check('actual Auth deletion succeeds and erases unjustified history',async()=>{
    assert.ifError((await admin.auth.admin.deleteUser(a.id)).error);
    assert.equal(sqlLocal(`select count(*) from auth.users where id='${a.id}'`),'0');
    assert.equal(sqlLocal(`select count(*) from legal_private.terms_acceptances where user_id='${a.id}'`),'0');
  });
  await check('stale session cannot bypass the terms gate after identity deletion',async()=>{
    const gate=await a.sdk.rpc('has_current_terms_acceptance');assert.ifError(gate.error);assert.equal(gate.data,false);
  });
  const retainedId=sqlLocal(`select id from legal_private.terms_acceptances where user_id='${b.id}'`);
  // Fixture-only justified basis, no assertion of legal applicability to real users.
  sqlLocal(`update legal_private.terms_acceptances set retention_basis='legal_claims' where user_id='${b.id}'`);
  await check('actual Auth deletion detaches justified history without blocking identity removal',async()=>{
    assert.ifError((await admin.auth.admin.deleteUser(b.id)).error);
    const row=JSON.parse(sqlLocal(`select row_to_json(a) from legal_private.terms_acceptances a where id='${retainedId}'`));
    assert.equal(row.user_id,null);assert.ok(row.account_closed_at);assert.ok(row.retention_until);assert.equal(row.retention_basis,'legal_claims');
    assert.equal(sqlLocal(`select retention_until=account_closed_at+interval '5 years' from legal_private.terms_acceptances where id='${retainedId}'`),'t');
    assert.equal(sqlLocal(`select count(*) from auth.users where id='${b.id}'`),'0');
  });
  await check('ordinary retention cannot exceed five years or use an undocumented indefinite hold',()=>{
    assert.throws(()=>sqlLocal(`update legal_private.terms_acceptances set retention_until=account_closed_at+interval '6 years' where id='${retainedId}'`));
    assert.throws(()=>sqlLocal(`update legal_private.terms_acceptances set legal_hold_until='infinity',legal_hold_reason='fixture' where id='${retainedId}'`));
  });
  await check('unexpired justified history is preserved by expunge',()=>assert.equal(sqlLocal('select legal_private.purge_expired_terms_acceptances()'),'0'));
  sqlLocal(`update legal_private.terms_acceptances set accepted_at=now()-interval '6 years 1 day',account_closed_at=now()-interval '6 years',retention_until=now()-interval '1 year',legal_hold_until=now()+interval '1 day',legal_hold_reason='fixture-legal-hold' where id='${retainedId}'`);
  await check('documented finite exception preserves an expired ordinary record',()=>assert.equal(sqlLocal('select legal_private.purge_expired_terms_acceptances()'),'0'));
  sqlLocal(`update legal_private.terms_acceptances set legal_hold_until=null,legal_hold_reason=null where id='${retainedId}'`);
  await check('authorized expunge permanently removes an expired detached record',()=>{
    assert.equal(sqlLocal('set role service_role; select legal_private.purge_expired_terms_acceptances(1000)'),'1');
    assert.equal(sqlLocal(`select count(*) from legal_private.terms_acceptances where id='${retainedId}'`),'0');
  });
  await check('expunge validates batch bounds',()=>assert.throws(()=>sqlLocal('select legal_private.purge_expired_terms_acceptances(10001)')));
} catch(error) {
  results.push({name:stage,result:'failed',errorCode:error.code??error.name,message:String(error.message).slice(0,180)});
  console.error('FAIL '+stage);process.exitCode=1;
} finally {
  fs.mkdirSync('docs/auditorias/auth/finalizacao',{recursive:true});
  fs.writeFileSync('docs/auditorias/auth/finalizacao/supabase-real-local.json',JSON.stringify({
    mode:'real-native-supabase-postgresql-gotrue-postgrest',cloudflareVerification:'real-local-widget-secret',
    productionChanges:false,googleOAuthRealValidated:false,passwordSuccessAndSignupSuccessValidated:false,
    fixtureSessions:'local-admin-generated-magiclink-verified-by-real-Auth',results,
  },null,2)+'\n');
  console.info(results.filter(r=>r.result==='passed').length+' verificações reais locais aprovadas.');
}

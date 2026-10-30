/* global console */
// Isolated PostgreSQL/WASM fixtures; no network, Auth accounts or remote writes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { unaccent } from '@electric-sql/pglite/contrib/unaccent';
const db = new PGlite({ extensions: { citext, pgcrypto, pg_trgm, unaccent } });
let checks = 0;
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage; create schema extensions;
    create extension pgcrypto with schema extensions;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table storage.buckets(id text primary key,name text,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,owner uuid,owner_id text,
      metadata jsonb default '{}',created_at timestamptz default now(),updated_at timestamptz default now(),primary key(bucket_id,name));
    create function storage.foldername(text) returns text[] language sql immutable as
      $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
    create function storage.extension(text) returns text language sql immutable as $$ select reverse(split_part(reverse($1),'.',1)) $$;
    alter table storage.objects enable row level security;
    grant usage on schema public,auth,storage,extensions to anon,authenticated,service_role;
    grant all on all tables in schema storage to service_role;
    grant select,insert,update,delete on storage.objects to anon,authenticated;
  `);
  const migration = 'migrations/20261029010000_require_terms_acceptance.sql';
  const paths = readFileSync('supabase/bootstrap.sql','utf8').split('\n').filter(l=>l.startsWith('\\ir ')).map(l=>l.slice(4));
  for (const path of paths.filter(p=>p!==migration&&!p.includes('approved_legal_versions_and_account_closure'))) await db.exec(readFileSync('supabase/'+path,'utf8'));
  const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222';
  const C='33333333-3333-4333-8333-333333333333';
  await db.query("insert into auth.users(id,email) values($1,'old@fixture.invalid'),($2,'new@fixture.invalid')",[A,B]);
  await db.query("insert into cars(id,owner_id,slug,name,brand,model,year,category,is_public) values($1,$2,'legal-fixture','Fixture','VW','Gol',2000,'Hatch',false)",[C,A]);
  await db.exec(readFileSync('supabase/'+migration,'utf8'));
  async function role(r,u,sql,args=[]) {
    await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[u??'']);
    await db.exec('set role '+r); return db.query(sql,args);
  }
  async function check(name,run) { await run(); checks++; console.info('PASS '+name); }
  const denied = (r,u,sql,args=[])=>assert.rejects(role(r,u,sql,args),e=>e.code==='42501');
  const accept = (user)=>role('authenticated',user,"select accept_current_terms('pending-approval-v1','pending-approval-v1')");
  await check('existing account gets no fabricated acceptance',async()=>assert.equal((await role('authenticated',A,'select has_current_terms_acceptance() as ok')).rows[0].ok,false));
  await check('new account cannot read private cars',async()=>assert.equal((await role('authenticated',B,'select * from cars where id=$1',[C])).rows.length,0));
  await check('owner without acceptance cannot read own private cars',async()=>assert.equal((await role('authenticated',A,'select * from cars where id=$1',[C])).rows.length,0));
  await check('pending approval refuses acceptance',()=>assert.rejects(accept(A),/documents_not_approved_or_current/));
  await check('anonymous cannot accept',()=>denied('anon',null,"select accept_current_terms('pending-approval-v1','pending-approval-v1')"));
  await check('authenticated role with no identity cannot accept',()=>denied('authenticated',null,"select accept_current_terms('pending-approval-v1','pending-approval-v1')"));
  await check('metadata flag cannot unlock',async()=>{
    await db.exec('reset role');await db.query("update auth.users set raw_user_meta_data='{"+ '"accepted":true' +"}' where id=$1",[A]);
    assert.equal((await role('authenticated',A,'select has_current_terms_acceptance() as ok')).rows[0].ok,false);
  });
  await check('direct profile UPDATE blocked',async()=>assert.equal((await role('authenticated',A,"update profiles set bio='bypass' where id=$1 returning id",[A])).rows.length,0));
  await check('direct insert blocked',()=>denied('authenticated',A,'insert into car_likes(car_id,user_id) values($1,$2)',[C,A]));
  await check('SECURITY DEFINER upload reservation blocked',()=>denied('authenticated',A,'select reserve_storage_upload(100)'));
  await check('SECURITY DEFINER image cleanup blocked',()=>denied('authenticated',A,'select claim_unreferenced_project_image($1)',[A+'/cars/fixture.webp']));
  await check('auth provisioning can still create a profile without acceptance',async()=>{
    await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)");
    await db.query("insert into auth.users(id,email) values('99999999-9999-4999-8999-999999999999','oauth@fixture.invalid')");
    assert.equal((await db.query("select count(*)::int as n from profiles where id='99999999-9999-4999-8999-999999999999'")).rows[0].n,1);
  });
  // Approval ONLY in this ephemeral WASM database, never migration/default config.
  await db.exec('reset role');await db.exec('update legal_private.document_versions set approved=true');
  await check('invented or stale document versions rejected',()=>assert.rejects(role('authenticated',A,"select accept_current_terms('invented','pending-approval-v1')"),/documents_not_approved_or_current/));
  const before = Date.now();
  await check('authenticated acceptance opens current gate',async()=>{await accept(A);assert.equal((await role('authenticated',A,'select has_current_terms_acceptance() as ok')).rows[0].ok,true);});
  const first = (await role('authenticated',A,'select * from legal_private.terms_acceptances')).rows[0];
  await check('identity version timestamp context assigned on server',async()=>{
    assert.equal(first.user_id,A);assert.equal(first.terms_version,'pending-approval-v1');assert.equal(first.privacy_version,'pending-approval-v1');
    assert.equal(first.context,'authenticated');assert.ok(new Date(first.accepted_at).getTime()>=before-1000);
  });
  await check('repeated acceptance preserves timestamp and unique history',async()=>{await accept(A);const rows=(await role('authenticated',A,'select * from legal_private.terms_acceptances')).rows;assert.equal(rows.length,1);assert.equal(String(rows[0].accepted_at),String(first.accepted_at));});
  await check('another user cannot read this history',async()=>assert.equal((await role('authenticated',B,'select * from legal_private.terms_acceptances')).rows.length,0));
  for(const [verb,sql] of [
    ['insert',"insert into legal_private.terms_acceptances(user_id,terms_version,privacy_version) values($1,'pending-approval-v1','pending-approval-v1')"],
    ['update',"update legal_private.terms_acceptances set accepted_at='2000-01-01' where user_id=$1"],
    ['delete','delete from legal_private.terms_acceptances where user_id=$1'],
  ]) await check('no direct history '+verb,()=>denied('authenticated',B,sql,[A]));
  await check('own history also cannot be updated',()=>denied('authenticated',A,"update legal_private.terms_acceptances set accepted_at='2000-01-01' where user_id=$1",[A]));
  await check('own history also cannot be deleted',()=>denied('authenticated',A,'delete from legal_private.terms_acceptances where user_id=$1',[A]));
  await check('document approval cannot be forged',()=>denied('authenticated',B,'update legal_private.document_versions set approved=true'));
  await check('accepted owner can read private project',async()=>assert.equal((await role('authenticated',A,'select id from cars where id=$1',[C])).rows.length,1));
  await check('accepted owner can edit profile',async()=>assert.equal((await role('authenticated',A,"update profiles set bio='accepted fixture' where id=$1 returning id",[A])).rows.length,1));
  await check('acceptance is scoped to the current user',async()=>assert.equal((await role('authenticated',B,'select has_current_terms_acceptance() as ok')).rows[0].ok,false));
  await check('private owner media denied before acceptance',async()=>{
    await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)");
    await db.query("insert into storage.objects(bucket_id,name) values('project-images',$1)",[B+'/cars/fixture.webp']);
    assert.equal((await role('authenticated',B,'select can_read_project_image($1) as ok',[B+'/cars/fixture.webp'])).rows[0].ok,false);
  });
  await check('atomic project RPC cannot bypass pending acceptance',()=>denied('authenticated',B,"select * from save_car_project_atomic($1,'{}','[]','[]','[]','[]')",[C]));
  await check('changing current version requires fresh acceptance without deleting history',async()=>{
    await db.exec('reset role');await db.exec("update legal_private.document_versions set is_current=false; insert into legal_private.document_versions values('future-fixture','future-fixture',true,true)");
    assert.equal((await role('authenticated',A,'select has_current_terms_acceptance() as ok')).rows[0].ok,false);
    assert.equal((await role('authenticated',A,'select * from legal_private.terms_acceptances')).rows.length,1);
  });
  console.info(`${checks} SQL checks passed (isolated PostgreSQL/WASM).`);
} finally { await db.close(); }

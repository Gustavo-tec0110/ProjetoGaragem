/* global console */
// Disposable PostgreSQL/WASM only. No environment credentials or remote connections.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const read=p=>readFileSync(p,'utf8');
const migration=read('supabase/migrations/20261027120000_expand_modification_catalog.sql');
const defs=JSON.parse(read('src/lib/modifications/catalog-definitions.json'));
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function public.enforce_action_rate_limit(text) returns boolean language sql as $$select true$$;
 create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;
 create table public.cars(id uuid primary key,owner_id uuid,is_public boolean);
 grant usage on schema public,auth to anon,authenticated;
 grant select on public.cars to anon,authenticated;`);
 await db.exec(read('supabase/migrations/20260929120000_add_modification_catalog.sql'));
 const before=(await db.query('select * from public.modification_catalog order by slug')).rows;
 const categories=(await db.query('select * from public.modification_categories order by slug')).rows;
 const policies=(await db.query('select * from pg_policies order by policyname')).rows;
 const acl=(await db.query("select relname,relacl,relrowsecurity from pg_class where relname in ('modification_catalog','modification_categories','project_modifications') order by relname")).rows;
 assert.equal(before.length,79);
 await db.exec(`insert into public.cars values('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111',true);
 insert into public.project_modifications(car_id,catalog_id,note,paid_amount) select '33333333-3333-4333-8333-333333333333',id,'private legacy note',12345 from public.modification_catalog where slug='suspensao-rosca';
 update public.modification_catalog set name='Radiador escolhido manualmente',short_description='Descrição curada',default_image_path='/curated/radiator.webp',estimated_price_min=200,compatibility_type='specific',compatibility_notes='Aplicação específica' where slug='radiador';
 insert into public.modification_catalog(category_id,slug,name,is_active,compatibility_type) select id,'wastegate','Peça pré-existente',false,'specific' from public.modification_categories where slug='motor-performance';`);
 const legacy=(await db.query('select * from public.project_modifications')).rows;
 const custom=(await db.query("select * from public.modification_catalog where slug in ('radiador','wastegate') order by slug")).rows;
 await db.exec(migration);
 const after=(await db.query('select * from public.modification_catalog order by slug')).rows;
 assert.equal(after.length,defs.length);
 assert.equal(new Set(after.map(x=>x.slug)).size,defs.length);
 for(const old of before){
  const current=after.find(x=>x.slug===old.slug);
  for(const key of ['id','slug','category_id','is_active','created_at'])assert.deepEqual(current[key],old[key],`${old.slug}.${key} preserved`);
 }
 assert.deepEqual((await db.query('select * from public.project_modifications')).rows,legacy);
 for(const row of custom){
  const current=after.find(x=>x.slug===row.slug);
  for(const key of ['id','name','short_description','default_image_path','estimated_price_min','compatibility_type','compatibility_notes','is_active'])assert.deepEqual(current[key],row[key],`custom ${row.slug}.${key}`);
 }
 assert.deepEqual((await db.query('select * from public.modification_categories order by slug')).rows,categories);
 assert.deepEqual((await db.query('select * from pg_policies order by policyname')).rows,policies);
 assert.deepEqual((await db.query("select relname,relacl,relrowsecurity from pg_class where relname in ('modification_catalog','modification_categories','project_modifications') order by relname")).rows,acl);
 assert.equal(after.find(x=>x.slug==='suspensao-ar').compatibility_type,'adaptable');
 assert.ok(after.find(x=>x.slug==='suspensao-ar').compatibility_notes);
 await db.exec(migration);
 assert.deepEqual((await db.query('select * from public.modification_catalog order by slug')).rows,after,'idempotent including updated_at');
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",['11111111-1111-4111-8111-111111111111']);
 await db.exec('set role authenticated');
 const created=(await db.query("insert into public.project_modifications(car_id,catalog_id,status,note) select '33333333-3333-4333-8333-333333333333',id,'planned','Isolated new-part fixture' from public.modification_catalog where slug='suspensao-ar' returning id,catalog_id")).rows;
 assert.equal(created.length,1,'owner can attach a newly added component');
 assert.equal(created[0].catalog_id,after.find(x=>x.slug==='suspensao-ar').id,'new reference uses the persisted catalog UUID');
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",['22222222-2222-4222-8222-222222222222']);
 assert.equal((await db.query("update public.project_modifications set note='attack' where id=$1 returning id",[created[0].id])).rows.length,0,'another user cannot edit the new reference');
 await assert.rejects(db.exec("insert into public.project_modifications(car_id,catalog_id) select '33333333-3333-4333-8333-333333333333',id from public.modification_catalog where slug='suspensao-ar'"),e=>e.code==='42501');
 await db.exec('reset role');
 await db.exec('set role anon');
 assert.equal((await db.query('select count(*)::int as n from public.modification_catalog')).rows[0].n,defs.length-1,'anonymous reads active rows');
 await assert.rejects(db.exec("update public.modification_catalog set name='attack'"),e=>e.code==='42501');
 await db.exec('reset role;set role authenticated');
 await assert.rejects(db.exec("insert into public.modification_catalog(category_id,slug,name) select id,'attack','attack' from public.modification_categories limit 1"),e=>e.code==='42501');
 await db.exec("reset role;update public.modification_categories set is_active=false where slug='som'");
 await assert.rejects(db.exec(migration),/ten existing active categories/);
 await db.exec('rollback');
 assert.deepEqual((await db.query('select * from public.modification_catalog order by slug')).rows,after,'failed preflight is atomic');
 console.info(JSON.stringify({mode:'isolated-catalog-migration',original:before.length,total:after.length,new:after.length-before.length,categories:categories.length,checks:['legacy IDs/FKs/private data','owner attaches new persisted UUID; other user denied','custom overrides/inactive conflicts','idempotence','atomic preflight','category integrity','RLS and ACL unchanged','anonymous read and denied writes'],result:'passed',remoteWrites:0}));
}finally{await db.close();}

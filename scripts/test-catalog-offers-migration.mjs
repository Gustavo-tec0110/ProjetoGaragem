/* global console */
// Local disposable PostgreSQL/WASM. Does not read environment credentials.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {exportOffersSql} from './manage-catalog-offers.mjs';
const db=new PGlite();
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;
    create table public.modification_categories(id uuid primary key,is_active boolean);
    create table public.modification_catalog(id uuid primary key,category_id uuid references public.modification_categories(id),is_active boolean,slug text unique);
    grant usage on schema public to anon,authenticated,service_role;
    grant select on public.modification_catalog,public.modification_categories to anon,authenticated,service_role;
    insert into public.modification_categories values ('11111111-1111-4111-8111-111111111111',true);
    insert into public.modification_catalog values ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111',true,'turbo');`);
  const before=(await db.query('select * from modification_catalog')).rows;
  await db.exec(readFileSync('supabase/migrations/20261027210000_modification_offers.sql','utf8'));
  assert.deepEqual((await db.query('select * from modification_catalog')).rows,before);
  assert.equal((await db.query('select * from modification_offers')).rows.length,0,'no demo seeds');
  const insert=`insert into modification_offers(catalog_id,store,destination_url,is_active) values ('22222222-2222-4222-8222-222222222222','amazon',$1,$2) returning id`;
  for (const url of ['javascript:alert(1)','http://amazon.com.br/p','https://amazon.com.br.evil.test/p','https://evil@amazon.com.br/p','https://amazon.com.br:444/p','https://amazon.com.br\\@evil.test/p','https://amazon.com.br/\ntest']) await assert.rejects(db.query(insert,[url,true]),e=>e.code==='23514',url);
  await db.exec('set role service_role');
  const id=(await db.query(insert,['https://amazon.com.br/test',true])).rows[0].id;
  await db.query(insert,['https://amazon.com.br/inactive',false]);
  await db.query("update modification_offers set destination_url='https://amzn.to/test' where id=$1",[id]);
  await db.exec('reset role');
  for(const role of ['anon','authenticated']) {
    await db.exec(`set role ${role}`);
    assert.equal((await db.query('select * from modification_offers')).rows.length,1);
    await assert.rejects(db.query(insert,['https://amazon.com.br/attack',true]),e=>e.code==='42501');
    await assert.rejects(db.exec("update modification_offers set is_active=false"),e=>e.code==='42501');
    await assert.rejects(db.exec('delete from modification_offers'),e=>e.code==='42501');
    await db.exec('reset role');
  }
  for (const table of ['modification_catalog','modification_categories']) {
    await db.exec(`update ${table} set is_active=false; set role anon`);
    assert.equal((await db.query('select * from modification_offers')).rows.length,0,`inactive ${table} hidden`);
    await db.exec(`reset role; update ${table} set is_active=true`);
  }
  await assert.rejects(db.exec("update modification_offers set price=100,price_checked_at=null"),e=>e.code==='23514');
  await db.exec('set role service_role');
  await db.query('update modification_offers set is_active=false where id=$1',[id]);
  await db.query('delete from modification_offers where id=$1',[id]);
  await db.exec('reset role');
  const oldOffers=(await db.query('select * from modification_offers order by id')).rows;
  await db.exec(readFileSync('supabase/migrations/20261028010000_reviewed_catalog_offers.sql','utf8'));
  assert.equal((await db.query('select * from modification_offers')).rows.length,oldOffers.length,'no existing offers deleted');
  assert.deepEqual((await db.query('select * from modification_catalog')).rows,before,'catalog unchanged');
  const reviewed={id:'33333333-3333-4333-8333-333333333333',catalog_id:'',catalog_slug:'turbo',store:'magalu',
    destination_url:'https://www.magazinevoce.com.br/test-fixture',product_url:'https://www.magazineluiza.com.br/test-fixture',
    product_name:"Fixture d'oferta",compatibility_notes:"Fixture: '); drop table modification_catalog; --",verified_at:'2026-01-01T12:00:00Z',
    source:'manual',source_product_id:null,price:null,price_checked_at:null,is_active:true,is_affiliate:true};
  await db.exec('set role service_role');
  await db.exec(exportOffersSql([reviewed]));
  let saved=(await db.query('select * from modification_offers where id=$1',[reviewed.id])).rows[0];
  assert.equal(saved.product_name,reviewed.product_name);
  assert.equal(saved.compatibility_notes,reviewed.compatibility_notes);
  assert.equal(saved.catalog_id,'22222222-2222-4222-8222-222222222222');
  await db.exec(exportOffersSql([{...reviewed,product_name:'Atualizada',is_active:false}]));
  saved=(await db.query('select * from modification_offers where id=$1',[reviewed.id])).rows[0];
  assert.equal(saved.product_name,'Atualizada'); assert.equal(saved.is_active,false);
  await db.exec('reset role; set role anon');
  assert.equal((await db.query('select * from modification_offers where id=$1',[reviewed.id])).rows.length,0);
  await assert.rejects(db.query(insert,['https://amazon.com.br/attack',true]),e=>e.code==='42501');
  await db.exec('reset role; set role service_role');
  await assert.rejects(db.query('update modification_offers set product_url=$1 where id=$2',['https://evil.test/a',reviewed.id]),e=>e.code==='23514');
  await assert.rejects(db.query('update modification_offers set source=$1 where id=$2',['scraped',reviewed.id]),e=>e.code==='23514');
  await db.exec('reset role');
  assert.deepEqual((await db.query('select * from modification_catalog')).rows,before);
  console.info('PASS: both offers migrations; preserved data; safe URLs; reviewed metadata; generated SQL create/update/deactivate; slug-to-FK binding; injection quoting; visitor writes denied; zero remote writes');

} finally { await db.close(); }

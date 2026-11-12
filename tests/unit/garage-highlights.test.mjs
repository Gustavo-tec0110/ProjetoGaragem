import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('destaques: RLS, privacidade e projeção pública em banco isolado', async () => {
 const db = new PGlite();
 try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create table public.cars(id uuid primary key, owner_id uuid, slug text, name text, is_public boolean);
  create table public.modification_catalog(id uuid primary key, name text, default_image_path text);
  create table public.project_modifications(id uuid primary key, car_id uuid references public.cars, catalog_id uuid references public.modification_catalog not null, status text, paid_amount integer, show_paid_amount boolean, public_description text, project_photo_url text, installed_at date, created_at timestamptz default now(), updated_at timestamptz default now());
  alter table public.project_modifications enable row level security;
  create policy owner on public.project_modifications for all to authenticated using (exists(select 1 from public.cars c where c.id=car_id and c.owner_id=auth.uid())) with check (exists(select 1 from public.cars c where c.id=car_id and c.owner_id=auth.uid()));
  grant usage on schema public,auth to anon,authenticated; grant select on public.cars to authenticated; grant select,insert,update,delete on public.project_modifications to authenticated;
  create function public.list_public_project_modifications(uuid) returns integer language sql as $$ select 1 $$;
  insert into public.cars values ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','publico','Público',true),('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','privado','Privado',false);`);
  await db.exec(readFileSync('supabase/migrations/20261112121647_special_parts.sql','utf8'));
  await db.exec(`select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false); set role authenticated;
  insert into public.project_modifications(id,car_id,custom_name,is_featured,status,show_paid_amount) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','33333333-3333-4333-8333-333333333333','Farol',true,'installed',false),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','44444444-4444-4444-8444-444444444444','Rodas',true,'planned',false);`);
  assert.equal((await db.query("select * from public.list_garage_highlights('11111111-1111-4111-8111-111111111111')")).rows.length,2);
  await db.exec("select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false)");
  assert.equal((await db.query("update public.project_modifications set is_featured=false returning id")).rows.length,0);
  await assert.rejects(db.exec("insert into public.project_modifications(id,car_id,custom_name,status) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','33333333-3333-4333-8333-333333333333','Ataque','installed')"), e => e.code === '42501');
  assert.equal((await db.query("select * from public.list_garage_highlights('11111111-1111-4111-8111-111111111111')")).rows.length,1);
  assert.equal((await db.query("select * from public.list_public_project_modifications('44444444-4444-4444-8444-444444444444')")).rows.length,0);
  await db.exec("select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false); update public.project_modifications set is_featured=false where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'");
  assert.equal((await db.query("select * from public.list_garage_highlights('11111111-1111-4111-8111-111111111111')")).rows.length,1);
 } finally { await db.close(); }
});

/* global console */
// Replay the documented bootstrap in PostgreSQL/WASM. Auth and Storage are
// fixtures; this does not contact Supabase or validate its HTTP/CDN layer.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";

const db = new PGlite({ extensions: { citext, pgcrypto, pg_trgm, unaccent } });
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage; create schema extensions;
    create extension pgcrypto with schema extensions;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table storage.buckets(id text primary key,name text,public boolean not null default false,
      file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,
      owner uuid,owner_id text,metadata jsonb default '{}',created_at timestamptz default now(),
      updated_at timestamptz default now(),primary key(bucket_id,name));
    create function storage.foldername(text) returns text[] language sql immutable as
      $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
    create function storage.extension(text) returns text language sql immutable as
      $$ select reverse(split_part(reverse($1),'.',1)) $$;
    alter table storage.objects enable row level security;
    grant usage on schema public,auth,storage,extensions to anon,authenticated,service_role;
    grant all on all tables in schema storage to service_role;
    grant select,insert,update,delete on storage.objects to anon,authenticated;
  `);
  const paths = readFileSync("supabase/bootstrap.sql", "utf8").split("\n")
    .filter(line => line.startsWith("\\ir ")).map(line => line.slice(4));
  for (const path of paths) {
    if (path.endsWith('20261028120000_protect_derived_counters.sql')) {
      // Reproduce metadata differences observed remotely. No production data.
      await db.exec(`drop function public.refresh_profile_cars_count(uuid) cascade;
        drop table public.parts_catalog,public.part_vehicle_compatibility,public.part_dependencies,
          public.project_parts,public.build_budgets,public.part_alert_rules,public.part_recommendation_rules cascade;`);
    }
    await db.exec(readFileSync('supabase/' + path, 'utf8'));
  }
  console.info('PASS pending migration chain with absent hosted legacy tables/helper');
  const query = async sql => {
    const rows = (await db.query(sql)).rows;
    return Object.values(rows[0])[0];
  };
  const { runRetention } = await import('./purge-terms-retention.mjs');
  const options = { apply: false, limit: 1, maxBatches: 10 };
  await db.exec(`insert into auth.users(id,email) values
    ('11111111-1111-4111-8111-111111111111','retention@fixture.invalid');
    select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
    set role authenticated;
    select public.accept_current_terms('terms-v1','privacy-v1');
    reset role;
    select set_config('request.jwt.claim.sub','',false);`);
  const active = (await db.query('select id from legal_private.terms_acceptances')).rows[0].id;
  const receipt = `insert into legal_private.terms_acceptances
    (terms_version,privacy_version,accepted_at,account_closed_at,retention_until,retention_basis,legal_hold_until,legal_hold_reason)
    values ('terms-v1','privacy-v1',now()-interval '7 years',now()-interval '6 years',now()-interval '1 year','legal_claims',`;
  await db.exec(receipt + `null,null),
    ('terms-v1','privacy-v1',now()-interval '7 years',now()-interval '6 years',now()-interval '1 year','legal_claims',now()-interval '1 day','expired fixture'),
    ('terms-v1','privacy-v1',now()-interval '7 years',now()-interval '6 years',now()-interval '1 year','legal_claims',now()+interval '1 day','finite fixture');`);
  const dry = await runRetention(options, query);
  assert.equal(dry.eligible, 2); assert.equal(dry.held, 1); assert.equal(dry.expiredHolds, 1); assert.equal(dry.deleted, 0);
  assert.equal((await db.query('select count(*)::int n from legal_private.terms_acceptances')).rows[0].n, 4);
  console.info('PASS SQL inspection is non-mutating and counts expired exceptions');
  const result = await runRetention({ ...options, apply: true }, query);
  assert.equal(result.deleted, 2); assert.equal(result.complete, true);
  assert.equal(result.held, 1);
  assert.equal((await db.query('select count(*)::int n from legal_private.terms_acceptances where id=$1',[active])).rows[0].n, 1);
  console.info('PASS bounded expunge removes expired rows including expired exceptions and preserves active/held rows');
  for (const role of ['anon','authenticated']) {
    await db.exec('set role ' + role);
    await assert.rejects(db.query('select legal_private.purge_expired_terms_acceptances(1)'), e => e.code === '42501');
    await db.exec('reset role');
  }
  console.info('PASS clients cannot execute expunge');
} finally { await db.close(); }

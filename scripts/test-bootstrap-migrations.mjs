/* global console */
// Replay the documented bootstrap in PostgreSQL/WASM. Auth and Storage are
// fixtures; this does not contact Supabase or validate its HTTP/CDN layer.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
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
    .filter((line) => line.startsWith("\\ir ")).map((line) => line.slice(4));
  const migrations = readdirSync("supabase/migrations").filter((name) => name.endsWith(".sql")).sort();
  assert.deepEqual(paths, ["bootstrap-empty-guard.sql", "schema.sql", "bootstrap-snapshot-compatibility.sql",
    ...migrations.map((name) => `migrations/${name}`), "bootstrap-finish.sql"]);
  for (const path of paths) {
    try {
      await db.exec(readFileSync(`supabase/${path}`, "utf8"));
    } catch (error) {
      throw new Error(`Bootstrap failed in ${path}: ${error.message}`, { cause: error });
    }
    console.info(`PASS bootstrap: ${path}`);
  }
  const bucket = (await db.query("select public from storage.buckets where id='project-images'")).rows;
  assert.equal(bucket[0].public, false);
  const defaults = (await db.query(`select column_default from information_schema.columns
    where table_schema='public' and ((table_name='cars' and column_name='show_expenses_public')
    or (table_name='car_expenses' and column_name='is_public')
    or (table_name='project_modifications' and column_name='show_paid_amount'))`)).rows;
  assert.equal(defaults.length, 3);
  assert.ok(defaults.every((row) => row.column_default === "false"));
  assert.equal((await db.query("select to_regprocedure('public.can_read_project_image(text)') is not null as ok")).rows[0].ok, true);
  await assert.rejects(db.exec(readFileSync("supabase/bootstrap-empty-guard.sql", "utf8")), /requires a NEW empty database/);
  console.info(JSON.stringify({ mode: "isolated-bootstrap", migrations: migrations.length, result: "passed", remoteWrites: 0 }));
} finally {
  await db.close();
}

/* global process, console */
// PostgreSQL in WASM, with isolated auth/storage fixtures. This is not a
// Supabase HTTP test and never connects to the shared project.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { validateImageSecurity } from "./test-image-security.mjs";

const { PGlite } = await import(process.env.PGLITE_MODULE_PATH
  ? pathToFileURL(process.env.PGLITE_MODULE_PATH).href
  : "@electric-sql/pglite");
const db = new PGlite();
const schema = readFileSync("supabase/schema.sql", "utf8");
const migration = (name) => readFileSync(`supabase/migrations/${name}.sql`, "utf8");
const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";
const car = "33333333-3333-4333-8333-333333333333";
const privateCar = "44444444-4444-4444-8444-444444444444";
const mod = "55555555-5555-4555-8555-555555555555";
const path = `${a}/pending-modifications/66666666-6666-4666-8666-666666666666.webp`;
let checks = 0;
function check(value, label) { assert.ok(value, label); checks++; console.info(`PASS ${label}`); }
async function role(name, user, sql, values = []) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? ""]);
  await db.exec(`set role ${name}`);
  return db.query(sql, values);
}
async function denied(name, user, sql, values = []) {
  await assert.rejects(role(name, user, sql, values), (error) => error.code === "42501");
  checks++;
}

try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create table storage.objects(bucket_id text, name text, created_at timestamptz default now(), primary key(bucket_id,name));
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    create function public.set_updated_at() returns trigger language plpgsql as
      $$ begin new.updated_at := now(); return new; end $$;
    create function public.enforce_action_rate_limit(text) returns boolean language sql as $$ select true $$;
    insert into auth.users values ('${a}'), ('${b}');
  `);
  for (const table of ["car_catalog_models", "car_catalog_versions", "cars", "car_photos", "car_parts", "car_build_updates", "car_expenses"]) {
    const definition = schema.match(new RegExp(`create table if not exists public\\.${table} \\([\\s\\S]*?\\n\\);`))?.[0];
    assert.ok(definition, `schema definition for ${table}`);
    await db.exec(definition);
  }
  await db.exec(migration("20260929120000_add_modification_catalog"));
  await db.exec(`
    alter table public.cars enable row level security;
    create policy cars_read on public.cars for select to anon, authenticated using (is_public or owner_id = auth.uid());
    create policy cars_owner on public.cars for all to authenticated using (owner_id = auth.uid()) with check(owner_id = auth.uid());
    grant select on public.cars to anon, authenticated;
    grant insert,update,delete on public.cars to authenticated;
    grant select,insert,update,delete on public.car_photos,public.car_parts,public.car_build_updates,public.car_expenses to authenticated;
    grant select on public.car_build_updates to anon;
    alter table public.car_build_updates enable row level security;
    create policy car_build_updates_read_public_or_owner on public.car_build_updates for select to anon,authenticated
      using(exists(select 1 from public.cars c where c.id=car_id and (c.is_public or c.owner_id=auth.uid())));
    create policy car_build_updates_write_owner on public.car_build_updates for all to authenticated
      using(exists(select 1 from public.cars c where c.id=car_id and c.owner_id=auth.uid()));
    create policy legacy_permissive_read on public.project_modifications for select to authenticated using(true);
    create policy legacy_permissive_read on public.car_build_updates for select to authenticated using(true);
    alter table public.car_expenses enable row level security;
    create policy car_expenses_write_owner on public.car_expenses for all to authenticated
      using(exists(select 1 from public.cars c where c.id=car_id and c.owner_id=auth.uid()));
    create policy legacy_permissive_read on public.car_expenses for select to authenticated using(true);
    insert into public.cars(id,owner_id,slug,name,brand,model,year,category,is_public) values
      ('${car}','${a}','public-test','Public test','VW','Gol',1994,'Projeto',true),
      ('${privateCar}','${a}','private-test','Private test','VW','Gol',1994,'Projeto',false);
    insert into public.project_modifications(id,car_id,catalog_id,paid_amount,note)
      select '${mod}','${car}',id,12345,'private legacy note' from public.modification_catalog limit 1;
    insert into public.car_build_updates(car_id,title,amount_spent) values
      ('${car}','Public update',789), ('${privateCar}','Private update',987);
    insert into public.car_expenses(car_id,name,category,amount,note,is_public)
      values ('${car}','Shared expense','Outros',42,'Private receipt detail',true);
  `);
  await db.exec(migration("20260920120000_transactional_project_writes"));
  for (const name of ["20261013010000_restrict_modification_photo_ownership", "20261013020000_private_modifications_public_projection", "20261013025000_private_expense_defaults_atomic", "20261013030000_pending_modification_photo_leases"]) {
    await db.exec(migration(name));
    await db.exec(migration(name));
  }
  await denied("anon", null, "select * from public.project_modifications");
  const anonymous = (await role("anon", null, "select * from public.list_public_project_modifications($1)", [car])).rows;
  check(anonymous.length === 1 && anonymous[0].paid_amount === null && !("note" in anonymous[0]) && anonymous[0].public_description === null, "anonymous projection hides legacy note and private cost");
  check((await role("anon", null, "select * from public.list_public_project_modifications($1)", [privateCar])).rows.length === 0, "private project has no public modifications");
  check((await role("authenticated", b, "select * from public.project_modifications where car_id=$1", [car])).rows.length === 0, "user B cannot directly read A's private fields");
  check((await role("authenticated", b, "select * from public.car_build_updates where car_id=$1", [car])).rows.length === 0, "restrictive read guards survive legacy permissive policies");
  const own = (await role("authenticated", a, "select * from public.project_modifications where id=$1", [mod])).rows[0];
  check(own.note === "private legacy note" && own.paid_amount === 12345 && own.show_paid_amount === false, "owner retains original note and cost; default is private");
  await role("authenticated", a, "update public.project_modifications set show_paid_amount=true,public_description='Public description' where id=$1", [mod]);
  check((await role("anon", null, "select * from public.list_public_project_modifications($1)", [car])).rows[0].paid_amount === 12345, "explicitly shared cost is public");
  await role("authenticated", a, "update public.project_modifications set show_paid_amount=false,paid_amount=54321 where id=$1", [mod]);
  check((await role("anon", null, "select * from public.list_public_project_modifications($1)", [car])).rows[0].paid_amount === null, "edited private cost remains hidden");
  check((await role("authenticated", b, "update public.project_modifications set note='attack' where id=$1 returning id", [mod])).rows.length === 0, "B cannot update A's modification");
  await denied("authenticated", b, "insert into public.project_modifications(car_id,catalog_id) select $1,id from public.modification_catalog limit 1", [car]);
  await denied("authenticated", a, "update public.project_modifications set project_photo_storage_path=$1 where id=$2", [`${b}/modifications/66666666-6666-4666-8666-666666666666.webp`, mod]);
  await denied("anon", null, "select * from public.car_build_updates");
  const updates = (await role("anon", null, "select * from public.list_public_car_build_updates($1::uuid[])", [[car,privateCar]])).rows;
  check(updates.length === 1 && updates[0].amount_spent === null, "public update projection redacts cost and excludes private project");
  check((await role("authenticated", a, "select amount_spent from public.car_build_updates where car_id=$1", [car])).rows[0].amount_spent === 789, "owner reads own update cost");
  const expenses = (await role("anon", null, "select * from public.list_public_car_expenses($1::uuid[])", [[car,privateCar]])).rows;
  check(expenses.length === 1 && expenses[0].amount === 42 && expenses[0].note === null && expenses[0].part_id === null, "publishing an expense cost never publishes its personal note");
  check((await role("authenticated", b, "select * from public.car_expenses where car_id=$1", [car])).rows.length === 0, "B cannot bypass expense note projection");
  check((await role("authenticated", a, "select note from public.car_expenses where car_id=$1", [car])).rows[0].note === "Private receipt detail", "owner keeps private expense note");
  await role("authenticated", a, "update public.car_expenses set is_public=false where car_id=$1", [car]);
  check((await role("anon", null, "select * from public.list_public_car_expenses($1::uuid[])", [[car]])).rows.length === 0, "private expense amount cannot be queried publicly");
  await role("authenticated", a, "update public.cars set is_public=false where id=$1", [car]);
  check((await role("anon", null, "select * from public.list_public_project_modifications($1)", [car])).rows.length === 0 && (await role("anon", null, "select * from public.list_public_car_build_updates($1::uuid[])", [[car,privateCar]])).rows.length === 0, "changing project to private closes both public projections");
  await db.exec("reset role");
  const functions = (await db.query("select prosecdef,proconfig from pg_proc where oid in ('public.list_public_car_build_updates(uuid[])'::regprocedure,'public.list_public_project_modifications(uuid)'::regprocedure,'public.list_public_car_expenses(uuid[])'::regprocedure)")).rows;
  check(functions.length === 3 && functions.every((f) => f.prosecdef && f.proconfig.some((value) => value.startsWith("search_path="))), "public RPCs declare their security model and fixed search path");

  const saved = await role("authenticated", a, "select * from public.save_car_project_atomic(null,$1::jsonb,'[]','[]','[]',$2::jsonb)", [JSON.stringify({ slug: "default-privacy", name: "Defaults", brand: "VW", model: "Gol", year: 1994, category: "Projeto" }), JSON.stringify([{name:"Expense",category:"Outros",amount:10,spent_at:"2026-10-13"}])]);
  const savedId = saved.rows[0].id;
  check((await role("authenticated", a, "select show_expenses_public from public.cars where id=$1", [savedId])).rows[0].show_expenses_public === false && (await role("authenticated", a, "select is_public from public.car_expenses where car_id=$1", [savedId])).rows[0].is_public === false, "atomic RPC defaults omitted expense visibility to private");

  await db.exec("reset role");
  await db.query("insert into storage.objects(bucket_id,name,created_at) values ('project-images',$1,now()-interval '8 days')", [path]);
  await denied("authenticated", a, "select public.claim_stale_pending_modification_photo($1)", [path]);
  await denied("anon", null, "select public.claim_stale_pending_modification_photo($1)", [path]);
  await denied("authenticated", a, "select * from public.inspect_stale_pending_modification_photos(100)");
  check((await role("service_role", null, "select public.claim_stale_pending_modification_photo($1) as ok", [path])).rows[0].ok === false, "old untracked objects are preserved");
  check((await role("authenticated", b, "select public.touch_pending_modification_photo($1) as ok", [path])).rows[0].ok === false, "B cannot renew A's photo lease");
  check((await role("authenticated", a, "select public.touch_pending_modification_photo($1) as ok", [path.replace("66666666-6666", "77777777-7777")])).rows[0].ok === false, "nonexistent objects cannot allocate leases");
  check((await role("authenticated", a, "select public.touch_pending_modification_photo($1) as ok", [path])).rows[0].ok === true, "active editor renews its own old photo");
  check((await role("service_role", null, "select public.claim_stale_pending_modification_photo($1) as ok", [path])).rows[0].ok === false, "renew-before-cleanup preserves active editor");
  check((await role("service_role", null, "select * from public.inspect_stale_pending_modification_photos(100)")).rows.length === 0, "inspection excludes active editors");
  await db.exec("reset role");
  await db.query("update public.pending_modification_photo_leases set lease_until=now()-interval '1 hour' where path=$1", [path]);
  check((await role("service_role", null, "select * from public.inspect_stale_pending_modification_photos(100)")).rows.length === 1, "bounded inspection finds an expired tracked object");
  await db.exec("reset role");
  check((await db.query("select claimed_at from public.pending_modification_photo_leases where path=$1", [path])).rows[0].claimed_at === null, "inspection does not claim or delete objects");
  check((await role("service_role", null, "select public.claim_stale_pending_modification_photo($1) as ok", [path])).rows[0].ok === true, "expired unreferenced photo can be claimed");
  check((await role("authenticated", a, "select public.touch_pending_modification_photo($1) as ok", [path])).rows[0].ok === false, "cleanup-before-renew prevents resurrecting a claimed path");
  check((await role("service_role", null, "select public.claim_stale_pending_modification_photo($1) as ok", [path])).rows[0].ok === false, "repeated cleanup does not duplicate a current claim");
  await db.exec("reset role; begin; alter table public.project_modifications drop constraint project_modifications_photo_path_chk;");
  await db.query("update public.project_modifications set project_photo_storage_path=$1 where id=$2", [path,mod]);
  await db.query("update public.pending_modification_photo_leases set claimed_at=now()-interval '2 hours' where path=$1", [path]);
  check((await role("service_role", null, "select public.claim_stale_pending_modification_photo($1) as ok", [path])).rows[0].ok === false, "defensive reference check protects even a legacy invalid pending reference");
  await db.exec("rollback;");
  await db.exec("reset role;");
  checks += await validateImageSecurity(db);
  await db.exec(readFileSync("docs/sql/contencao-backend-2026-10-13.sql", "utf8"));
  await denied("anon", null, "select * from public.list_public_project_modifications($1)", [car]);
  await denied("service_role", null, "select public.claim_stale_pending_modification_photo($1)", [path]);
  check((await role("authenticated", a, "select note from public.project_modifications where id=$1", [mod])).rows[0].note === "private legacy note", "containment rollback preserves owner access and data");
  console.info(JSON.stringify({ mode: "isolated-postgresql", checks, result: "passed", remoteWrites: 0 }));
} finally {
  await db.close();
}

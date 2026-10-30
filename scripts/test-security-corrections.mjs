/* global console, process */
// Replay the documented bootstrap in PostgreSQL/WASM. Auth and Storage are
// fixtures; this does not contact Supabase or validate its HTTP/CDN layer.
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";

const output = process.env.AUDIT_OUT ?? "results/security-corrections";
mkdirSync(output, { recursive: true });
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
  const tables = (await db.query("select c.relname,c.relrowsecurity,c.relacl from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','storage') and c.relkind='r' order by c.relname")).rows;
  const policies = (await db.query("select * from pg_policies where schemaname in ('public','storage') order by tablename,policyname")).rows;
  const funcs = (await db.query(`select p.oid::regprocedure::text as signature,p.prosecdef,p.proconfig,p.proacl,has_function_privilege('anon',p.oid,'execute') as anon_execute,has_function_privilege('authenticated',p.oid,'execute') as authenticated_execute,pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' order by p.proname`)).rows;
  const grants = (await db.query("select * from information_schema.role_table_grants where grantee in ('anon','authenticated','service_role') order by table_name,grantee,privilege_type")).rows;
  const views = (await db.query("select viewname,definition from pg_views where schemaname='public'")).rows;
  writeFileSync(output+'/banco-efetivo.json',JSON.stringify({tables,policies,funcs,grants,views},null,2));
  const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222';
  const C='33333333-3333-4333-8333-333333333333', P='44444444-4444-4444-8444-444444444444';
  const results=[];
  async function role(r,u,sql,args=[]) {await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[u||'']);await db.exec('set role '+r);return db.query(sql,args);}
  async function check(label,fn) {try {const evidence=await fn();results.push({label,result:'pass',evidence});}catch(e){results.push({label,result:'unexpected',code:e.code,message:e.message});} }
  const zero=async(r,u,sql,args=[])=>assert.equal((await role(r,u,sql,args)).rows.length,0);
  const denied=async(r,u,sql,args=[])=>assert.rejects(role(r,u,sql,args),e=>e.code==='42501');
  await db.exec(`insert into auth.users(id,email) values ('${A}','a@fixture.invalid'),('${B}','b@fixture.invalid');
    -- Only isolated fixture users: simulate owner approval and real server-side acceptance.
    insert into legal_private.terms_acceptances(user_id,terms_version,privacy_version)
      select id,'terms-v1','privacy-v1' from auth.users;
    insert into cars(id,owner_id,slug,name,brand,model,year,category,is_public) values
    ('${C}','${A}','audit-public','Fixture','VW','Gol',2000,'Projeto',true),
    ('${P}','${A}','audit-private','Private','VW','Gol',2000,'Projeto',false);`);
  await check('owner updates own car',async()=>assert.equal((await role('authenticated',A,"update cars set name='Mine' where id=$1 returning id",[C])).rows.length,1));
  await check('B cannot update A public car',()=>zero('authenticated',B,"update cars set name='attack' where id=$1 returning id",[C]));
  await check('B cannot delete A car',()=>zero('authenticated',B,'delete from cars where id=$1 returning id',[C]));
  await check('B cannot read A private car',()=>zero('authenticated',B,'select * from cars where id=$1',[P]));
  await check('anon cannot read A private car',()=>zero('anon',null,'select * from cars where id=$1',[P]));
  await check('owner cannot transfer car to B',()=>denied('authenticated',A,'update cars set owner_id=$1 where id=$2',[B,C]));
  await check('anon cannot insert car',()=>denied('anon',null,"insert into cars(owner_id,slug,name,brand,model,year,category) values($1,'attack','x','x','x',2000,'Projeto')",[A]));
  await check('B cannot read private profile A',()=>zero('authenticated',B,'select * from profiles where id=$1',[A]));
  await check('anon cannot read base profiles',()=>denied('anon',null,'select * from profiles'));
  await check('public profile excludes email/full_name',async()=>{const rows=(await role('anon',null,'select * from public_profiles where id=$1',[A])).rows;assert.equal(rows.length,1);assert.ok(!('email' in rows[0])&&!('full_name' in rows[0]));});
  await check('B cannot edit profile A',()=>zero('authenticated',B,"update profiles set bio='attack' where id=$1 returning id",[A]));
  await check('B cannot attach modification to A',()=>denied('authenticated',B,'insert into project_modifications(car_id,catalog_id) select $1,id from modification_catalog limit 1',[C]));
  await check('B cannot comment private car',()=>denied('authenticated',B,"insert into car_comments(car_id,user_id,content) values($1,$2,'fixture comment')",[P,B]));
  await check('B cannot spoof A comment',()=>denied('authenticated',B,"insert into car_comments(car_id,user_id,content) values($1,$2,'fixture comment')",[C,A]));
  await check('B cannot like private car',()=>denied('authenticated',B,'insert into car_likes(car_id,user_id) values($1,$2)',[P,B]));
  await check('anon cannot invoke notification RPC',()=>denied('anon',null,"select create_notification($1,'follow',null,'x',null,true)",[A]));
  await check('B cannot manufacture project-update notification',async()=>assert.rejects(role('authenticated',B,"select create_notification($1,'project_update',$2,'forged',null,false) as id",[A,C]),e=>e.message==='invalid_notification_context'));
  await check('B cannot release upload reservation',()=>denied('authenticated',B,'select release_storage_upload_reservation($1)',[C]));
  await check('anon cannot read action counters',()=>denied('anon',null,'select * from action_rate_limits'));
  await check('B cannot read notifications A',()=>zero('authenticated',B,'select * from notifications where recipient_id=$1',[A]));
  const path=A+'/cars/audit.webp';
  await db.exec('reset role');await db.query("insert into storage.objects(bucket_id,name) values('project-images',$1)",[path]);
  await check('B cannot read unreferenced A image',async()=>assert.equal((await role('authenticated',B,'select can_read_project_image($1) as ok',[path])).rows[0].ok,false));
  await check('direct storage insert blocked',()=>denied('authenticated',A,"insert into storage.objects(bucket_id,name) values('project-images',$1)",[A+'/cars/direct.webp']));
  await check('B cannot delete A stored image',()=>zero('authenticated',B,'delete from storage.objects where name=$1 returning name',[path]));
  await check('private bucket effective',async()=>{await db.exec('reset role');assert.equal((await db.query("select public from storage.buckets where id='project-images'")).rows[0].public,false);});
  for (const [table, cols, id] of [
    ['cars',['likes_count','saves_count','comments_count','views_count','project_followers_count'],C],
    ['profiles',['cars_count','followers_count','following_count'],A]]) {
    for (const col of cols) {
      await check('deny direct UPDATE '+table+'.'+col,()=>denied('authenticated',A,`update ${table} set ${col}=123 where id=$1`,[id]));
      await check('deny explicit INSERT '+table+'.'+col,()=>denied('authenticated',A,`insert into ${table}(${col}) values(123)`));
    }
  }
  await check('probe arbitrary remote image URL persists',async()=>{const rows=(await role('authenticated',A,"update cars set main_photo_url='http://127.0.0.1:3199/audit-image.png' where id=$1 returning main_photo_url",[C])).rows;assert.equal(rows.length,1);return rows;});
  await check('probe invalid external part URL persists',async()=>{const rows=(await role('authenticated',A,"insert into car_parts(car_id,name,category,status,external_url) values($1,'fixture','Outros','planned','javascript:alert(1)') returning external_url",[C])).rows;return rows;});
  await check('RPC update other owner blocked',()=>denied('authenticated',B,"select * from save_car_project_atomic($1,'{}','[]','[]','[]','[]')",[C]));
  await check('anon public search injection treated as text',async()=>{const rows=(await role('anon',null,"select * from search_car_projects($1,null,null,null,10)",["'; select * from profiles; --"])).rows;assert.equal(rows.length,0);});
  await db.exec('reset role');
  for(const [t,cols,values] of [
    ['car_photos','car_id,url',"$1,'https://images.invalid/fixture.png'"],
    ['car_parts','car_id,name,category,status',"$1,'fixture','Outros','planned'"],
    ['car_build_updates','car_id,title',"$1,'fixture'"],
    ['car_expenses','car_id,name,category,amount,note',"$1,'fixture','Outros',42,'private fixture note'"]]) {
    await db.exec('reset role');await db.query(`insert into ${t}(${cols}) values(${values})`,[P]);
    await check('B cannot select private '+t,()=>zero('authenticated',B,`select * from ${t} where car_id=$1`,[P]));
    await check('B cannot delete private '+t,()=>zero('authenticated',B,`delete from ${t} where car_id=$1 returning id`,[P]));
    await check('B cannot reassign private '+t,()=>zero('authenticated',B,`update ${t} set car_id=$1 where car_id=$2 returning id`,[C,P]));
  }
  for(const t of ['parts_catalog','part_vehicle_compatibility','part_dependencies','project_parts','build_budgets','part_alert_rules','part_recommendation_rules'])
    await check('legacy table '+t+' inaccessible without extra grants',()=>denied('authenticated',B,`select * from ${t}`));
  await check('legacy RLS remains closed even after accidental grants',async()=>{
    await db.exec('reset role');
    const part='77777777-7777-4777-8777-777777777777';
    await db.query("insert into parts_catalog(id,name,category) values($1,'Legacy fixture','Outros')",[part]);
    await db.query("insert into part_vehicle_compatibility(part_id,brand,model,year_start,year_end) values($1,'VW','Gol',1990,2000)",[part]);
    await db.query('insert into part_dependencies(part_id,required_part_id) values($1,$1)',[part]);
    await db.query("insert into project_parts(project_id,user_id,part_id,notes) values($1,$2,$3,'private legacy note')",[C,A,part]);
    await db.query("insert into build_budgets(project_id,user_id,budget_amount,goal) values($1,$2,1000,'private fixture')",[C,A]);
    await db.query("insert into part_recommendation_rules(part_category,notes) values('Outros','fixture')");
    for(const t of ['parts_catalog','part_vehicle_compatibility','part_dependencies','project_parts','build_budgets','part_alert_rules','part_recommendation_rules']) {
      await db.exec('reset role');await db.exec(`grant select,insert,update,delete on ${t} to anon,authenticated`);
      await zero('authenticated',B,`select * from ${t}`);
      await zero('anon',null,`select * from ${t}`);
      await db.exec('reset role');await db.exec(`revoke all on ${t} from anon,authenticated`);
    }
  });
  await check('project update requires actual event; replay is immutable',async()=>{
    await db.exec('reset role');
    await db.query('insert into project_follows(car_id,user_id) values($1,$2)',[C,B]);
    await assert.rejects(role('authenticated',A,"select create_notification($1,'project_update',$2,'Fixture update','fabricated',false)",[B,C]), /invalid_notification_context/);
    await role('authenticated',A,"insert into car_build_updates(car_id,title) values($1,'Real evolution')",[C]);
    const ids=[];
    for(let n=0;n<3;n++) ids.push((await role('authenticated',A,"select create_notification($1,'project_update',$2,'Fixture update','Real evolution',false) as id",[B,C])).rows[0].id);
    assert.ok(ids[0]);assert.equal(new Set(ids).size,1);
    await role('authenticated',B,'update notifications set read_at=now() where id=$1',[ids[0]]);
    await role('authenticated',A,"select create_notification($1,'project_update',$2,'changed title','Real evolution',false)",[B,C]);
    await db.exec('reset role');
    const n=(await db.query('select * from notifications where id=$1',[ids[0]])).rows[0];
    assert.ok(n.read_at);assert.notEqual(n.title,'changed title');
    // Atomic save replaces rows: identical title/date must still dedupe.
    await db.query('delete from car_build_updates where car_id=$1',[C]);
    await db.query("insert into car_build_updates(car_id,title) values($1,'Real evolution')",[C]);
    assert.equal((await role('authenticated',A,"select create_notification($1,'project_update',$2,'x','Real evolution',false) as id",[B,C])).rows[0].id,ids[0]);
  });
  await check('social counters and notification contexts remain legitimate',async()=>{
    await role('authenticated',B,'insert into car_likes(car_id,user_id) values($1,$2)',[C,B]);
    await role('authenticated',B,'insert into car_saves(car_id,user_id) values($1,$2)',[C,B]);
    await role('authenticated',B,"insert into car_comments(car_id,user_id,content) values($1,$2,'Real comment')",[C,B]);
    await role('authenticated',B,'insert into user_follows(follower_id,following_id) values($1,$2)',[B,A]);
    for(const type of ['project_like','project_save','project_comment','project_follow','follow']) {
      const args=[A,type,type==='follow'?null:C];
      const q="select create_notification($1,$2,$3,'Real event','fixture',false) as id";
      const id=(await role('authenticated',B,q,args)).rows[0].id;assert.ok(id);
      assert.equal((await role('authenticated',B,q,args)).rows[0].id,id);
    }
    let car=(await role('anon',null,'select * from cars where id=$1',[C])).rows[0];
    assert.equal(car.likes_count,1);assert.equal(car.saves_count,1);assert.equal(car.comments_count,1);assert.equal(car.project_followers_count,1);
    const one=(await role('authenticated',B,'select * from increment_car_view($1)',[C])).rows[0];
    const two=(await role('authenticated',B,'select * from increment_car_view($1)',[C])).rows[0];
    assert.equal(one.incremented,true);assert.equal(two.incremented,false);assert.equal(two.views_count,1);
    await role('authenticated',B,'delete from car_likes where car_id=$1',[C]);
    await role('authenticated',B,'delete from car_saves where car_id=$1',[C]);
    await role('authenticated',B,'delete from car_comments where car_id=$1',[C]);
    await role('authenticated',B,'delete from project_follows where car_id=$1',[C]);
    await role('authenticated',B,'delete from user_follows where follower_id=$1',[B]);
    car=(await role('anon',null,'select * from cars where id=$1',[C])).rows[0];
    assert.equal(car.likes_count,0);assert.equal(car.saves_count,0);assert.equal(car.comments_count,0);assert.equal(car.project_followers_count,0);
    const profiles=(await role('anon',null,'select * from public_profiles where id=$1',[A])).rows[0];
    assert.equal(profiles.cars_count,2);assert.equal(profiles.followers_count,0);
  });
  await check('a new legitimate social relation is a different event',async()=>{
    await role('authenticated',B,'insert into car_likes(car_id,user_id) values($1,$2)',[C,B]);
    assert.ok((await role('authenticated',B,"select create_notification($1,'project_like',$2,'A new like',null,false) as id",[A,C])).rows[0].id);
    await db.exec('reset role');
    assert.equal((await db.query("select count(*)::int n from notification_event_receipts where actor_id=$1 and recipient_id=$2 and event_key like '%project_like%'",[B,A])).rows[0].n,2);
    await role('authenticated',B,'delete from car_likes where car_id=$1',[C]);
  });
  await check('RPC atomic edit preserves derived metrics and normal editing',async()=>{
    const before=(await role('authenticated',A,'select * from cars where id=$1',[C])).rows[0];
    await role('authenticated',A,"select * from save_car_project_atomic($1,$2,'[]','[]','[]','[]')",[C,{name:'Edited atomic',likes_count:999,views_count:999,project_followers_count:999}]);
    const after=(await role('authenticated',A,'select * from cars where id=$1',[C])).rows[0];
    assert.equal(after.name,'Edited atomic');
    for(const col of ['likes_count','saves_count','comments_count','views_count','project_followers_count'])assert.equal(after[col],before[col]);
  });
  await check('RPC atomic creation sanitizes forged metrics',async()=>{
    const payload={owner_id:A,slug:'atomic-fixture',name:'Fixture',brand:'VW',model:'Gol',year:2000,category:'Projeto',likes_count:999,views_count:999};
    const car=(await role('authenticated',A,"select * from save_car_project_atomic(null,$1,'[]','[]','[]','[]')",[payload])).rows[0];
    const row=(await role('authenticated',A,'select * from cars where id=$1',[car.id])).rows[0];
    assert.equal(row.likes_count,0);assert.equal(row.views_count,0);
  });
  await check('direct insert default metrics remain zero',async()=>{
    const c=(await role('authenticated',A,"insert into cars(owner_id,slug,name,brand,model,year,category) values($1,'direct-create','Direct','VW','Gol',2000,'Projeto') returning *",[A])).rows[0];
    for(const col of ['likes_count','saves_count','comments_count','views_count','project_followers_count'])assert.equal(c[col],0);
  });
  await check('notification content limit',()=>assert.rejects(role('authenticated',B,"select create_notification($1,'follow',null,$2,null,true)",[A,'x'.repeat(241)]),/notification_content_too_large/));
  await check('notification quota applies across events and serializes overlapping invocations',async()=>{
    await db.exec('reset role');await db.query('insert into project_follows(car_id,user_id) values($1,$2)',[C,B]);
    // PGlite queues connection queries: this exercises overlapping invocations,
    // not independent PostgreSQL sessions. Cross-session proof remains pending.
    for(let i=0;i<31;i++) await db.query("insert into car_build_updates(car_id,title) values($1,$2)",[C,'quota '+i]);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[A]);await db.exec('set role authenticated');
    const results=await Promise.all(Array.from({length:31},(_,i)=>db.query("select create_notification($1,'project_update',$2,'Update',$3,false) as id",[B,C,'quota '+i])));
    // Set role explicitly before evaluating this batch below.
    assert.equal(results.filter(r=>r.rows[0].id).length,29);
    await db.exec('reset role');
    assert.equal((await db.query('select count(*)::int n from notification_event_receipts where actor_id=$1 and recipient_id=$2',[A,B])).rows[0].n,30);
  });
  await check('B cannot mark A notifications read',()=>zero('authenticated',B,'update notifications set read_at=now() where user_id=$1 returning id',[A]));
  await check('cannot edit notification title directly',()=>denied('authenticated',B,"update notifications set title='forged' where user_id=$1",[B]));
  await check('oversize comment DB constraint rejects',async()=>assert.rejects(role('authenticated',B,'insert into car_comments(car_id,user_id,content) values($1,$2,$3)',[C,B,'x'.repeat(1001)]),e=>e.code==='23514'));
  await check('B cannot attach A storage path to own profile',()=>denied('authenticated',B,'update profiles set avatar_url=$1 where id=$2',['/api/media/project/'+path,B]));
  await check('owner can publish image then anon can read; revoke closes',async()=>{
    await role('authenticated',A,'update cars set main_photo_url=$1 where id=$2',['/api/media/project/'+path,C]);
    assert.equal((await role('anon',null,'select can_read_project_image($1) as ok',[path])).rows[0].ok,true);
    await role('authenticated',A,'update cars set is_public=false where id=$1',[C]);
    assert.equal((await role('anon',null,'select can_read_project_image($1) as ok',[path])).rows[0].ok,false);
    assert.equal((await role('authenticated',A,'select can_read_project_image($1) as ok',[path])).rows[0].ok,true);
  });
  writeFileSync(output+'/testes-banco.json',JSON.stringify(results,null,2));
  console.info(JSON.stringify({tests:results.length,unexpected:results.filter(x=>x.result!=='pass')}));
  assert.equal(results.filter(x=>x.result!=='pass').length,0);
} finally {await db.close();}

/* global console, Response, Request, Blob, fetch, Buffer, URL */
// Actual PostgreSQL SQL + local HTTP requests. Storage and identities are
// controlled fixtures: this is NOT a real Supabase/Netlify infrastructure test.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as urls from "../src/lib/images/project-image-url.ts";

export async function validateImageSecurity(db) {
  const a = "11111111-1111-4111-8111-111111111111";
  const b = "22222222-2222-4222-8222-222222222222";
  const car = "33333333-3333-4333-8333-333333333333";
  const privateCar = "44444444-4444-4444-8444-444444444444";
  const otherCar = "77777777-7777-4777-8777-777777777777";
  const publicPath = `${a}/2026-10-14/public.webp`;
  const privatePath = `${a}/2026-10-14/private.webp`;
  const profilePath = `${a}/profile/avatar.webp`;
  const coverPath = `${a}/profile/cover.webp`;
  const legacy = (path) => `https://isolated.supabase.co/storage/v1/object/public/project-images/${path}`;
  let checks = 0;
  const check = (value, label) => { assert.ok(value, label); checks++; console.info(`PASS images: ${label}`); };
  const role = async (name, user, sql, values = []) => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? ""]);
    await db.exec(`set role ${name}`);
    return db.query(sql, values);
  };
  const authorized = async (user, path) => (await role(user ? "authenticated" : "anon", user,
    "select public.can_read_project_image($1) as ok", [path])).rows[0].ok;
  await db.exec(`reset role;
    create table public.profiles(id uuid primary key, avatar_url text, cover_url text);
    create table storage.buckets(id text primary key, public boolean not null);
    insert into storage.buckets values('project-images',true);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated;
    grant select,insert,update,delete on storage.objects to anon,authenticated;
    create policy legacy_storage_all on storage.objects for all to anon,authenticated using(true) with check(true);
    insert into public.cars(id,owner_id,slug,name,brand,model,year,category,is_public)
      values('${otherCar}','${b}','b-project','B project','VW','Gol',1994,'Projeto',true);
    update public.cars set is_public=true where id='${car}';
  `);
  for (const path of [publicPath, privatePath, profilePath, coverPath]) {
    await db.query("insert into storage.objects(bucket_id,name) values('project-images',$1)", [path]);
  }
  await db.query("update public.cars set main_photo_url=$1 where id=$2", [legacy(publicPath), car]);
  await db.query("update public.cars set main_photo_url=$1 where id=$2", [legacy(privatePath), privateCar]);
  await db.query("insert into public.profiles values($1,$2,$3)", [a,legacy(profilePath),legacy(coverPath)]);
  const initialObjects = (await db.query("select name from storage.objects order by name")).rows;
  for (const migration of ["20261014010000_project_image_access_registry", "20261014015000_project_image_cleanup_guards", "20261014020000_activate_private_project_images"]) {
    const sql = readFileSync(`supabase/migrations/${migration}.sql`, "utf8");
    if (migration === "20261014020000_activate_private_project_images") {
      await db.exec("alter table storage.objects disable row level security");
      await assert.rejects(db.exec(sql), /Storage RLS must already be enabled/); checks++;
      await db.exec("rollback; alter table storage.objects enable row level security");
      check((await db.query("select public from storage.buckets where id='project-images'")).rows[0].public===true,"failed RLS precondition leaves cutover transaction unchanged");
    }
    await db.exec(sql); await db.exec(sql);
    if (migration === "20261014010000_project_image_access_registry") {
      check((await db.query("select public from storage.buckets where id='project-images'")).rows[0].public===true,"preparation leaves existing public-bucket contract unchanged");
    }
  }
  check(await authorized(a,privatePath), "A reads own private image");
  check(!await authorized(b,privatePath), "B cannot read A's private image");
  check(!await authorized(null,privatePath), "anonymous cannot read private image");
  check(await authorized(null,publicPath), "anonymous reads public image from legacy reference");
  check(await authorized(b,publicPath), "B reads public image");
  check(await authorized(null,profilePath), "profile avatar stays public");
  check(await authorized(null,coverPath), "profile cover stays public");
  await db.exec("reset role");
  check((await db.query("select public from storage.buckets where id='project-images'")).rows[0].public === false, "bucket is private");
  check(JSON.stringify(initialObjects) === JSON.stringify((await db.query("select name from storage.objects order by name")).rows), "activation/backfill preserve every existing object");
  check((await role("anon",null,"select * from storage.objects")).rows.length === 0, "direct anonymous Storage SELECT blocked despite legacy FOR ALL");
  check((await role("authenticated",a,"select * from storage.objects")).rows.length === 0, "owner cannot directly download/sign using Storage SELECT");
  await assert.rejects(role("authenticated",a,"insert into storage.objects(bucket_id,name) values('project-images',$1)",[`${a}/2026-10-14/raw.webp`]), { code: "42501" }); checks++;
  check((await role("authenticated",a,"delete from storage.objects where name=$1 returning name",[privatePath])).rows.length === 0, "direct deletion cannot bypass reference claims");
  await assert.rejects(role("anon",null,"select * from public.project_image_references"), { code: "42501" }); checks++;
  await assert.rejects(role("authenticated",b,"update public.cars set main_photo_url=$1 where id=$2",[legacy(privatePath),otherCar]), { code: "42501" }); checks++;
  check(!await authorized(null,privatePath), "B cannot launder A's photo through B's public project");
  await role("authenticated",a,"update public.cars set is_public=false where id=$1",[car]);
  check(!await authorized(null,publicPath) && !await authorized(b,publicPath), "public to private immediately revokes both visitor roles");
  check(await authorized(a,publicPath), "owner keeps access after changing to private");
  await role("authenticated",a,"update public.cars set is_public=true where id=$1",[car]);
  check(await authorized(null,publicPath), "private to public restores access without copy/move");
  await role("authenticated",a,"update public.cars set photo_urls=$1 where id=$2",[[legacy(publicPath)],privateCar]);
  check(!await authorized(null,publicPath), "one private reference takes precedence over public references");
  await role("authenticated",a,"update public.cars set photo_urls='{}' where id=$1",[privateCar]);
  check(await authorized(null,publicPath), "removing private duplicate restores intentional public access");
  await role("authenticated",a,"update public.cars set photo_urls=$1 where id=$2",[[legacy(coverPath)],privateCar]);
  check(!await authorized(null,coverPath) && await authorized(a,coverPath),"private project reference overrides an otherwise public profile cover");
  await role("authenticated",a,"update public.cars set photo_urls='{}' where id=$1",[privateCar]);
  check(await authorized(null,coverPath),"profile cover restores when its private project reference is removed");

  await db.exec("reset role");
  const fixturePaths = ["gallery","part","event","modification"].map((kind) => `${a}/2026-10-14/${kind}.webp`);
  for (const path of fixturePaths) await db.query("insert into storage.objects(bucket_id,name) values('project-images',$1)",[path]);
  await role("authenticated",a,"insert into public.car_photos(car_id,url) values($1,$2)",[car,urls.projectImageUrl(fixturePaths[0])]);
  await role("authenticated",a,"insert into public.car_parts(car_id,name,category,status,image_url) values($1,'Part','Outros','installed',$2)",[car,legacy(fixturePaths[1])]);
  await role("authenticated",a,"insert into public.car_build_updates(car_id,title,photo_urls) values($1,'Images',$2)",[car,[legacy(fixturePaths[2])]]);
  // Existing fixture modification already has a DB-compatible path constraint.
  const modPath = `${a}/modifications/88888888-8888-4888-8888-888888888888.webp`;
  await db.exec("reset role");
  await db.query("insert into storage.objects(bucket_id,name) values('project-images',$1)",[modPath]);
  await role("authenticated",a,"update public.project_modifications set project_photo_storage_path=$1,project_photo_url=$2 where car_id=$3",[modPath,urls.projectImageUrl(modPath),car]);
  for (const path of [...fixturePaths.slice(0,3),modPath]) check(await authorized(null,path), `public reference registered: ${path.split('/').at(-1)}`);
  await role("authenticated",a,"update public.cars set is_public=false where id=$1",[car]);
  for (const path of [...fixturePaths.slice(0,3),modPath]) check(!await authorized(null,path), `visibility gate covers: ${path.split('/').at(-1)}`);
  await role("authenticated",a,"update public.cars set is_public=true where id=$1",[car]);

  check((await role("authenticated",a,"select public.claim_unreferenced_project_image($1) as ok",[modPath])).rows[0].ok === false, "referenced modification cannot be claimed for removal");
  check((await role("authenticated",b,"select public.claim_unreferenced_project_image($1) as ok",[privatePath])).rows[0].ok === false, "B cannot claim A's image");
  await role("authenticated",a,"update public.cars set main_photo_url=$1 where id=$2",[urls.projectImageUrl(fixturePaths[3]),car]);
  check(!await authorized(null,publicPath), "replacing hero removes stale public reference");
  check((await role("authenticated",a,"select public.claim_unreferenced_project_image($1) as ok",[publicPath])).rows[0].ok === true, "unreferenced old hero can be claimed");
  check(!await authorized(a,publicPath), "claimed object is blocked even if Storage deletion fails");
  await assert.rejects(role("authenticated",a,"update public.cars set main_photo_url=$1 where id=$2",[legacy(publicPath),car]),{code:"42501"}); checks++;
  check(await authorized(null,fixturePaths[3]), "failed late attachment rolls back and preserves replacement");
  await assert.rejects(role("authenticated",a,"update public.cars set main_photo_url=$1 where id=$2",[urls.projectImageUrl(`${a}/2026-10-14/missing.webp`),car]),{code:"42501"}); checks++;
  check(await authorized(null,fixturePaths[3]), "missing Storage object leaves DB reference unchanged");
  await role("authenticated",a,"delete from public.car_photos where car_id=$1",[car]);
  check(!await authorized(null,fixturePaths[0]), "gallery deletion removes public access without erasing original bytes");

  const leasePath = `${a}/pending-modifications/99999999-9999-4999-8999-999999999999.webp`;
  await db.exec("reset role");
  await db.query("insert into storage.objects(bucket_id,name,created_at) values('project-images',$1,now()-interval '8 days')",[leasePath]);
  check((await role("authenticated",a,"select public.touch_pending_modification_photo($1) as ok",[leasePath])).rows[0].ok,"new image guards preserve owner lease renewal");
  await db.exec("reset role");
  await db.query("update public.pending_modification_photo_leases set lease_until=now()-interval '1 hour' where path=$1",[leasePath]);
  // Simulate a legacy reference outside project_modifications, preserved by backfill.
  await db.query("insert into public.project_image_references(source_table,source_id,path,owner_id) values('profiles',$1,$2,$1)",[a,leasePath]);
  check(!(await role("service_role",null,"select * from public.inspect_stale_pending_modification_photos(100)")).rows.some((row)=>row.path===leasePath),"lease inspection protects references from every image-bearing table");
  check((await role("service_role",null,"select public.claim_stale_pending_modification_photo($1) as ok",[leasePath])).rows[0].ok===false,"cleanup cannot claim a globally referenced legacy temporary");
  await db.exec("reset role");
  await db.query("delete from public.project_image_references where path=$1",[leasePath]);
  check((await role("service_role",null,"select public.claim_stale_pending_modification_photo($1) as ok",[leasePath])).rows[0].ok,"expired unreferenced temporary can still be claimed");
  check((await role("authenticated",a,"select public.touch_pending_modification_photo($1) as ok",[leasePath])).rows[0].ok===false,"claim-before-renew cannot resurrect a pending image");
  check(!await authorized(a,leasePath),"claimed pending image is not delivered while Storage deletion is pending");

  // Run the actual Route Handler with request/session + Storage fixtures. SQL
  // authorization stays real. Transport is a genuine local HTTP server.
  let currentUser = null;
  let flipDuringDownload = false;
  let dbUnavailable = false;
  let storageUnavailable = false;
  const deliveryExports = {};
  const routeExports = {};
  const compile = (path) => ts.transpileModule(readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  runInNewContext(compile("src/lib/images/delivery.ts"),{exports:deliveryExports,Response,require:()=>urls});
  const imports = {
    "@/lib/images/delivery": deliveryExports,
    "@/lib/images/resize": {
      imageResizeOptions: (params) => { assert.equal(params.size, 0); return null; },
      resizeProjectImage: async (blob) => blob,
    },
    "@/lib/supabase/storage": {PROJECT_IMAGES_BUCKET:"project-images"},
    "@/lib/supabase/server": {getSupabaseServerClient:async()=>({rpc:async(name,args)=>{
      if(dbUnavailable) return {data:null,error:new Error("DB unavailable")};
      return {data:await authorized(currentUser,args.p_path),error:null};
    }})},
    "@/lib/supabase/service-role": {getSupabaseServiceRoleClient:()=>({storage:{from:()=>({download:async(path,_options,fetchOptions)=>{
      assert.equal(fetchOptions.cache,"no-store");
      if(storageUnavailable) return {data:null,error:new Error("Storage unavailable")};
      if(flipDuringDownload) { flipDuringDownload=false; await role("authenticated",a,"update public.cars set is_public=false where id=$1",[car]); }
      return {data:new Blob([`fixture:${path}`],{type:"image/webp"}),error:null};
    }})}})},
  };
  runInNewContext(compile("src/app/api/media/project/[...path]/route.ts"),{exports:routeExports,Response,URL,require:(name)=>{assert.ok(name in imports,name);return imports[name];}});
  const server = createServer(async(req,res)=>{
    try {
      currentUser = req.headers.cookie === "fixture=A" ? a : req.headers.cookie === "fixture=B" ? b : null;
      const url = new URL(req.url,"http://127.0.0.1");
      let response;
      if(url.pathname.startsWith(urls.PROJECT_MEDIA_PREFIX)) {
        response = await routeExports[req.method](new Request(url,{method:req.method}),{params:Promise.resolve({path:url.pathname.slice(urls.PROJECT_MEDIA_PREFIX.length).split('/')})});
      } else if(url.pathname.startsWith('/storage/v1/object/public/project-images/')) {
        await db.exec("reset role");
        const isPublic = (await db.query("select public from storage.buckets where id='project-images'")).rows[0].public;
        response = new Response(null,{status:isPublic?200:404});
      } else response = new Response(null,{status:404});
      res.writeHead(response.status,Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch(error) {res.writeHead(500);res.end(error.message);}
  });
  await new Promise((resolve)=>server.listen(0,"127.0.0.1",resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const http = (path,cookie,method="GET")=>fetch(`${origin}${path}`,{method,headers:cookie?{cookie}:undefined});
  try {
    for(const [cookie,expected] of [["fixture=A",200],["fixture=B",404],[null,404]]) {
      const response = await http(urls.projectImageUrl(privatePath),cookie);
      check(response.status===expected,`direct private URL HTTP: ${cookie??'anonymous'} -> ${expected}`);
      check(response.headers.get("Netlify-CDN-Cache-Control")==="no-store", "HTTP response forbids shared cache");
    }
    const currentHero = urls.projectImageUrl(fixturePaths[3]);
    check((await http(currentHero)).status===200,"direct public URL works anonymously");
    check((await http(currentHero,null,"HEAD")).status===200,"HEAD follows public authorization");
    check((await http(`/storage/v1/object/public/project-images/${privatePath}`)).status===404,"old public Storage URL denied by private-bucket fixture");
    flipDuringDownload=true;
    const raced = await http(currentHero);
    check(raced.status===404 && await raced.text()==="","visibility changes during Storage I/O release no bytes");
    check((await http(currentHero,"fixture=B")).status===404,"previous public app URL remains denied for B");
    check((await http(currentHero,"fixture=A")).status===200,"owner retains direct HTTP access after transition");
    await role("authenticated",a,"update public.cars set is_public=true where id=$1",[car]);
    check((await http(currentHero)).status===200,"HTTP access restores after private-to-public transition");
    dbUnavailable=true;
    check((await http(currentHero)).status===503,"DB outage fails closed over HTTP");
    dbUnavailable=false;storageUnavailable=true;
    check((await http(currentHero)).status===503,"Storage outage fails closed over HTTP");
    storageUnavailable=false;
  } finally {await new Promise((resolve)=>server.close(resolve));}
  await db.exec("reset role");
  check((await db.query("select count(*)::int as n from storage.objects")).rows[0].n===initialObjects.length+fixturePaths.length+2,"test preserves originals; only local fixture uploads added");
  await db.exec(readFileSync("docs/sql/contencao-imagens-2026-10-14.sql","utf8"));
  await assert.rejects(authorized(a,privatePath),{code:"42501"}); checks++;
  await db.exec("reset role");
  check((await db.query("select public from storage.buckets where id='project-images'")).rows[0].public===false,"containment keeps bucket private rather than rolling back exposure");
  console.info(JSON.stringify({mode:"isolated-postgresql-and-http-fixtures",checks,result:"passed",remoteWrites:0}));
  return checks;
}

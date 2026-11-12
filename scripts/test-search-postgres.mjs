import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { Buffer } from 'node:buffer';

const projection='id,slug,name,brand,model,year,engine,category,description,tags,likes_count,comments_count,views_count,project_followers_count';
export async function testSearchPostgres(db, check, output) {
  const source=fs.readFileSync(process.env.GARAGEM_SEARCH_BASELINE ?? 'src/lib/supabase/queries.ts','utf8');
  const helpers=source.slice(source.indexOf('function stringArray'),source.indexOf('function cleanLike'));
  const start=source.includes('async function legacyProjectSearchSuggestions') ? source.indexOf('async function legacyProjectSearchSuggestions') : source.indexOf('export async function qProjectSearchSuggestions');
  const original=source.slice(start,source.indexOf('export async function qCarsByOwner')).replace('async function legacyProjectSearchSuggestions','export async function qProjectSearchSuggestions');
  let corpus=[];
  const query={select:()=>query,eq:()=>query,limit:async n=>({data:corpus.slice(0,n),error:null})};
  const exports={};
  vm.runInNewContext(ts.transpileModule(helpers+'\n'+original,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {exports,getSupabaseServerClient:async()=>({from:()=>query}),protectedImageUrl:x=>x});
  const baseline=exports.qProjectSearchSuggestions;
  const A='e5555555-5555-4555-8555-555555555555';
  await db.exec(`reset role; insert into auth.users(id,email) values ('${A}','search@example.invalid');
    insert into legal_private.terms_acceptances(user_id,terms_version,privacy_version) values ('${A}','terms-v1','privacy-v1');`);
  // Twenty cars per synthetic owner, matching the application's 25-car quota.
  await db.exec(`insert into auth.users(id,email)
    select ('e5000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'search-'||n||'@example.invalid'
    from generate_series(0,250) n;`);
  async function seed(first,last) {
    await db.query(`insert into cars(id,owner_id,slug,name,brand,model,year,engine,category,description,tags,is_public,
      likes_count,comments_count,views_count,project_followers_count,created_at)
      select ('f0000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
        ('e5000000-0000-4000-8000-'||lpad((n/20)::text,12,'0'))::uuid,'search-fixture-'||n,
        case when n%20=0 then 'Álcool Ágil ' else 'Projeto ' end||n,
        case when n%3=0 then 'Chevrolet' else 'Volkswagen' end,
        case when n%3=0 then 'Opala' else 'Gol' end,1990+n%30,
        case when n%5=0 then 'AP 1.8 Turbo' else '1.0 Aspirado' end,'Clássicos',
        repeat('Descrição fictícia para bancada isolada. ',12)||case when n%31=0 then 'suspensão esportiva' else '' end,
        case when n%5=0 then array['#turbo','álcool','Sleeper'] else array['#aspirado','Original'] end,
        n%7<>0,n%39,n%13,n%1000,n%19,
        '2026-10-01'::timestamptz + n*interval '1 second'
      from generate_series($1::int,$2::int) n`,[first,last]);
  }
  const rpc=async q=>(await db.query('select * from project_search_suggestions($1,12)',[q])).rows.map(item=>({
    term:item.term,source:item.source,rank:item.rank,
    href:item.project_slug?`/projeto/${item.project_slug}`:`/explorar?q=${encodeURIComponent(item.term)}`,
  }));
  await seed(1,100);
  await db.query(`insert into cars(owner_id,slug,name,brand,model,year,category,is_public,likes_count,comments_count,views_count,project_followers_count)
    values($1,'rounding-fixture','Floating boundary','VW','Gol',2000,'Precisão',true,3,0,15,0)`,[A]);
  await check('PERF-05: SQL suggestions preserve scores, terms and ordering of the old complete corpus',async()=>{
    await db.query("select set_config('request.jwt.claim.sub','',false)");
    await db.exec('set role anon');
    corpus=(await db.query(`select ${projection} from cars where is_public order by id`)).rows;
    const terms=['gol','Opala','álcool','alcool','a\u0301lcool','turbo','#turbo','ap 1','clássicos','suspensão','Volks','1999','original','slEEper','zz-absent','precisão'];
    for (const term of terms) {
      const old=JSON.parse(JSON.stringify((await baseline(term,12)).data));
      assert.deepEqual(await rpc(term),old,term);
    }
    return { comparedQueries:terms.length,corpus:corpus.length };
  });
  await db.exec('reset role');
  for (let start=101;start<=5000;start+=250) await seed(start,Math.min(start+249,5000));
  await db.exec('analyze cars');
  await db.exec('vacuum analyze search_support.public_project_documents');
  const measurements=[];
  await check('PERF-05: representative data, candidate index, bytes and EXPLAIN ANALYZE',async()=>{
    await db.exec('set role anon');
    corpus=(await db.query(`select ${projection} from cars where is_public order by id limit 140`)).rows;
    for (const term of ['álcool','turbo','suspensão','4999','Gol']) {
      const before=[];const after=[];let rows;
      for(let run=0;run<3;run++) {
        let start=performance.now();await db.query(`select ${projection} from cars where is_public limit 140`);before.push(performance.now()-start);
        start=performance.now();rows=await rpc(term);after.push(performance.now()-start);
      }
      const plan=(await db.query(`explain (analyze,buffers,format json) select c.id
        from search_support.public_project_documents d join cars c on c.id=d.car_id where c.is_public
        and d.document like '%'||project_suggestion_normalize($1)||'%'`,[term])).rows[0]['QUERY PLAN'];
      measurements.push({term,beforeDatabaseMs:before,afterDatabaseMs:after,
        beforeRows:140,afterSuggestions:rows.length,beforeBytes:Buffer.byteLength(JSON.stringify(corpus)),
        afterBytes:Buffer.byteLength(JSON.stringify(rows)),plan});
    }
    assert.ok(JSON.stringify(measurements).includes('public_project_documents_trgm'));
    return {projects:5000,repetitions:3,measurements:'pesquisa-postgres.json'};
  });
  await check('PERF-05: suggestions find matches beyond 140 and never expose private projects',async()=>{
    assert.ok((await rpc('4999')).some(item=>item.href==='/projeto/search-fixture-4999'));
    assert.equal((await baseline('4999',12)).data.length,0);
    assert.equal((await rpc('4998')).length,0); // multiple of 7: private
    assert.deepEqual(await rpc("';select * from profiles;--"),[]);
  });
  await db.exec('reset role');
  await check('PERF-05: indexed document reflects edit and public/private transitions',async()=>{
    const id='f0000000-0000-4000-8000-000000004999';
    await db.query("update cars set name='Nome exclusivo raríssimo',is_public=false where id=$1",[id]);
    await db.exec('set role anon');assert.deepEqual(await rpc('rarissimo'),[]);
    assert.equal((await db.query('select * from search_support.public_project_documents where car_id=$1',[id])).rows.length,0);
    await assert.rejects(db.query("insert into search_support.public_project_documents values($1,'forged')",[id]),e=>e.code==='42501');
    await db.exec('reset role');
    await db.query('update cars set is_public=true where id=$1',[id]);
    await db.exec('set role anon');assert.equal((await rpc('raríssimo')).length,1);await db.exec('reset role');
  });
  fs.writeFileSync(output+'/pesquisa-postgres.json',JSON.stringify({engine:'native PostgreSQL, UNIX socket, anon role/RLS, 5000 synthetic projects; no HTTP/CDN',measurements},null,2)+'\n');
  if (process.env.GARAGEM_TEST_SEARCH_HTTP === '1') await check('PERF-05: controlled HTTP before/after with the actual application functions',async()=>{
    await (await import('./measure-search-http.mjs')).measureSearchHttp(db,original,helpers,output);
  });
}

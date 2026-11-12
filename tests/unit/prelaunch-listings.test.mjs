import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import ts from 'typescript';

function harness(source,rpcWorks) {
  const rows=[{id:'ba',owner_id:'owner-ba',name:'Gol BA',state:'BA',brand:'VW',model:'Gol',year:2000,tags:[],is_public:true},
    {id:'sp',owner_id:'owner-sp',name:'Gol SP',state:'SP',brand:'VW',model:'Gol',year:2000,tags:[],is_public:true}];
  const evidence={loadedCars:0,hydratedIds:[]};
  function query(table) {
    let selected='',state=null,ids=null;
    const q={select(s){selected=s;return q;},eq(){return q;},ilike(k,v){if(k==='state')state=v;return q;},
      in(k,v){if(k==='id')ids=v;if(table==='car_parts')evidence.hydratedIds=v;return q;},limit(){return q;},order(){return q;},
      then(resolve){
        let data=table==='cars'?rows.filter(r=>(!state||r.state===state)&&(!ids||ids.includes(r.id))):[];
        if(table==='cars'&&selected==='*')evidence.loadedCars+=data.length;
        return Promise.resolve(resolve({data,error:null}));
      }};return q;
  }
  const client={from:query,rpc(name){return name==='search_car_projects'?
    Promise.resolve(rpcWorks?{data:rows.map(r=>({car_id:r.id})),error:null}:{data:null,error:{message:'fixture failure'}}):query(name);}};
  const exports={};const imports={
    'next/cache':{unstable_cache:fn=>fn},'@/lib/car-catalog':{},'@/lib/server-log':{serverLog:{}},
    '@/lib/performance':{logPerformance(){},performanceTimer:()=>({lap(){},end(){}})},'@/lib/projects/cache':{},
    './server':{getSupabasePublicClient:()=>client,getSupabaseServerClient:async()=>null},
    './auth-server':{getSupabaseServerUser:async()=>null},'@/lib/images/project-image-url':{protectedImageUrl:x=>x??null},
  };
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {exports,performance,require:name=>{assert.ok(name in imports,name);return imports[name];}});
  return {evidence,run:()=>exports.qExploreCars({q:'gol',state:'BA'},{personalize:false})};
}
for(const rpcWorks of [true,false])test(`PERF-04: state filter reaches database and hydration (search RPC=${rpcWorks})`,async()=>{
  const current=harness(fs.readFileSync('src/lib/supabase/queries.ts','utf8'),rpcWorks);
  const result=await current.run();assert.equal(result.error,null);assert.deepEqual(Array.from(result.data,r=>r.id),['ba']);
  assert.equal(current.evidence.loadedCars,1);assert.deepEqual(Array.from(current.evidence.hydratedIds),['ba']);
  if(process.env.GARAGEM_LISTING_BASELINE) {
    const before=harness(fs.readFileSync(process.env.GARAGEM_LISTING_BASELINE,'utf8'),rpcWorks);await before.run();
    assert.equal(before.evidence.loadedCars,2);
    fs.writeFileSync(`docs/auditorias/finalizacao-20261031/listagens-${rpcWorks?'rpc':'fallback'}.json`,JSON.stringify({
      environment:'actual old/new application functions; synthetic SDK responses, not SQL timing',before:before.evidence,after:current.evidence,
    },null,2)+'\n');
  }
});

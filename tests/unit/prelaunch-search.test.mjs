import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=fs.readFileSync('src/lib/supabase/queries.ts','utf8');
const body=source.slice(source.indexOf('export async function qProjectSearchSuggestions'),source.indexOf('async function legacyProjectSearchSuggestions'));
const normalize=source.slice(source.indexOf('function normalizeSearchTerm'),source.indexOf('function carSearchText'));
function load(client,legacy=()=>assert.fail('Unexpected broad fallback')) {
  const exports={};
  vm.runInNewContext(ts.transpileModule(normalize+'\n'+body,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {exports,getSupabaseServerClient:async()=>client,legacyProjectSearchSuggestions:legacy});
  return exports.qProjectSearchSuggestions;
}
test('PERF-05: one bounded RPC maps project and generic links without fetching cars',async()=>{
  const calls=[];
  const fn=load({rpc:async(...args)=>{calls.push(args);return {data:[{term:'Álcool',source:'Tag',rank:111,project_slug:null},{term:'Opala',source:'Chevrolet Opala',rank:200,project_slug:'opala'}]};}});
  const result=await fn('  álcool  ',999);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)),[['project_search_suggestions',{p_query:'álcool',p_limit:12}]]);
  assert.deepEqual(Array.from(result.data,r=>r.href),['/explorar?q=%C3%81lcool','/projeto/opala']);
});
test('PERF-05: absent migration alone can invoke the compatibility fallback',async()=>{
  for(const code of ['PGRST202','42883']) {
    let fallbacks=0;const fn=load({rpc:async()=>({error:{code}})},async()=>{fallbacks++;return {data:[],error:null};});
    await fn('gol');assert.equal(fallbacks,1);
  }
});
test('PERF-05: permission/timeout errors never trigger an expensive broad query',async()=>{
  const fn=load({rpc:async()=>({error:{code:'42501',message:'denied'}})});
  assert.equal((await fn('gol')).error,'denied');
});
test('PERF-05: empty/punctuation queries make no RPC and invalid limits default safely',async()=>{
  let calls=0;const fn=load({rpc:async(_name,args)=>{calls++;assert.equal(args.p_limit,8);return {data:[]};}});
  for(const term of ['','x','##','   ','%_'])await fn(term);
  assert.equal(calls,0);await fn('gol',NaN);assert.equal(calls,1);
});

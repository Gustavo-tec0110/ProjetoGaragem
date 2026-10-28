/* global Request, Response */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { URL } from 'node:url';
import ts from 'typescript';
import { publicOffer } from '../../src/lib/modifications/offers.ts';

function routeHarness({local=false,demo=false,data=[],error=null,rate=true}={}) {
  const exports={};
  const queries=[];
  const query={select(){return this},eq(){return this},not(){return this},order(){return this},limit(){return Promise.resolve({data,error})}};
  const imports={
    '@/lib/modifications/local-offers':{localOffersEnabled:()=>local,localCatalogOffers:async slug=>({offers:[],demonstration:false,slug})},
    '@/lib/modifications/demo-offers':{catalogOfferDemoEnabled:()=>demo,demoCatalogOffers:()=>({offers:[],demonstration:true})},
    '@/lib/supabase/server':{getSupabasePublicClient:()=>({from:table=>{queries.push(table);return query}})},
    '@/lib/modifications/offers':{publicOffer}, '@/lib/security/request-rate-limit':{allowRequest:()=>({ok:rate,retryAfter:12})},
    '@/lib/server-log':{serverLog:{warn(){}}},
  };
  runInNewContext(ts.transpileModule(readFileSync('src/app/api/catalog/[id]/offers/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Response,URL,require:name=>{assert.ok(name in imports,name);return imports[name]}});
  return {queries,get:(id,slug='turbo',preview=false)=>exports.GET(new Request(`http://127.0.0.1/api/catalog/${id}/offers?slug=${slug}${preview?'&demonstration=1':''}`),{params:Promise.resolve({id})})};
}
const id='11111111-1111-4111-8111-111111111111';

test('offers API validates, rate-limits and isolates local preview from DB reads', async()=>{
  const h=routeHarness({local:true,demo:true});
  assert.equal((await h.get('invalid')).status,400);
  assert.equal((await h.get('local-turbo','')).status,400);
  const result=await h.get('local-turbo');
  assert.equal((await result.json()).demonstration,false,'real local manifest takes precedence over demo');
  assert.equal(h.queries.length,0);
  assert.equal(result.headers.get('Cache-Control'),'no-store');
  const normal=routeHarness({demo:true});
  assert.equal((await (await normal.get(id)).json()).demonstration,false,'normal page never receives demo data');
  assert.equal(normal.queries.length,1);
  const preview=routeHarness({demo:true});
  assert.equal((await (await preview.get(id,'turbo',true)).json()).demonstration,true);
  assert.equal(preview.queries.length,0);
  const limited=await routeHarness({rate:false}).get(id);
  assert.equal(limited.status,429);
  assert.equal(limited.headers.get('Retry-After'),'12');
});

test('offers API hides unreviewed or inactive rows; DB errors return safe unavailable state',async()=>{
  const row={id,catalog_id:id,store:'magalu',destination_url:'https://www.magazinevoce.com.br/test-fixture',product_url:'https://www.magazineluiza.com.br/test-fixture',is_active:true,is_affiliate:true,product_name:'Fixture de componente',compatibility_notes:'Fixture de aplicação',verified_at:'2026-01-01T12:00:00Z',price:100,price_checked_at:'2020-01-01T12:00:00Z',source:'manual',source_product_id:'private-provider-id'};
  const h=routeHarness({data:[row,{...row,id:'unreviewed',verified_at:null},{...row,id:'inactive',is_active:false}]});
  const result=await (await h.get(id)).json();
  assert.equal(result.offers.length,1);
  assert.equal(result.offers[0].store,'magalu');
  assert.equal(result.offers[0].price,null);
  assert.equal(result.offers[0].source_product_id,undefined);
  const failed=await (await routeHarness({error:{code:'42P01',message:'internal-detail'}}).get(id)).json();
  assert.equal(failed.unavailable,true);
  assert.equal(failed.offers.length,0);
  assert.doesNotMatch(JSON.stringify(failed),/internal-detail/);
});

test('local offers flag is ignored in production even when retained',()=>{
  for(const mode of ['production','development','test']) {
    const exports={};
    const code=ts.transpileModule(readFileSync('src/lib/modifications/local-offers.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
    runInNewContext(code,{exports,process:{env:{NODE_ENV:mode,CATALOG_OFFERS_LOCAL:'1'}},require:()=>({})});
    assert.equal(exports.localOffersEnabled(),mode==='development');
  }
});

test('local manifest serves only reviewed offers for the requested slug and never crosses components',async()=>{
  const row={id,catalog_slug:'turbo',store:'amazon',destination_url:'https://amzn.to/test-fixture',product_url:'https://amazon.com.br/test-fixture',is_active:true,is_affiliate:true,product_name:'Produto de teste',compatibility_notes:'Fixture de aplicação revisada',verified_at:'2026-01-01T12:00:00Z',price:null,price_checked_at:null,source:'manual',source_product_id:null};
  const {validateManagedOffer}=await import('../../src/lib/modifications/offers.ts');
  const exports={};
  let manifest={version:1,offers:[row,{...row,id:'22222222-2222-4222-8222-222222222222',catalog_slug:'radiador'}]};
  const imports={'server-only':{},'node:fs/promises':{readFile:async()=>JSON.stringify(manifest)},'node:path':{join:(...segments)=>segments.join('/')},'./catalog-definitions.json':[{slug:'turbo'},{slug:'radiador'}],'./offers':{publicOffer,validateManagedOffer}};
  const code=ts.transpileModule(readFileSync('src/lib/modifications/local-offers.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;
  runInNewContext(code,{exports,process:{env:{},cwd:()=>'/local'},require:name=>imports[name]});
  const turbo=await exports.localCatalogOffers('turbo');
  assert.equal(turbo.offers.length,1);
  assert.equal(turbo.offers[0].id,id);
  assert.equal((await exports.localCatalogOffers('coilover')).offers.length,0);
  manifest={version:1,offers:[{...row,is_active:false}]};
  assert.equal((await exports.localCatalogOffers('turbo')).offers.length,0);
  manifest={version:99,offers:[]};
  await assert.rejects(exports.localCatalogOffers('turbo'),/Invalid local offers/);
});

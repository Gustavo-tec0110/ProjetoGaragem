import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { withCatalogModifications } from '../../src/lib/modifications/project-overview.ts';

const category = { id:'category', slug:'motor-performance', name:'Motor' };
const catalog = { id:'catalog',category_id:'category',slug:'turbo',name:'Turbocompressor',category,default_image_path:'/approved.webp' };
const row = { id:'mod',catalog_id:'catalog',car_id:'car',status:'installed',paid_amount:null,note:'private',project_photo_storage_path:'private',show_paid_amount:false,public_description:'Descrição pública',catalog,project_photo_url:null };

test('overview joins catalog, preserves legacy records and does not copy private notes or storage paths', () => {
  const project = { installedParts:[{id:'legacy',name:'Peça antiga'}],plannedParts:[],removedParts:[] };
  const result = withCatalogModifications(project,[row,row,{...row,id:'wish',status:'wishlist'},{...row,id:'removed',status:'removed'}]);
  assert.equal(result.installedParts.length,2,'same modification id appears once');
  assert.equal(result.installedParts[1].id,'legacy');
  assert.equal(result.installedParts[0].imageUrl,'/approved.webp');
  assert.equal(result.installedParts[0].description,'Descrição pública');
  assert.equal(result.installedParts[0].catalog.id,'catalog');
  assert.equal(result.plannedParts[0].wishlist,true);
  assert.equal(result.removedParts.length,1);
  assert.equal(result.modificationsCount,4);
  assert.doesNotMatch(JSON.stringify(result),/private/);
  assert.equal(withCatalogModifications(project,[{...row,project_photo_url:'/real.webp'}]).installedParts[0].imageUrl,'/real.webp');
});

function serverHarness(rows, failed = null) {
  const calls=[];
  function query(table) {
    calls.push({table,filters:[]});
    const entry=calls.at(-1);
    return {select(){return this},eq(key,value){entry.filters.push([key,value]);return this},in(key,value){entry.filters.push([key,value]);return this},order(){return this},
      then(resolve){return Promise.resolve(resolve({data:table.includes('modifications')?rows:table==='modification_catalog'?[catalog]:[category],error:table===failed?{code:'test'}:null}))}};
  }
  const exports={};
  const imports={'server-only':{},'@/lib/supabase/server':{getSupabaseServerClient:async()=>({from:query,rpc:query})},'@/lib/server-log':{serverLog:{warn(){}}},'./catalog-definitions.json':[],
    '@/lib/modifications/approved-catalog-images':{resolveApprovedCatalogImage:()=>'/approved.webp'},'@/lib/images/project-image-url':{protectedImageUrl:value=>value}};
  runInNewContext(ts.transpileModule(readFileSync('src/lib/modifications/server.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{exports,require:name=>{assert.ok(name in imports,name);return imports[name]}});
  return {calls,load:exports.getProjectModificationData};
}

test('overview queries only linked catalog ids and uses public RPC; empty projects skip catalog queries', async () => {
  const h=serverHarness([row]);
  const result=await h.load('car',false,true);
  assert.equal(h.calls[0].table,'list_public_project_modifications');
  const idFilter=h.calls.find(call=>call.table==='modification_catalog').filters.find(([key])=>key==='id');
  assert.equal(JSON.stringify(idFilter),JSON.stringify(['id',['catalog']]));
  assert.equal(result.modifications[0].note,null);
  assert.equal(result.modifications[0].project_photo_storage_path,null);
  const empty=serverHarness([]);
  assert.equal((await empty.load('car',false,true)).modifications.length,0);
  assert.equal(empty.calls.length,1);
  const owner=serverHarness([row]);
  await owner.load('car',true,true);
  assert.equal(owner.calls[0].table,'project_modifications');
  await assert.rejects(serverHarness([row],'modification_catalog').load('car',false,true),/catálogo/);
});

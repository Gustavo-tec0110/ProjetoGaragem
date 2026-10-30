import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
function load(path,mocks){
 const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,require:name=>mocks[name]??new Proxy({}, {get:(_,k)=>k})});
 return module.exports;
}
const profile={id:'fixture-owner',is_saves_public:false,is_likes_public:false};
for(const [tab,owner,visible,expected] of [
 ['projetos',true,false,['cars']],['salvos',true,false,['cars','saved']],
 ['curtidos',true,false,['cars','liked']],['seguindo',true,false,['cars','following']],
 ['salvos',false,false,['cars']],['curtidos',false,false,['cars']],['seguindo',false,false,['cars']],
 ['salvos',false,true,['cars','saved']],['curtidos',false,true,['cars','liked']],
 ['invalido',true,false,['cars']],
])test(`PERF-03: ${tab}, owner=${owner}, public relations=${visible}`,async()=>{
 const calls=[];const cars=Array.from({length:25},(_,i)=>({slug:`fixture-${i}`,likes_count:i,main_photo_url:'/fixture.webp'}));
 const query=name=>async(...args)=>{calls.push(name);if(name==='cars')assert.deepEqual(args,['fixture-owner',owner]);return{data:name==='cars'?cars:Array.from({length:80},(_,i)=>({slug:`reference-${i}`})),error:null};};
 const {ProfileExperience}=load('src/components/garage/profile-experience.tsx',{
  'react/jsx-runtime':jsx,'@/lib/supabase/queries':{qCarsByOwner:query('cars'),qSavedCars:query('saved'),qLikedCars:query('liked'),qFollowingProfiles:query('following')},
  '@/lib/projects/server':{getProjectCollection:()=>assert.fail('Unrequested planner'),getProjectsBySlugs:()=>assert.fail('Unrequested planner')},
 });
 const result=await ProfileExperience({profile:{...profile,is_saves_public:visible,is_likes_public:visible},isOwner:owner,activeTab:tab,baseHref:'/perfil/fixture',showPrivateTools:true});
 assert.deepEqual(calls,expected);
 const header=result.props.children[1];assert.equal(header.props.projectsCount,25);assert.equal(header.props.likesReceived,300);assert.equal(header.props.coverImage,'/fixture.webp');
});
test('PERF-04: summary uses the existing authorized card and skips details and recommendations',async()=>{
 let cards=0;const car={id:'fixture',is_public:false};
 const {getProjectSummary}=load('src/lib/projects/server.ts',{
  react:{cache:fn=>fn},'@/lib/supabase/env':{isSupabaseConfigured:true},
  '@/lib/supabase/queries':{qCarCardBySlug:async slug=>{cards++;return{data:slug==='owner-private'?car:null};},qExploreCars:()=>assert.fail('No recommendations'),qCarDetailsFromCard:()=>assert.fail('No details')},
  '@/lib/projects/mappers':{mapCarCardToProject:row=>row},
 });
 assert.equal(await getProjectSummary('owner-private'),car);
 assert.equal(await getProjectSummary('unauthorized'),null);assert.equal(cards,2);
});
test('PERF-03: opening planner requires authentication before any private query',async()=>{
 const {loadPrivateInspirationPlanner}=load('src/app/garagem/planner-actions.ts',{
  '@/lib/supabase/auth-server':{requireSupabaseUser:async()=>({user:null})},
  '@/lib/supabase/queries':{qCarsByOwner:()=>assert.fail('No private query'),qSavedCars:()=>assert.fail('No private query')},
 });
 await assert.rejects(loadPrivateInspirationPlanner(),/Entre novamente/);
});
for(const saved of [true,false])test(`PERF-03: planner uses current owner, public fallback only without saved references (${saved})`,async()=>{
 let catalogs=0;const requests=[];
 const {loadPrivateInspirationPlanner}=load('src/app/garagem/planner-actions.ts',{
  '@/lib/supabase/auth-server':{requireSupabaseUser:async()=>({user:{id:'owner-A'}})},
  '@/lib/supabase/queries':{qCarsByOwner:async(id,privateAccess)=>{assert.equal(id,'owner-A');assert.equal(privateAccess,true);return{data:[{slug:'own'}]};},qSavedCars:async id=>{assert.equal(id,'owner-A');return{data:saved?[{slug:'saved'}]:[]};}},
  '@/lib/projects/server':{getProjectCollection:async(filters,personalize)=>{catalogs++;assert.equal(personalize,false);return{allProjects:[{slug:'own'},...Array.from({length:25},(_,i)=>({slug:`public-${i}`}))]};},getProjectsBySlugs:async slugs=>{requests.push([...slugs]);return slugs.map(slug=>({slug}));}},
 });
 const data=await loadPrivateInspirationPlanner('owner-B');assert.equal(data.storageScope,'owner-A');assert.equal(catalogs,saved?0:1);assert.equal(requests[1].length,saved?1:12);assert.equal(data.referenceSourceLabel,saved?'Projetos salvos':'Projetos em destaque');assert(!requests[1].includes('own'));
});

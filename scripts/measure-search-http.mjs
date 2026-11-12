/* global performance, fetch */
import http from 'node:http';
import { URL } from 'node:url';
import ts from 'typescript';
import fs from 'node:fs';
import { chromium } from '@playwright/test';

export async function measureSearchHttp(db, original, helpers, output) {
  const current=fs.readFileSync('src/lib/supabase/queries.ts','utf8');
  const wrapper=current.slice(current.indexOf('export async function qProjectSearchSuggestions'),current.indexOf('async function legacyProjectSearchSuggestions'));
  const compile=body=>ts.transpileModule(helpers+'\n'+body,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const scripts={before:compile(original),after:compile(wrapper)};
  const server=http.createServer(async(req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1');
    if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Isolated search benchmark</title>');return;}
    try {
      let rows;
      if(url.pathname==='/before') rows=(await db.query('select id,slug,name,brand,model,year,engine,category,description,tags,likes_count,comments_count,views_count,project_followers_count from cars where is_public limit 140')).rows;
      else if(url.pathname==='/after') rows=(await db.query('select * from project_search_suggestions($1,12)',[url.searchParams.get('q')])).rows;
      else {res.writeHead(404);res.end();return;}
      res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(rows));
    } catch {res.writeHead(500);res.end('{}');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true});const rows=[];
  await db.query("select set_config('request.jwt.claim.sub','',false)");await db.exec('set role anon');
  try {
    for(const term of ['álcool','suspensão','Gol']) for(let run=1;run<=3;run++) for(const mode of ['before','after']) {
      const context=await browser.newContext();
      await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
      const page=await context.newPage();await page.goto(origin);
      const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');
      await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
      await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6e6/8,uploadThroughput:1.6e6/8});
      await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
      const result=await page.evaluate(async({script,term})=>{
        const client={from(){const query={select:()=>query,eq:()=>query,limit:async()=>({data:await(await fetch('/before')).json(),error:null})};return query;},
          rpc:async(_name,args)=>({data:await(await fetch('/after?q='+encodeURIComponent(args.p_query))).json(),error:null})};
        const fn=new Function('getSupabaseServerClient',`const exports={};${script};return exports.qProjectSearchSuggestions;`)(async()=>client);
        const start=performance.now();const result=await fn(term,12);const durationMs=performance.now()-start;
        if(result.error)throw new Error(result.error);
        const resource=performance.getEntriesByType('resource').at(-1);
        return {durationMs,suggestions:result.data.length,responseBytes:resource.encodedBodySize};
      },{script:scripts[mode],term});
      rows.push({term,run,mode,...result});await context.close();
    }
    fs.writeFileSync(output+'/pesquisa-http.json',JSON.stringify({environment:'same native DB/RLS; tiny loopback HTTP gateway (not PostgREST); real old/new application functions; Chromium CPU 4x, CDP 150ms and 1.6Mbit/s; cold browser contexts; 3 alternating repetitions',rows},null,2)+'\n');
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));await db.exec('reset role');}
}

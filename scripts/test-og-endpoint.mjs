/* global process, console, fetch, URL, AbortSignal, setTimeout */
// Actual Next HTTP route + real SDK/renderer + fictitious local Supabase/Storage.
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createWriteStream, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const out=path.resolve('results');
mkdirSync(out,{recursive:true});
for(const name of ['.env','.env.local','.env.development','.env.development.local']) {
  if(existsSync(name))throw Error('Run OG fixtures only in an isolated copy without environment files');
}
const key='11111111-1111-4111-8111-111111111111/cars/fixture.png';
const png=await sharp({create:{width:32,height:24,channels:3,background:'#ff2222'}}).png().toBuffer();
let mode='legitimate';let forbidden=0;let target=0;let downloads=0;
const car={id:'33333333-3333-4333-8333-333333333333',owner_id:'11111111-1111-4111-8111-111111111111',name:'Gol de teste',brand:'VW',model:'Gol',year:2000,category:'Projeto',likes_count:1,saves_count:2,comments_count:3};
const fixture=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1:3200');
  res.setHeader('Content-Type','application/json');
  if(url.pathname==='/forbidden'){forbidden++;res.end('{}');return;}
  if(url.pathname==='/redirect-target'){target++;res.end('{}');return;}
  if(url.pathname.startsWith('/storage/')){
    downloads++;
    if(mode==='redirect'){res.writeHead(302,{Location:'http://127.0.0.1:3200/redirect-target'});res.end();return;}
    res.setHeader('Content-Type','image/png');res.end(png);return;
  }
  if(url.pathname==='/rest/v1/rpc/can_read_project_image'){res.end(JSON.stringify(mode!=='private-image'));return;}
  if(url.pathname==='/rest/v1/cars'){
    const main_photo_url=mode==='loopback'?'http://127.0.0.1:3200/forbidden':mode==='external'?'https://untrusted.invalid/a.png':mode==='missing'?null:`/api/media/project/${key}`;
    res.end(JSON.stringify(mode==='private-car'?null:{...car,main_photo_url}));return;
  }
  if(url.pathname==='/rest/v1/public_profiles'){res.end('{"username":"fixture","display_name":"Fixture"}');return;}
  if(url.pathname==='/rest/v1/car_parts'){res.end('[]');return;}
  res.statusCode=404;res.end('{}');
});
await new Promise(r=>fixture.listen(3200,'127.0.0.1',r));
const guard=path.join(out,'network-local-only.cjs');
writeFileSync(guard,`const realFetch=globalThis.fetch;globalThis.fetch=(input,init)=>{const u=new URL(typeof input==='string'||input instanceof URL?input:input.url);if(!['127.0.0.1','localhost','[::1]'].includes(u.hostname))throw Error('EXTERNAL_FETCH_BLOCKED');return realFetch(input,init);};`);
const log=createWriteStream(path.join(out,'og-next-server.log'));
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','3120'],{env:{PATH:process.env.PATH,HOME:process.env.HOME,NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3200',NEXT_PUBLIC_SUPABASE_ANON_KEY:'fixture-anon',NODE_OPTIONS:`--require=${guard}`},stdio:['ignore','pipe','pipe']});
child.stdout.pipe(log);child.stderr.pipe(log);
const results=[];
try {
  for(let i=0;i<90;i++){
    try {const r=await fetch('http://127.0.0.1:3120/api/auth/session',{signal:AbortSignal.timeout(2000)});if(r.ok)break;}catch{ /* The local server is still starting. */ }
    if(i===89)throw Error('Next fixture startup timeout');
    await new Promise(r=>setTimeout(r,1000));
  }
  for(const scenario of ['legitimate','loopback','external','private-image','missing','redirect','private-car']){
    mode=scenario;
    const before=downloads;
    const response=await fetch('http://127.0.0.1:3120/api/og/fixture',{signal:AbortSignal.timeout(60000)});
    assert.equal(response.status,scenario==='private-car'?404:200,scenario);
    if(response.ok){
      assert.match(response.headers.get('content-type'),/image\/png/);
      const image=Buffer.from(await response.arrayBuffer());
      const meta=await sharp(image).metadata();assert.equal(meta.width,1200);assert.equal(meta.height,630);
      writeFileSync(path.join(out,`og-${scenario}.png`),image);
    }
    if(['loopback','external','private-image','missing','private-car'].includes(scenario))assert.equal(downloads,before,scenario);
    assert.equal(forbidden,0);assert.equal(target,0);
    results.push({scenario,status:response.status,downloads:downloads-before,passed:true});
  }
  writeFileSync(path.join(out,'og-endpoint.json'),JSON.stringify({results,forbidden,target,backend:'local HTTP fixtures; real SDK and Next route'},null,2));
  console.log(JSON.stringify(results));
}finally{
  child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));
  fixture.closeAllConnections();await new Promise(r=>fixture.close(r));log.end();
}

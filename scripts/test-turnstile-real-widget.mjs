// Explicit opt-in manual local harness. Real Cloudflare, isolated widget only.
// Tokens stay in memory; no credentials, tokens or response bodies are logged.
import http from 'node:http';
import fs from 'node:fs';
import console from 'node:console';
import { URLSearchParams } from 'node:url';
import { setTimeout } from 'node:timers';
import { localRoot } from './auth-real-local-utils.mjs';
const keys = JSON.parse(fs.readFileSync(localRoot+'/turnstile.private.json','utf8'));
const origin = 'http://127.0.0.1:3195';
const results = { provider:'Cloudflare real local widget', mocks:false, production:false, tests:[] };
let pendingExpiry = false;
function save(name, response, expected) {
  const entry = {name, success:response.success, errors:response['error-codes']??[],
    hostname:response.hostname??null, passed:response.success===expected};
  results.tests.push(entry);
  fs.writeFileSync('docs/auditorias/auth/finalizacao/turnstile-real-widget.json',JSON.stringify(results,null,2)+'\n');
  console.info(JSON.stringify(entry));
}
async function verify(token) {
  const response = await globalThis.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method:'POST', body:new URLSearchParams({secret:keys.secret,response:token}),
  });
  if(!response.ok) throw new Error('Siteverify HTTP failure');
  return response.json();
}
// A deliberately separate test page: the app must let Supabase consume its own
// token once. Never add this double validation to production authentication.
const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Turnstile real — teste isolado</title>
<body style="background:#161616;color:white;font:18px system-ui;padding:36px">
<h1>Turnstile real — teste isolado</h1><p>Sem contas, dados de produção ou mocks. Tokens somente em memória.</p>
<h2>Uso único</h2><div id="once"></div><p id="once-status">Aguardando desafio automático.</p>
<h2>Expiração real (aguardar 310 segundos)</h2><div id="expiry"></div><p id="expiry-status">Aguardando desafio automático.</p>
<script>
async function send(kind,token){
 document.getElementById(kind+'-status').textContent=kind==='expiry'?'Token recebido; aguardando expiração real por 310 segundos.':'Validando token e repetição.';
 const r=await fetch('/'+kind,{method:'POST',headers:{'Content-Type':'text/plain'},body:token});
 const data=await r.json();document.getElementById(kind+'-status').textContent=JSON.stringify(data);
}
window.ready=()=>{turnstile.render('#once',{sitekey:${JSON.stringify(keys.siteKey)},callback:t=>send('once',t)});
turnstile.render('#expiry',{sitekey:${JSON.stringify(keys.siteKey)},callback:t=>send('expiry',t)});};
</script><script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=ready&render=explicit" async defer></script></body></html>`;
http.createServer(async(req,res)=>{
  try {
    if(req.method==='GET'&&req.url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}
    if(req.method!=='POST'||req.headers.origin!==origin||!['/once','/expiry'].includes(req.url)) {res.writeHead(403).end();return;}
    let token='';for await(const chunk of req){token+=chunk;if(token.length>4096){res.writeHead(413).end();return;}}
    if(req.url==='/once'){
      save('fresh_token',await verify(token),true);
      save('reused_token',await verify(token),false);
    } else {
      if(pendingExpiry){res.writeHead(409).end();return;}pendingExpiry=true;
      // Long delay is in the independent local server, never a blocking tool wait.
      await new Promise(resolve=>setTimeout(resolve,310000));
      save('expired_token_after_310_seconds',await verify(token),false);
    }
    token='';res.setHeader('Content-Type','application/json');res.end(JSON.stringify(results));
  } catch {res.writeHead(502).end('Local test failed; no private details logged.');}
}).listen(3195,'127.0.0.1',()=>console.info('Real widget harness: '+origin));

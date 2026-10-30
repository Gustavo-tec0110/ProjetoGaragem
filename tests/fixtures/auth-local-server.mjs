/* global Buffer, console, URL */
// HTTP contract fixture; never proxies to another host or creates real users.
import http from 'node:http';
const id='11111111-1111-4111-8111-111111111111';
let accepted=false, expired=false, provider='google', calls=[];
const user=()=>({id,email:'fixture@example.invalid',aud:'authenticated',role:'authenticated',
  app_metadata:{provider,providers:[provider]},user_metadata:{full_name:'Fixture local'},
  created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z'});
const token=()=>['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'fixture-signature'].join('.');
http.createServer(async(req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:3198');
  res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,x-supabase-api-version');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.setHeader('Content-Type','application/json');
  if(req.method==='OPTIONS'){res.end();return;}
  let body='';for await(const part of req)body+=part;
  const url=new URL(req.url,'http://127.0.0.1:3199');
  const send=(status,value)=>{res.statusCode=status;res.end(JSON.stringify(value));};
  if(url.pathname==='/__fixture/reset') {const state=body?JSON.parse(body):{};accepted=Boolean(state.accepted);expired=Boolean(state.expired);provider=state.provider??'google';calls=[];return send(200,{});}
  if(url.pathname==='/__fixture/calls')return send(200,calls);
  calls.push({path:url.pathname,method:req.method,body:body?JSON.parse(body):null});
  if(url.pathname==='/auth/v1/user')return expired?send(401,{code:'session_not_found',message:'Session expired'}):send(200,user());
  if(url.pathname==='/auth/v1/token') {
    const input=body?JSON.parse(body):{};
    if(url.searchParams.get('grant_type')==='password' && input.gotrue_meta_security?.captcha_token!=='fixture-valid')
      return send(400,{code:'captcha_failed',msg:'captcha_failed'});
    return send(200,{access_token:token(),refresh_token:'fixture-refresh-token',token_type:'bearer',expires_in:3600,user:user()});
  }
  if(url.pathname==='/auth/v1/signup'||url.pathname==='/auth/v1/recover') {
    const input=body?JSON.parse(body):{};
    if(input.gotrue_meta_security?.captcha_token!=='fixture-valid')return send(400,{code:'captcha_failed',msg:'captcha_failed'});
    return send(200,url.pathname.endsWith('/signup')?user():{});
  }
  if(url.pathname==='/auth/v1/logout')return send(204,null);
  if(url.pathname==='/rest/v1/rpc/has_current_terms_acceptance')return send(200,accepted&&!expired);
  if(url.pathname==='/rest/v1/rpc/accept_current_terms') {accepted=true;return send(200,null);}
  if(url.pathname==='/rest/v1/profiles')return send(200,{id,username:'fixture-local',display_name:'Fixture local'});
  if(url.pathname.startsWith('/rest/v1/'))return send(200,[]);
  send(404,{message:'No fixture for '+url.pathname});
}).listen(3199,'127.0.0.1',()=>console.info('Auth fixture: http://127.0.0.1:3199'));

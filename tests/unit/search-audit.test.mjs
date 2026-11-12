import { URL } from "node:url";
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const { Request, Response } = globalThis;

function compile(file, modules) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => {
    assert.ok(Object.hasOwn(modules, name), `Unexpected dependency: ${name}`);
    return modules[name];
  }, URL, Response });
  return exports;
}
function profiles(client) {
  return compile('src/lib/search/public-profiles.ts', {
    'server-only': {}, '@/lib/supabase/server': { getSupabasePublicClient: () => client },
  }).searchPublicProfiles;
}
function route({ projectError = null, profileError = false, allowed = true } = {}) {
  let calls = 0;
  const { GET } = compile('src/app/api/projects/search-suggestions/route.ts', {
    'next/server': { NextResponse: { json: (value, options) => Response.json(value, options) } },
    '@/lib/supabase/queries': { qProjectSearchSuggestions: async () => {
      calls++; return { data: Array.from({length:8}, (_, i) => ({term: `Projeto ${i}`, source: 'Projeto'})), error: projectError };
    } },
    '@/lib/search/public-profiles': { searchPublicProfiles: async () => {
      calls++; return { data: [{ username: 'pessoa_publica', display_name: 'Pessoa pública' }], error: profileError };
    } },
    '@/lib/security/request-rate-limit': { allowRequest: () => ({ ok: allowed, retryAfter: 9 }) },
  });
  return { GET, calls: () => calls };
}

test('public user search selects only public display fields, handles and a bounded limit', async () => {
  const calls = [];
  const chain = {};
  for (const method of ['select','or','not','order']) chain[method] = (...args) => { calls.push([method, ...args]); return chain; };
  chain.limit = async n => { calls.push(['limit', n]); return { data: [{ username:'pessoa', display_name:'Pessoa' }, { username:null }], error:null }; };
  const fn = profiles({ from: table => { assert.equal(table,'public_profiles'); return chain; } });
  const result = await fn('@pessoa', 999);
  assert.equal(result.data.length, 1);
  assert.deepEqual(calls[0], ['select','username,display_name']);
  assert.deepEqual(calls[1], ['or','username.ilike."%pessoa%",display_name.ilike."%pessoa%"']);
  assert.deepEqual(calls.at(-1), ['limit',12]);
});

test('public user search escapes filter operands, quotes, backslashes and literal SQL wildcards', async () => {
  let filter;
  const chain = { select: () => chain, or: value => { filter=value; return chain; }, not: () => chain, order: () => chain,
    limit: async () => ({data:[],error:null}) };
  await profiles({from: () => chain})('a%_",username.neq.x\\', NaN);
  assert.equal(filter, 'username.ilike."%a\\\\%\\\\_\\",username.neq.x\\\\\\\\%",display_name.ilike."%a\\\\%\\\\_\\",username.neq.x\\\\\\\\%"');
});

test('empty public user searches make no request and failures remain distinguishable', async () => {
  const fn = profiles({from: () => assert.fail('Unexpected read')});
  for (const term of ['','a','@a','%%','__','",()','a*b']) assert.equal((await fn(term)).data.length,0);
  const chain = {select: () => chain, or: () => chain, not: () => chain, order: () => chain, limit: async () => ({data:null,error:{message:'private diagnostic'}})};
  assert.equal((await profiles({from: () => chain})('pessoa')).error,true);
});

for (const opts of [{projectError:'private diagnostic'}, {profileError:true}]) {
  test(`suggestion API reports upstream failure without caching empty success ${JSON.stringify(opts)}`, async () => {
    const response = await route(opts).GET(new Request('http://localhost/api?q=gol'));
    assert.equal(response.status,503);
    assert.equal(response.headers.get('cache-control'),'no-store');
    assert.deepEqual(await response.json(),{suggestions:[]});
  });
}

test('suggestion API merges public user links with project suggestions and keeps eight results', async () => {
  const response = await route().GET(new Request('http://localhost/api?q=gol'));
  const {suggestions} = await response.json();
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(suggestions.length,8);
  assert.equal(suggestions[0].href,'/perfil/pessoa_publica');
  assert.equal(suggestions[0].source,'Usuário');
  assert.equal(Object.hasOwn(suggestions[0],'email'),false);
});

test('suggestion API keeps rate limits and avoids upstream calls for a short query', async () => {
  const short=route();
  assert.equal((await short.GET(new Request('http://localhost/api?q=g'))).status,200);
  assert.equal(short.calls(),0);
  const limited=route({allowed:false});
  const response=await limited.GET(new Request('http://localhost/api?q=gol'));
  assert.equal(response.status,429);
  assert.equal(response.headers.get('retry-after'),'9');
  assert.equal(limited.calls(),0);
});

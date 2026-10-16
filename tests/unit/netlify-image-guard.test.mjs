/* global Request, Response, URL */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const exports = {};
runInNewContext(ts.transpileModule(readFileSync(new URL("../../netlify/edge-functions/protect-project-images.ts",import.meta.url),"utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, URL, Response });
const guard = exports.default;
const request = (source, endpoint="/.netlify/images") => new Request(`https://projetogaragem.com.br${endpoint}?url=${encodeURIComponent(source)}&w=640`);

test("Netlify guard runs before simulated cached private images and blocks encoded/nested aliases",async()=>{
  let cacheHits=0;
  const context={next:async()=>{cacheHits++;return new Response("previously public photo");}};
  for(const source of [
    "/api/media/project/owner/private.webp", "/api/og/project", "/api%2fmedia%2fproject/private.webp",
    "/ref/%2e%2e%2fapi/media/project/private.webp", "/ref/../api/media/project/private.webp",
    "/partnerships/creators/%2e%2e%2fapi/media/project/private.webp",
    "/partnerships/creators/../../../api/media/project/private.webp",
    "/partnerships/creators/perfil-exemplo-avatar.webp?token=old",
    "https://project.supabase.co/storage/v1/object/public/project-images/owner/private.webp",
    "https://project.supabase.co/storage/v1/object/sign/project-images/private.webp?token=old",
    "/.netlify/images?url=/api/media/project/private.webp", "https://evil.test/ref/private.webp",
  ]) for(const endpoint of ["/.netlify/images","/_next/image"]){
    const response=await guard(request(source,endpoint),context);
    assert.equal(response.status,404,source);
    assert.equal(await response.text(),"");
    assert.equal(response.headers.get("Netlify-CDN-Cache-Control"),"no-store");
  }
  assert.equal(cacheHits,0);
});

test("Netlify guard preserves shipped assets and existing permitted public external images",async()=>{
  let forwards=0;
  const sources = ["/ref/hero-opala-ss.webp","/modifications/brakes/discos.webp","/og-image.jpg","https://images.unsplash.com/photo-test?auto=format","https://lh3.googleusercontent.com/avatar",
    "/partnerships/creators/colecao-parceria.webp", "/partnerships/creators/perfil-exemplo-avatar.webp"];
  for(const source of sources) for(const endpoint of ["/.netlify/images","/_next/image"]){
    assert.equal((await guard(request(source, endpoint),{next:async()=>{forwards++;return new Response("static image");}})).status,200);
  }
  assert.equal(forwards,sources.length * 2);
});

test("missing/duplicate source parameters fail closed",async()=>{
  for(const query of ["w=640","url=/ref/hero.webp&url=/api/media/project/private.webp"]){
    const response=await guard(new Request(`https://projetogaragem.com.br/.netlify/images?${query}`),{next:async()=>{throw new Error("must not forward");}});
    assert.equal(response.status,404);
  }
});

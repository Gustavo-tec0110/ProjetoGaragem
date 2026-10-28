import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const selected=read('src/lib/modifications/approved-catalog-images.json');
const previous=read('src/lib/modifications/catalog-assets.json');
const manifest=read('artifacts/catalog-ai-2026-10-27/planning/manifest.json');

test('all 263 selected images are exact copies, preserving final approval and electrical v3', async()=>{
 assert.equal(Object.keys(selected).length,263);
 for(const row of manifest){
  assert.equal(row.human_approval,'APROVADO PELO USUÁRIO');
  assert.equal(selected[row.slug].category,row.category);
  const source=readFileSync('artifacts/catalog-ai-2026-10-27/'+row.selected_file);
  const dest=readFileSync('public'+selected[row.slug].image);
  assert.equal(createHash('sha256').update(dest).digest('hex'),createHash('sha256').update(source).digest('hex'),row.slug);
  const meta=await sharp(dest).metadata();
  assert.equal(meta.width,512);assert.equal(meta.height,512);assert.equal(meta.format,'webp');
 }
 assert.equal(manifest.find(row=>row.slug==='instrumentacao-eletrica').selected_version,'v3');
});

test('approved resolution respects categories and independently curated database images',()=>{
 const exports={};
 const code=ts.transpileModule(readFileSync('src/lib/modifications/approved-catalog-images.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 runInNewContext(code,{exports,require:path=>path.endsWith('approved-catalog-images.json')?selected:path.endsWith('catalog-assets.json')?previous:{resolveCatalogImage:(_category,_slug,path)=>path}});
 for(const [slug,item] of Object.entries(selected)){
  assert.equal(exports.getApprovedCatalogAssetPath(item.category,slug),item.image);
  assert.equal(exports.getApprovedCatalogAssetPath('invalid-category',slug),null);
  assert.equal(exports.resolveApprovedCatalogImage(item.category,slug,null),item.image);
  for(const old of [...previous[slug].previousPaths,previous[slug].image].filter(Boolean)) assert.equal(exports.resolveApprovedCatalogImage(item.category,slug,old),item.image);
  assert.equal(exports.resolveApprovedCatalogImage(item.category,slug,'/curated/independent.webp'),'/curated/independent.webp');
 }
});

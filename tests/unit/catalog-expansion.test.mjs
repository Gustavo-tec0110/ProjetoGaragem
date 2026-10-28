import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {URL} from 'node:url';
import ts from 'typescript';
import sharp from 'sharp';
import {filterCatalog,normalizeCatalogSearch,selectableCatalog} from '../../src/lib/modifications/catalog-search.ts';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const definitions=read('src/lib/modifications/catalog-definitions.json');
const baseline=read('docs/catalogo-2026-10-27/baseline.json').tables;
const assets=read('src/lib/modifications/catalog-assets.json');
const audit=read('docs/catalogo-2026-10-27/audit.json');
const licenseEvidence=read('docs/catalogo-2026-10-27/license-evidence.json');
const categories=baseline.modification_categories;
const catalog=definitions.map(item=>({id:item.slug,slug:item.slug,name:item.name,short_description:item.description,search_terms:item.aliases,selection_alias_of:item.selectionAliasOf,category_id:categories.find(c=>c.slug===item.category).id,category:categories.find(c=>c.slug===item.category)}));

test('editorial inventory preserves every original type with unique slugs and clear category assignments',()=>{
 assert.ok(definitions.length>=200 && definitions.length<=300);
 assert.equal(new Set(definitions.map(x=>x.slug)).size,definitions.length);
 assert.equal(definitions.filter(x=>x.legacy).length,79);
 for(const old of baseline.modification_catalog)assert.ok(definitions.some(x=>x.slug===old.slug&&x.legacy));
 for(const item of definitions){assert.match(item.slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);assert.ok(categories.some(c=>c.slug===item.category));assert.ok(item.description.length>15&&item.description.length<=500);}
 assert.equal(categories.length,10);
});

test('search finds accentless names, English synonyms and combined category terms',()=>{
 assert.equal(normalizeCatalogSearch('  SUSPENSÃO-à-ar '),'suspensao a ar');
 assert.ok(filterCatalog(catalog,categories,'','suspensao ar').some(x=>x.slug==='suspensao-ar'));
 assert.ok(filterCatalog(catalog,categories,'','turbina').some(x=>x.slug==='turbo'));
 assert.ok(filterCatalog(catalog,categories,'','blow off').some(x=>x.slug==='valvula-blow-off'));
 for(const [query,slug] of [['pistão forjado','pistoes-bielas'],['coxim motor','coxins-motor'],['anel centralizador','aneis-centralizadores'],['terminal direção','terminais-direcao'],['farol milha','farois-auxiliares']])assert.ok(filterCatalog(catalog,categories,'',query).some(x=>x.slug===slug),query);
 const brakes=categories.find(c=>c.slug==='freios');
 assert.equal(filterCatalog(catalog,categories,brakes.id,'turbina').length,0);
 assert.ok(filterCatalog(catalog,categories,brakes.id,'cilindro').some(x=>x.slug==='cilindro-mestre-freio'));
 for(const item of catalog)assert.ok(filterCatalog(catalog,categories,item.category_id,item.name).some(x=>x.id===item.id),item.slug);
});

test('legacy aliases stay editable and remain selectable when their target is unavailable',()=>{
 assert.equal(selectableCatalog(catalog).length,definitions.length-2);
 assert.ok(selectableCatalog(catalog,'suspensao-rosca').some(x=>x.id==='suspensao-rosca'));
 assert.ok(selectableCatalog(catalog.filter(x=>x.slug!=='coilover')).some(x=>x.slug==='suspensao-rosca'));
 const child={...categories[0],id:'child',parent_id:categories[0].id};
 assert.equal(filterCatalog([{...catalog[0],category_id:'child'}],[...categories,child],categories[0].id,'').length,1);
});

test('unapproved legacy defaults cannot reappear while independently curated photos survive',()=>{
 const exports={};runInNewContext(ts.transpileModule(readFileSync('src/lib/modifications/catalog-assets.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,{exports,require:()=>assets});
 for(const [slug,asset] of Object.entries(assets)){
  assert.equal(exports.getCatalogAssetPath(asset.category,slug),asset.image);
  assert.equal(exports.resolveCatalogImage(asset.category,slug,null),asset.image);
  for(const old of asset.previousPaths)assert.equal(exports.resolveCatalogImage(asset.category,slug,old),asset.image);
  assert.equal(exports.resolveCatalogImage(asset.category,slug,'/curated/custom.webp'),'/curated/custom.webp');
 }
 assert.equal(exports.getCatalogAssetPath('invalid','turbo'),null);
 assert.equal(exports.resolveCatalogImage('new-category','new-type','/curated/custom.webp'),'/curated/custom.webp');
});

test('every displayed default is a licensed, reviewed, decodable 512px WebP with public credits',async()=>{
 const credits=readFileSync('public/modifications/photo-credits.html','utf8');
 for(const row of audit){
  assert.equal(row.image,assets[row.slug].image);
  if(!row.image){assert.equal(row.review.status,'pending');assert.ok(row.review.reason);continue;}
  assert.equal(row.review.status,'approved');
  const source=row.review.source;
  assert.match(source.license,/^(CC BY(?:-SA|-ND)? (?:1\.0|2\.0|2\.5|3\.0|4\.0)(?: [a-z]{2})?|CC0(?: 1\.0)?|Public domain)$/);
  if(source.license.includes('-ND')){
   assert.equal(source.technicalChangesOnly,true);
   assert.ok(credits.includes('sem adaptação criativa'));
  }
  const page=new URL(source.page);
  assert.ok((page.hostname==='commons.wikimedia.org'&&page.pathname.startsWith('/wiki/File:'))||(page.hostname==='www.flickr.com'&&/^\/photos\/[^/]+\/\d+\/$/.test(page.pathname)));
  const evidence=licenseEvidence[source.title];
  assert.equal(evidence?.LicenseShortName?.value,source.license);
  assert.ok(!evidence.Restrictions?.value);
  if(source.provider==='Flickr'){
   assert.equal(evidence.sourcePage,source.page);
   assert.equal(evidence.author,source.author);
   assert.equal(evidence.sourceSha256,row.review.output.inputSha256);
   assert.match(evidence.sourcePageSha256,/^[a-f0-9]{64}$/);
   assert.ok(evidence.verifiedOn);
  }
  assert.ok(source.author || source.license === 'Public domain');assert.ok(!source.restrictions);
  const bytes=readFileSync('public'+row.image);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),row.image.split('/').at(-1).replace('.webp',''));
  const metadata=await sharp(bytes).metadata();assert.equal(metadata.width,512);assert.equal(metadata.height,512);assert.equal(metadata.format,'webp');
  assert.ok(credits.includes(`id="${row.slug}"`));
 }
});

test('the 38 previously approved photographs and their audit records remain intact',()=>{
 const frozen=read('docs/catalogo-2026-10-27/followup/preserved-38.json');
 const reviews=read('docs/catalogo-2026-10-27/photo-review.json');
 assert.equal(Object.keys(frozen).length,38);
 for(const [slug,original] of Object.entries(frozen)){
  assert.deepEqual(reviews[slug],original,slug);
  assert.equal(assets[slug].image,original.output.path);
  assert.equal(createHash('sha256').update(readFileSync('public'+original.output.path)).digest('hex'),original.output.sha256,slug);
 }
});

test('the 62 approvals present before the completion research remain unchanged',()=>{
 const frozen=read('docs/catalogo-2026-10-27/completion/preserved-62.json');
 const reviews=read('docs/catalogo-2026-10-27/photo-review.json');
 assert.equal(Object.keys(frozen).length,62);
 for(const [slug,original] of Object.entries(frozen)){
  assert.deepEqual(reviews[slug],original,slug);
  assert.equal(assets[slug].image,original.output.path);
  assert.equal(createHash('sha256').update(readFileSync('public'+original.output.path)).digest('hex'),original.output.sha256,slug);
 }
});

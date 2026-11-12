// Local JSON comparison only. Never reads env files or opens a database connection.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { offerFields } from './prepare-stage7-local.mjs';

const fields=offerFields.filter(f=>f!=='catalog_id').concat('catalog_slug');
function value(row,key) {
  const v=row[key] ?? null;
  if(v!==null && ['verified_at','price_checked_at'].includes(key)) return new Date(v).toISOString();
  if(v!==null && key==='price') return Number(v);
  return v;
}
export function reconcileStage7(local, snapshot) {
  if(!Array.isArray(snapshot.offers) || !Array.isArray(snapshot.catalog) || !Array.isArray(snapshot.categories)) throw new Error('Expected complete offers/catalog/categories snapshot');
  const seen=new Set();
  const rows=local.map(row=>{
    if(seen.has(row.id)) throw new Error('Duplicate local ID'); seen.add(row.id);
    const component=snapshot.catalog.filter(c=>c.slug===row.catalog_slug);
    const category=snapshot.categories.find(c=>c.id===component[0]?.category_id);
    const localCategory=JSON.parse(fs.readFileSync('src/lib/modifications/catalog-definitions.json','utf8')).find(c=>c.slug===row.catalog_slug)?.category;
    const existing=snapshot.offers.filter(o=>o.id===row.id);
    const duplicates=snapshot.offers.filter(o=>o.id!==row.id && o.store===row.store &&
      (o.destination_url===row.destination_url || o.product_url===row.product_url || (row.source_product_id && o.source_product_id===row.source_product_id)));
    const differences=existing.length===1?fields.filter(f=>value(existing[0],f)!==value(row,f)):[];
    const catalogProblem=component.length!==1 || category?.slug!==localCategory || (row.is_active && (!component[0]?.is_active || !category?.is_active));
    const status=catalogProblem?'catalog_conflict':existing.length>1?'id_conflict':duplicates.length?'duplicate_business_identity':differences.length?'content_conflict':existing.length?'identical':'new';
    return {id:row.id,slug:row.catalog_slug,status,differences,duplicateIds:duplicates.map(o=>o.id)};
  });
  const limits=snapshot.catalog.flatMap(c=>{
    const total=snapshot.offers.filter(o=>o.catalog_id===c.id && o.is_active).length+
      rows.filter(r=>r.status==='new' && r.slug===c.slug && local.find(o=>o.id===r.id).is_active).length;
    return total>3?[{slug:c.slug,total}]:[];
  });
  return {snapshotAt:snapshot.snapshot_at ?? null,remoteAccessByThisTool:false,rows,limits,
    remoteOnly:snapshot.offers.filter(o=>!seen.has(o.id)).map(o=>o.id),
    blocked:limits.length>0 || rows.some(r=>!['new','identical'].includes(r.status)),
    note:'Comparação preliminar. Não autoriza execução; o SQL tipado repete os guards sob locks. Dados temporais de JS têm precisão de milissegundos; o SQL compara timestamptz na precisão do banco.'};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const [input,output]=process.argv.slice(2);
  // Keep future production snapshots and reconciliation details out of public docs.
  for(const file of [input,output]) if(!file || !path.resolve(file).startsWith(path.resolve('artifacts')+path.sep)) throw new Error('Use explicit private paths inside artifacts/');
  const local=JSON.parse(fs.readFileSync('data/catalog-offers.local.json','utf8')).offers;
  const report=reconcileStage7(local,JSON.parse(fs.readFileSync(input,'utf8')));
  fs.mkdirSync(path.dirname(output),{recursive:true,mode:0o700});
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{mode:0o600});
  if(report.blocked) process.exitCode=2;
}

// Offline preparation only: no environment loading, subprocesses or network clients.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, URL, URLSearchParams } from 'node:url';
import process from 'node:process';
import { createHash } from 'node:crypto';
import { exportOffersSql } from './manage-catalog-offers.mjs';

export const stage7Directory = 'docs/etapa7-2026-11-05';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
export const offerFields = ['id','catalog_id','store','destination_url','is_active','is_affiliate','price','price_checked_at','product_name','product_url','compatibility_notes','verified_at','source','source_product_id'];
const literal = value => `'${value.replaceAll("'", "''")}'`;

export function strictOfferSql(offers) {
  // Reuse every existing validation and catalog/category/active-count guard.
  const legacy = exportOffersSql(offers);
  const identities=new Set();
  for(const row of offers) {
    for(const [field,value] of [['product',row.source_product_id],['url',row.product_url],['destination',row.destination_url]]) {
      if(!value) continue;
      const key=`${row.store}|${field}|${value}`;
      if(identities.has(key)) throw new Error('Duplicate product identity inside release; manual reconciliation required');
      identities.add(key);
    }
  }
  const prefix = legacy.slice(0, legacy.indexOf('insert into public.modification_offers'));
  if (!offers.length || !prefix.endsWith('end $$;\n')) throw new Error('Expected nonempty validated release');
  const definitions = read('src/lib/modifications/catalog-definitions.json');
  const payload = offers.map(row => ({ ...Object.fromEntries(offerFields.filter(f => f !== 'catalog_id').map(f => [f,row[f]])), catalog_slug:row.catalog_slug }));
  // LIKE without defaults/constraints: staging holds only commercial fields.
  const stage = `create temporary table stage7_expected on commit drop as select ${offerFields.join(',')} from public.modification_offers with no data;
insert into stage7_expected
select r.id,c.id,r.store,r.destination_url,r.is_active,r.is_affiliate,r.price,r.price_checked_at,
  r.product_name,r.product_url,r.compatibility_notes,r.verified_at,r.source,r.source_product_id
from jsonb_to_recordset(${literal(JSON.stringify(payload))}::jsonb) as r(
  id uuid,catalog_slug text,store text,destination_url text,is_active boolean,is_affiliate boolean,
  price numeric(12,2),price_checked_at timestamptz,product_name text,product_url text,
  compatibility_notes text,verified_at timestamptz,source text,source_product_id text)
join public.modification_catalog c on c.slug=r.catalog_slug;
do $$ begin
  if (select count(*) from stage7_expected) <> ${offers.length} then raise exception 'Incomplete staging'; end if;
  if exists(select 1 from stage7_expected e join public.modification_offers o on o.id=e.id
    where row(${offerFields.map(f=>'o.'+f).join(',')}) is distinct from row(${offerFields.map(f=>'e.'+f).join(',')})) then
    raise exception 'Existing offer differs; reconcile without overwrite';
  end if;
  if exists(select 1 from stage7_expected e join public.modification_offers o on o.id<>e.id and o.store=e.store
    and (o.destination_url=e.destination_url or o.product_url=e.product_url
      or (nullif(e.source_product_id,'') is not null and o.source_product_id=e.source_product_id))) then
    raise exception 'Same product or URL under another ID; manual reconciliation required';
  end if;
end $$;
-- Capture returned rows privately during the authorized execution for selective recovery.
insert into public.modification_offers(${offerFields.join(',')})
select ${offerFields.map(f=>'e.'+f).join(',')} from stage7_expected e
where not exists(select 1 from public.modification_offers o where o.id=e.id)
returning *;
commit;
`;
  // Table locks protect against all concurrent writers, including those ignoring advisory locks.
  // READ COMMITTED makes the first data read after lock acquisition see preceding commits.
  const locked = prefix.replace('begin;\n', `begin isolation level read committed;
set local lock_timeout='5s';
set local statement_timeout='60s';
lock table public.modification_categories,public.modification_catalog in share mode;
lock table public.modification_offers in share row exclusive mode;
`);
  if (!offers.every(o => definitions.some(d => d.slug === o.catalog_slug))) throw new Error('Unknown slug');
  return locked + stage;
}

export function prepareStage7() {
  fs.mkdirSync(stage7Directory, { recursive:true });
  const offers = read('data/catalog-offers.local.json').offers;
  const audit = read('docs/etapa6-2026-11-05/auditoria.json');
  const flagged = audit.warnings.map(w => offers.find(o => w.includes(o.id)));
  if (flagged.length !== 12 || flagged.some(o => !o)) throw new Error('Review warning inventory changed');
  const evidenceFile = 'docs/coleta-ml-2026-11-02/lote-2-convertido.json';
  const evidence = read(evidenceFile);
  const urls = flagged.map(offer => {
    const saved = evidence.candidates.find(c => c.slug === offer.catalog_slug);
    if (!saved) throw new Error('Missing local candidate');
    const url = new URL(saved.url);
    const wid = new URLSearchParams(url.hash.slice(1)).get('wid') ?? url.searchParams.get('wid');
    return { id:offer.id,slug:offer.catalog_slug,product_url:offer.product_url,destination_url:offer.destination_url,
      source_product_id:offer.source_product_id,verified_at:offer.verified_at,evidenceFile,
      savedCandidateId:saved.id,savedUrl:saved.url,savedWid:wid,
      localIdentityMatches:wid === offer.source_product_id && saved.id === offer.source_product_id && saved.affiliate_url === offer.destination_url,
      historicalRedirectClaim:saved.redirect_validation ?? null,
      externallyCheckedNow:false,decision:'Preservar URLs e datas; conferir externamente anúncio, variação, vendedor, destino, estoque e afiliação antes da liberação comercial.' };
  });
  if (urls.some(r => !r.localIdentityMatches)) throw new Error('Local URL evidence mismatch');
  fs.writeFileSync(`${stage7Directory}/urls-ml.json`, JSON.stringify(urls,null,2)+'\n');
  fs.writeFileSync(`${stage7Directory}/ofertas-sem-sobrescrita.sql`,strictOfferSql(offers));
  const inputs = ['data/catalog-offers.local.json','src/lib/modifications/catalog-definitions.json',
    'src/lib/modifications/approved-catalog-images.json','docs/etapa6-2026-11-05/ofertas-revisao.sql',
    'docs/etapa6-2026-11-05/PROCEDIMENTO-PRODUCAO.md',evidenceFile,
    'scripts/prepare-stage7-local.mjs','scripts/reconcile-stage7-offers.mjs','scripts/test-stage7-local.mjs',
    ...fs.readdirSync(stage7Directory).filter(f=>f.endsWith('.md') || f==='preflight-futuro-somente-leitura.sql').map(f=>`${stage7Directory}/${f}`),
    ...fs.readdirSync('supabase/migrations').filter(f=>/^2026103112/.test(f)).map(f=>'supabase/migrations/'+f),
    `${stage7Directory}/ofertas-sem-sobrescrita.sql`,`${stage7Directory}/urls-ml.json`];
  fs.writeFileSync(`${stage7Directory}/manifesto.json`,JSON.stringify({remoteAccess:false,
    files:inputs.map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')}))},null,2)+'\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) prepareStage7();

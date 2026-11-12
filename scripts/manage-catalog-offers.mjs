/* global console */
// Local files + SQL export only. This tool never loads .env or connects to a database.
import { readFile, writeFile, mkdir, rename, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, URL } from 'node:url';
import { MAX_CATALOG_OFFERS, offerStores, safeOfferUrl, validateManagedOffer } from '../src/lib/modifications/offers.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const definitions = JSON.parse(await readFile(path.join(root, 'src/lib/modifications/catalog-definitions.json'), 'utf8'));
const slugs = new Set(definitions.map(row => row.slug));
const quote = value => value === null ? 'null' : typeof value === 'boolean' || typeof value === 'number' ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
const fields = ['id','catalog_id','store','destination_url','is_active','is_affiliate','price','price_checked_at','product_name','product_url','compatibility_notes','verified_at','source','source_product_id'];

export function exportOffersSql(offers) {
  const ids = new Set();
  const active = new Map();
  for (const row of offers) {
    validateManagedOffer(row, slugs);
    if (ids.has(row.id)) throw new Error('ID de oferta duplicado. Exportação cancelada.');
    ids.add(row.id);
    if (row.is_active) active.set(row.catalog_slug, (active.get(row.catalog_slug) ?? 0) + 1);
  }
  if ([...active.values()].some(count => count > MAX_CATALOG_OFFERS)) throw new Error('Máximo de três ofertas ativas por componente. Exportação cancelada.');
  // Stage identities before any persistent write. A UUID collision must never move
  // another offer to a different component/store, even when ON CONFLICT would allow it.
  const preflight = offers.length ? `create temporary table catalog_offer_release (
  id uuid primary key, catalog_slug text, category_slug text, store text, is_active boolean
) on commit drop;
insert into catalog_offer_release values
${offers.map(row => `(${[row.id, row.catalog_slug, definitions.find(item => item.slug === row.catalog_slug).category, row.store, row.is_active].map(quote).join(',')})`).join(',\n')};
do $$ begin
  if exists (select 1 from catalog_offer_release s
    left join public.modification_catalog c on c.slug=s.catalog_slug
    left join public.modification_categories category on category.id=c.category_id
    where c.id is null or category.slug is distinct from s.category_slug
      or (s.is_active and (not c.is_active or not category.is_active))) then
    raise exception 'Missing, mismatched or inactive catalog/category; no offers imported';
  end if;
  if exists (select 1 from catalog_offer_release s
    join public.modification_offers o on o.id=s.id
    join public.modification_catalog c on c.slug=s.catalog_slug
    where o.catalog_id<>c.id or o.store<>s.store) then
    raise exception 'Offer ID belongs to another component/store; no offers imported';
  end if;
  if exists (select 1 from (
    select c.id from catalog_offer_release s join public.modification_catalog c on c.slug=s.catalog_slug where s.is_active
    union all
    select o.catalog_id from public.modification_offers o where o.is_active
      and not exists (select 1 from catalog_offer_release s where s.id=o.id)
      and exists (select 1 from catalog_offer_release s join public.modification_catalog c on c.slug=s.catalog_slug where c.id=o.catalog_id)
  ) combined group by id having count(*)>${MAX_CATALOG_OFFERS}) then
    raise exception 'More than three active offers for component; no offers imported';
  end if;
end $$;
` : '';
  const statements = offers.map(row => {
    validateManagedOffer(row, slugs);
    const values = fields.map(field => field === 'catalog_id' ? `(select id from public.modification_catalog where slug=${quote(row.catalog_slug)})` : quote(row[field]));
    const updated = fields.filter(field => field !== 'id');
    return `insert into public.modification_offers (${fields.join(',')})\nvalues (${values.join(',')})\non conflict (id) do update set ${updated.map(field => `${field}=excluded.${field}`).join(',')}\nwhere (${updated.map(field => `modification_offers.${field}`).join(',')}) is distinct from (${updated.map(field => `excluded.${field}`).join(',')});`;
  });
  return `-- LOCAL REVIEW ONLY. Contains no credentials. Applying this file requires separate authorization.\n-- Resolve exact catalog slugs at execution; a missing component aborts the transaction.\nbegin;\n${preflight}${statements.join('\n')}\ncommit;\n`;
}

export async function manageOffers(args) {
  const [command = 'help', ...rest] = args;
  const usage = 'Uso: npm run offers -- <catalog [busca]|template SLUG LOJA|list|save arquivo.json|review ID --confirm-reviewed|activate ID|deactivate ID|validate|export-sql> [--file caminho-local.json]';
  if (command === 'help') return usage;
  if (command === 'catalog') {
    const term = rest.join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    return definitions.filter(row => `${row.slug} ${row.name}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(term)).map(row => `${row.slug} · ${row.name}`).join('\n');
  }
  if (command === 'template') {
    const [slug, store] = rest;
    if (rest.length !== 2 || !slugs.has(slug) || !Object.hasOwn(offerStores,store)) throw new Error('Use um slug aprovado e uma loja: mercado_livre, shopee, amazon ou magalu.');
    return JSON.stringify({catalog_slug:slug,store,product_name:'',product_url:'',destination_url:'',compatibility_notes:'',is_affiliate:true,price:null,price_checked_at:null,source_product_id:null},null,2);
  }
  const fileIndex = rest.indexOf('--file');
  const file = fileIndex === -1 ? path.join(root, 'data/catalog-offers.local.json') : path.resolve(rest[fileIndex + 1] ?? '');
  if (fileIndex !== -1) rest.splice(fileIndex, 2);
  if (!['list','save','review','activate','deactivate','validate','export-sql'].includes(command)) throw new Error(usage);
  const expected = command === 'review' ? 2 : ['save','activate','deactivate'].includes(command) ? 1 : 0;
  if (rest.length !== expected || (command === 'review' && rest[1] !== '--confirm-reviewed')) throw new Error(usage);
  await mkdir(path.dirname(file), { recursive: true });
  const lock = await open(`${file}.lock`, 'wx', 0o600).catch(() => { throw new Error('Arquivo em uso. Aguarde a outra edição local terminar.'); });
  try {
    let manifest;
    try { manifest = JSON.parse(await readFile(file, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; manifest = { version: 1, offers: [] }; }
    if (manifest.version !== 1 || !Array.isArray(manifest.offers)) throw new Error('Formato de ofertas inválido. Nenhum arquivo foi alterado.');
    const manifestIds = new Set();
    for (const row of manifest.offers) {
      validateManagedOffer(row, slugs);
      if (manifestIds.has(row.id)) throw new Error('ID de oferta duplicado. Nenhum arquivo foi alterado.');
      manifestIds.add(row.id);
    }
    if (command === 'list') return JSON.stringify(manifest, null, 2);
    if (command === 'validate') return `${manifest.offers.length} oferta(s) válida(s). Zero acesso remoto.`;
    if (command === 'export-sql') return exportOffersSql(manifest.offers);
    const now = new Date().toISOString();
    let row;
    if (command === 'save') {
      const draft = JSON.parse(await readFile(path.resolve(rest[0]), 'utf8'));
      const previous = draft.id ? manifest.offers.find(item => item.id === draft.id) : null;
      if (draft.id && !previous) throw new Error('ID não cadastrado. Remova o ID para criar uma oferta.');
      if ((!previous || previous.catalog_slug !== draft.catalog_slug)
        && manifest.offers.filter(item => item.catalog_slug === draft.catalog_slug).length >= MAX_CATALOG_OFFERS) {
        throw new Error('Máximo de três ofertas cadastradas por componente. Atualize uma oferta existente; os registros antigos foram preservados.');
      }
      row = {
        id: previous?.id ?? randomUUID(), catalog_slug: draft.catalog_slug,
        store: draft.store, destination_url: safeOfferUrl(draft.store, draft.destination_url),
        product_url: safeOfferUrl(draft.store, draft.product_url), product_name: draft.product_name,
        compatibility_notes: draft.compatibility_notes, is_affiliate: draft.is_affiliate ?? true,
        price: draft.price ?? null, price_checked_at: draft.price_checked_at ?? null,
        source: 'manual', source_product_id: draft.source_product_id ?? null,
        is_active: false, verified_at: null, created_at: previous?.created_at ?? now, updated_at: now,
      };
      if (manifest.offers.some(item => item.id !== row.id && item.catalog_slug === row.catalog_slug && item.store === row.store
        && (item.destination_url === row.destination_url || item.product_url === row.product_url
          || (row.source_product_id && item.source_product_id === row.source_product_id)))) throw new Error('Essa oferta já está cadastrada para o componente. Atualize o ID existente.');
    } else {
      const previous = manifest.offers.find(item => item.id === rest[0]);
      if (!previous) throw new Error('Oferta não encontrada.');
      row = { ...previous, updated_at: now };
      if (command === 'review') row.verified_at = now;
      if (command === 'activate') row.is_active = true;
      if (command === 'deactivate') row.is_active = false;
    }
    validateManagedOffer(row, slugs);
    if (row.is_active && manifest.offers.filter(item => item.id !== row.id && item.catalog_slug === row.catalog_slug && item.is_active).length >= MAX_CATALOG_OFFERS) {
      throw new Error('Máximo de três ofertas ativas por componente. Desative uma oferta existente antes de ativar outra.');
    }
    manifest.offers = [...manifest.offers.filter(item => item.id !== row.id), row];
    const tmp = `${file}.${randomUUID()}.tmp`;
    try {
      await writeFile(tmp, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
      await rename(tmp, file);
    } finally { await unlink(tmp).catch(() => undefined); }
    return `${command}: ${row.id} · ${row.catalog_slug} · ${row.is_active ? 'ativa' : 'inativa'} · alteração exclusivamente local`;
  } finally { await lock.close(); await unlink(`${file}.lock`); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(await manageOffers(process.argv.slice(2))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { manageOffers, exportOffersSql } from '../../scripts/manage-catalog-offers.mjs';
import { publicOffer, safeOfferUrl } from '../../src/lib/modifications/offers.ts';

// These are inert fixture URLs: never published or followed, and stored only under tmpdir.
const draft = { catalog_slug:'turbo', store:'amazon', product_name:"Turbocompressor 'fixture'", product_url:'https://amazon.com.br/test-fixture', destination_url:'https://amzn.to/test-fixture', compatibility_notes:'Fixture: aplicação manual conferida para o conjunto de teste.', is_affiliate:true, price:null, price_checked_at:null };

test('local management creates, reviews, activates, updates and disables; invalid writes preserve state', async () => {
  const dir = await mkdtemp(path.join(tmpdir(),'pg-offers-'));
  const file = path.join(dir,'offers.json');
  const input = path.join(dir,'draft.json');
  const run = (...args) => manageOffers([...args,'--file',file]);
  const rows = async () => JSON.parse(await readFile(file,'utf8')).offers;
  try {
    await writeFile(input,JSON.stringify(draft));
    await run('save',input);
    const row = (await rows())[0];
    assert.equal(row.is_active,false);
    assert.equal(row.verified_at,null);
    assert.equal(publicOffer(row),null);
    await assert.rejects(run('activate',row.id),/Revise/);
    await assert.rejects(run('review',row.id),/Uso/);
    await run('review',row.id,'--confirm-reviewed');
    await run('activate',row.id);
    assert.equal(publicOffer((await rows())[0]).product_name,draft.product_name);
    const sql = await run('export-sql');
    assert.match(sql,/Turbocompressor ''fixture''/);
    assert.match(sql,/where slug='turbo'/);
    assert.doesNotMatch(sql,/service_role|https:\/\/.*supabase/);
    await assert.rejects(run('save',input),/já está cadastrada/);
    const previous = await readFile(file,'utf8');
    await writeFile(input,JSON.stringify({...draft,id:row.id,destination_url:'https://evil.test/'}));
    await assert.rejects(run('save',input),/HTTPS/);
    assert.equal(await readFile(file,'utf8'),previous);
    await writeFile(input,JSON.stringify({...draft,id:row.id,product_name:'Produto atualizado'}));
    await run('save',input);
    assert.equal((await rows())[0].is_active,false,'editing resets review and activation');
    assert.equal((await rows())[0].verified_at,null);
    await run('review',row.id,'--confirm-reviewed');
    await run('activate',row.id);
    await run('deactivate',row.id);
    assert.equal(publicOffer((await rows())[0]),null);
    await writeFile(input,JSON.stringify({...draft,store:'magalu',product_url:'https://www.magazineluiza.com.br/test-fixture',destination_url:'https://www.magazinevoce.com.br/test-fixture'}));
    await run('save',input);
    assert.equal((await rows()).length,2);
    await writeFile(input,JSON.stringify({...draft,catalog_slug:'not-in-approved-catalog'}));
    await assert.rejects(run('save',input),/Componente não encontrado/);
    await writeFile(input,JSON.stringify({...draft,id:row.id,price:120,price_checked_at:null}));
    await assert.rejects(run('save',input),/juntos/);
    assert.match(await run('validate'),/2 oferta/);
  } finally { await rm(dir,{recursive:true,force:true}); }
});

test('SQL export is deterministic, local and safely quotes all supplied text', () => {
  assert.match(exportOffersSql([]),/begin;\n\ncommit;/);
  assert.equal(safeOfferUrl('magalu','https://evil.magazineluiza.onelink.me/a'),null);
  assert.equal(safeOfferUrl('magalu','https://magazineluiza.com.br.evil.test/a'),null);
  assert.equal(safeOfferUrl('magalu','https://magazineluiza.onelink.me/test-fixture'),'https://magazineluiza.onelink.me/test-fixture');
  assert.equal(safeOfferUrl('aliexpress','https://aliexpress.com/a'),null,'future store remains unavailable');
});

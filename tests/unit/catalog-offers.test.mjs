import test from 'node:test';
import assert from 'node:assert/strict';
import {freshOfferPrice, safeOfferUrl, publicOffer} from '../../src/lib/modifications/offers.ts';

test('store URLs accept only HTTPS destinations belonging to the selected partner', () => {
  for (const [store, url] of [['mercado_livre','https://produto.mercadolivre.com.br/MLB-123'], ['mercado_livre','https://meli.la/example'], ['shopee','https://s.shopee.com.br/example'], ['amazon','https://amzn.to/example']]) assert.equal(safeOfferUrl(store,url),url);
  for (const url of ['javascript:alert(1)','data:text/html,test','http://amazon.com.br/p','//amazon.com.br','https://amazon.com.br.evil.test/p','https://evil.test/amazon.com.br','https://evil@amazon.com.br/p','https://amazon.com.br:444/p','https://amazon.com.br\\@evil.test/p',' https://amazon.com.br','https://amazon.com.br\n/p','https://127.0.0.1/p','https://amazon.com.br%2eevil.test/p']) assert.equal(safeOfferUrl('amazon',url),null,url);
  assert.equal(safeOfferUrl('amazon','https://shopee.com.br/p'),null);
  assert.equal(safeOfferUrl('__proto__','https://amazon.com.br'),null);
});

test('price needs a positive value and a checked date within 24 hours', () => {
  const now=Date.parse('2026-10-27T12:00:00Z');
  assert.equal(freshOfferPrice(100,'2026-10-27T11:00:00Z',now),100);
  for(const [price,date] of [[100,null],[100,'2026-10-25T12:00:00Z'],[100,'2026-10-28T12:00:00Z'],[0,'2026-10-27T11:00:00Z'],[-1,'2026-10-27T11:00:00Z'],['100','2026-10-27T11:00:00Z'],[Infinity,'2026-10-27T11:00:00Z']]) assert.equal(freshOfferPrice(price,date,now),null);
});

test('public projection excludes disabled/unsafe offers and stale prices', () => {
  const row={id:'offer',catalog_id:'part',store:'amazon',destination_url:'https://amazon.com.br/p',is_active:true,is_affiliate:true,price:200,price_checked_at:'2020-01-01',created_at:'2020-01-01',updated_at:'2020-01-01', product_name:'Produto conferido',product_url:'https://amazon.com.br/p',compatibility_notes:'Aplicação revisada',verified_at:'2026-01-01T12:00:00Z',source:'manual',source_product_id:null};
  assert.equal(publicOffer(row).price,null);
  assert.equal(publicOffer(row).demonstration,false);
  assert.equal(publicOffer({...row,is_active:false}),null);
  assert.equal(publicOffer({...row,verified_at:null}),null);
  assert.equal(publicOffer({...row,verified_at:'2099-01-01T12:00:00Z'}),null);
  assert.equal(publicOffer({...row,product_url:'https://evil.test/p'}),null);
  assert.equal(publicOffer({...row,destination_url:'https://evil.test/p'}),null);
});

test('demonstration cannot be activated in production, even with its flag retained', async () => {
  const {readFileSync}=await import('node:fs');
  const {runInNewContext}=await import('node:vm');
  const {default:ts}=await import('typescript');
  const code=ts.transpileModule(readFileSync('src/lib/modifications/demo-offers.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  for(const [mode,flag,expected] of [['development','1',true],['development','0',false],['production','1',false],['test','1',false]]) {
    const exports={};
    runInNewContext(code,{exports,require:()=>({}),process:{env:{NODE_ENV:mode,CATALOG_OFFERS_DEMO:flag}}});
    assert.equal(exports.catalogOfferDemoEnabled(),expected,`${mode}/${flag}`);
    const demo=exports.demoCatalogOffers('74f41706-15c6-470c-9c55-0b426e72e209');
    assert.equal(demo.offers.length,3);
    for(const offer of demo.offers) { assert.equal(offer.destination_url,null); assert.equal(offer.is_affiliate,false); assert.equal(offer.price,null); }
  }
});

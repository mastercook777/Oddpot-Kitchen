import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame,ensureDailyMarket,purchase,DAILY_STAPLE_MIN_PURCHASES,advanceDay} from '../src/engine.js';
import {SHOP_STAPLES} from '../src/data.js';

test('the market still has genuine random missing staples, never guarantees every item',()=>{
 const countSet=new Set(),missing=new Set();
 for(let seed=1;seed<=200;seed++){
  const market=ensureDailyMarket(newGame(seed));
  const ids=Object.keys(market.goods);
  assert.ok(ids.length===3||ids.length===4);
  countSet.add(ids.length);
  for(const id of SHOP_STAPLES)if(!market.goods[id])missing.add(id);
  for(const offer of Object.values(market.goods)){
   assert.ok(offer.initialStock>=DAILY_STAPLE_MIN_PURCHASES);
   assert.ok(offer.initialStock<=9);
   assert.equal(offer.stock,offer.initialStock);
  }
 }
 assert.deepEqual([...countSet].sort(),[3,4]);
 assert.ok(missing.size>0,'some ingredients must sometimes be absent');
});
test('each available staple can be bought in six individual purchases, stock and money persist',()=>{
 const s=newGame(1021);s.coins=1000;
 const offers=ensureDailyMarket(s).goods;
 const [id,offer]=Object.entries(offers)[0],initial=offer.initialStock,coins=s.coins;
 for(let n=0;n<DAILY_STAPLE_MIN_PURCHASES;n++)assert.equal(purchase(s,id,1),true);
 assert.equal(offer.stock,initial-DAILY_STAPLE_MIN_PURCHASES);
 assert.equal(s.coins,coins-offer.price*DAILY_STAPLE_MIN_PURCHASES);
 assert.strictEqual(ensureDailyMarket(s).goods[id],offer);
 const missed=SHOP_STAPLES.find(x=>!offers[x]);
 if(missed)assert.equal(purchase(s,missed),false);
});
test('three-unit bundle purchases consume exactly three units, cannot exceed listed stock',()=>{
 const s=newGame(2229);s.coins=1000;
 const [id,offer]=Object.entries(ensureDailyMarket(s).goods)[0],start=offer.stock;
 const cash=s.coins,inv=s.inventory[id]||0;
 assert.equal(purchase(s,id,3),true);
 assert.equal(offer.stock,start-3);
 assert.equal(s.coins,cash-3*offer.price);
 assert.equal(s.inventory[id],inv+3);
 assert.equal(purchase(s,id,5),offer.stock>=5);
 assert.equal(purchase(s,id,10),false);
});
test('old same-day market migrates the offer quantity without recreating sold units or buying missing goods',()=>{
 const s=newGame(3419);s.coins=1000;
 const old=ensureDailyMarket(s),id=Object.keys(old.goods)[0],original=old.goods[id].initialStock,price=old.goods[id].price;
 assert.equal(purchase(s,id,2),true);
 const purchasedBefore=s.inventory[id],spent=s.coins,ledgerBefore=s.ledger.length;
 old.schema=undefined;
 old.goods[id].initialStock=original;
 const absent=SHOP_STAPLES.filter(x=>!old.goods[x]);
 const migrated=ensureDailyMarket(s);
 assert.ok(migrated.goods[id].initialStock>=DAILY_STAPLE_MIN_PURCHASES);
 assert.equal(migrated.goods[id].stock,migrated.goods[id].initialStock-2);
 assert.equal(migrated.goods[id].price,price);
 assert.equal(s.inventory[id],purchasedBefore);
 assert.equal(s.coins,spent);
 assert.equal(s.ledger.length,ledgerBefore);
 for(const missing of absent)assert.equal(migrated.goods[missing],undefined);
});
test('home preview has no kitchen and seating badge overlays; purchasing keeps stock state',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const home=app.slice(app.indexOf('function forecast(){'),app.indexOf('\nfunction field(){'));
 assert.doesNotMatch(home,/v076-preview-info/);
 assert.match(home,/restaurantView\(false\)/);
 assert.match(app,/买 3 份/);
 assert.match(app,/今日缺货/);
 assert.match(app,/今日上架/);
});

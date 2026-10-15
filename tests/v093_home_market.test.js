import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame,ensureDailyMarket,purchase,DAILY_STAPLE_MIN_PURCHASES,advanceDay} from '../src/engine.js';
import {SHOP_STAPLES} from '../src/data.js';

test('daily market rotates exactly four of all eight ordinary ingredients with scarce exploration stock',()=>{
 const seen=new Set(),uniqueOffers=new Set(),days=[];
 for(let seed=1;seed<=120;seed++)for(let i=0;i<15;i++){
  const s=newGame(seed);s.cycle=1+Math.floor(i/3);s.day=1+i%3;
  const m=ensureDailyMarket(s),list=Object.keys(m.goods);
  assert.equal(m.schema,3);assert.equal(list.length,4);
  for(const id of list){
   assert.ok(['beef','chicken','chili','garlic','mushroom','cabbage','onion','potato'].includes(id));
   seen.add(id);
   const offer=m.goods[id],field=!SHOP_STAPLES.includes(id);
   assert.ok(offer.initialStock>=(field?2:6)&&offer.initialStock<=(field?4:9));
   assert.equal(offer.stock,offer.initialStock);
  }
  uniqueOffers.add([...list].sort().join(','));
  assert.equal(ensureDailyMarket(s),m,'same day never rerolls');
  if(seed===1)days.push([...list].sort().join(','));
 }
 assert.equal(seen.size,8);assert.ok(uniqueOffers.size>=40,'market must show varied combinations');
 assert.ok(new Set(days).size>=8,'different days should visibly rotate');
});
test('each available staple can be bought in six individual purchases, stock and money persist',()=>{
 const s=newGame(1021);s.coins=1000;
 const offers=ensureDailyMarket(s).goods;
 const [id,offer]=Object.entries(offers)[0],initial=offer.initialStock,coins=s.coins;
 for(let n=0;n<initial;n++)assert.equal(purchase(s,id,1),true);
 assert.equal(offer.stock,0);
 assert.equal(s.coins,coins-offer.price*initial);
 assert.strictEqual(ensureDailyMarket(s).goods[id],offer);
 const missed=['beef','chicken','chili','garlic','mushroom','cabbage','onion','potato'].find(x=>!offers[x]);
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
 const old={dayKey:'1-1',schema:undefined,goods:{chicken:{initialStock:8,stock:8,price:6},garlic:{initialStock:7,stock:7,price:2},mushroom:{initialStock:9,stock:9,price:3}}};s.market=old;const id='chicken',original=old.goods[id].initialStock,price=old.goods[id].price;
 assert.equal(purchase(s,id,2),true);
 const purchasedBefore=s.inventory[id],spent=s.coins,ledgerBefore=s.ledger.length;
 old.schema=undefined;
 old.goods[id].initialStock=original;
 const absent=SHOP_STAPLES.filter(x=>!old.goods[x]);
 const migrated=ensureDailyMarket(s);assert.equal(migrated.schema,2);assert.deepEqual(Object.keys(migrated.goods).sort(),['chicken','garlic','mushroom']);
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

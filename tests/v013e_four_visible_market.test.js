import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame,ensureDailyMarket,purchase,advanceDay,prepStockForecast} from '../src/engine.js';
import {MARKET_ROTATION_STAPLES,ING} from '../src/data.js';

test('exactly four of eight ordinary ingredients offered every day (none initially missing)',()=>{
 const seen=new Set(),combinations=new Set();
 for(let seed=1;seed<=90;seed++)for(let day=1;day<=21;day++){
  const s=newGame(seed);s.cycle=Math.floor((day-1)/3)+1;s.day=1+(day-1)%3;
  const m=ensureDailyMarket(s),ids=Object.keys(m.goods).sort();
  assert.equal(m.schema,4);assert.equal(ids.length,4);
  for(const id of ids){
   assert.ok(MARKET_ROTATION_STAPLES.includes(id));
   assert.ok(m.goods[id].initialStock>=2);
   assert.equal(m.goods[id].stock,m.goods[id].initialStock);
   seen.add(id);
  }
  combinations.add(ids.join(','));
 }
 assert.equal(seen.size,8);
 assert.ok(combinations.size>=50,'many combinations across seeds, not four fixed goods');
});
test('legacy three-product day fills a fourth, never refunds or restocks sold-out units',()=>{
 const s=newGame(912);s.coins=1000;
 const old={dayKey:'1-1',schema:2,goods:{
  chicken:{stock:0,initialStock:8,price:5},
  garlic:{stock:2,initialStock:7,price:3},
  cabbage:{stock:4,initialStock:6,price:2}
 }};
 s.market=old;
 const coins=s.coins,stock=JSON.stringify(s.inventory),ledger=JSON.stringify(s.ledger);
 const m=ensureDailyMarket(s);
 assert.equal(m.schema,4);assert.equal(Object.keys(m.goods).length,4);
 for(const id of ['chicken','garlic','cabbage'])assert.deepEqual(m.goods[id],old.goods[id]);
 assert.equal(purchase(s,'chicken'),false,'old sold-out stock stays sold out');
 assert.equal(s.coins,coins);assert.equal(JSON.stringify(s.inventory),stock);
 assert.equal(JSON.stringify(s.ledger),ledger);
 assert.equal(ensureDailyMarket(s),m,'migration never happens again on same day');
 const bonus=Object.keys(m.goods).find(id=>!old.goods[id]);assert.ok(bonus);
 assert.ok(m.goods[bonus].stock>0);
});
test('old four-product day preserves all offers, including old pricing',()=>{
 const s=newGame(77);const goods={
  chicken:{stock:1,initialStock:6,price:12},
  garlic:{stock:0,initialStock:9,price:2},
  cabbage:{stock:2,initialStock:7,price:4},
  mushroom:{stock:3,initialStock:8,price:5}
 };
 s.market={dayKey:'1-1',schema:2,goods};
 const m=ensureDailyMarket(s);
 assert.equal(m.schema,4);assert.deepEqual(m.goods,goods);
 assert.equal(m.goods.garlic.stock,0);
});
test('actual daily offers become new tomorrow; never silently purchase unlisted goods',()=>{
 const s=newGame(20261009);s.coins=1000;
 const old=ensureDailyMarket(s),ids=Object.keys(old.goods);
 const absent=MARKET_ROTATION_STAPLES.find(id=>!old.goods[id]);
 assert.ok(absent);assert.equal(purchase(s,absent,1),false);
 const item=ids.find(id=>old.goods[id].stock>=1),oldCost=old.goods[item].price;
 assert.equal(purchase(s,item),true);assert.equal(s.coins,1000-oldCost);
 s.phase='upgrade';assert.equal(advanceDay(s),true);
 const next=ensureDailyMarket(s);assert.equal(Object.keys(next.goods).length,4);
 assert.notDeepEqual(Object.keys(next.goods).sort(),ids.sort());
});
test('shortage purchasing forecast recognizes rotating exploration-source produce as market purchasable',()=>{
 const s=newGame(1803);s.phase='prep';s.cycle=3;s.day=1;s.dining.tableCount=4;s.chapterProgress.stars=1;
 const market=ensureDailyMarket(s);
 const offeredField=Object.keys(market.goods).find(id=>ING[id].acquisitionPolicy==='FIELD_ONLY');
 assert.ok(offeredField);
 const recipe=offeredField==='beef'?'garlic_beef':offeredField==='chili'?'chili_meat':offeredField==='onion'?'onion_chicken':'potato_stew';
 s.menu=[recipe,recipe,recipe];s.recipes[recipe]=83;
 for(const id of Object.keys(s.inventory))s.inventory[id]=0;
 const forecast=prepStockForecast(s);
 assert.ok(forecast.purchasableCount>0,'currently offered field-only grocery counts toward purchasable shortages');
});
test('UI must derive its exact four product cards from market.goods; absent goods hidden',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const stock=app.slice(app.indexOf("}else if(overlay==='stock'){"),app.indexOf("}else if(overlay==='premium'){"));
 assert.match(stock,/Object.entries\(market.goods\)/);
 assert.match(stock,/offers\.map\(stockLine\)/);
 assert.match(stock,/data-market-id=/);
 assert.doesNotMatch(stock,/今日缺货/);
 assert.doesNotMatch(stock,/filter\(id=>ING\[id\]\.acquisitionPolicy==='SHOP_STAPLE'\)/);
});

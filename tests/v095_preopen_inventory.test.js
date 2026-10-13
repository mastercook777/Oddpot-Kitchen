import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ING} from '../src/data.js';
import {newGame,serviceDayPlan,recipeCraftSnapshot,prepStockForecast,
 prepDish,ensureDailyMarket,purchase,kitchenHasMenuCoverage} from '../src/engine.js';

const file=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const find=(forecast,id)=>forecast.ingredients.find(x=>x.id===id);

test('pre-open estimate splits actual expected guests across the three listed recipes',()=>{
 const s=newGame(1099);s.phase='prep';
 s.menu=['chicken_stew','mushroom_stir','veg_stir'];
 for(const id of Object.keys(s.inventory))s.inventory[id]=100;
 const count=serviceDayPlan(s).count;
 const result=prepStockForecast(s);
 assert.equal(result.guestCount,count);
 assert.equal(result.portionsToCook,count);
 assert.equal(result.shortageCount,0);
 const portions=s.menu.map((_,i)=>Math.floor(count/3)+(i<count%3?1:0));
 const expected={};
 s.menu.forEach((recipeId,i)=>{
  for(const id of recipeCraftSnapshot(s,recipeId).ingredientIds)
   expected[id]=(expected[id]||0)+portions[i];
 });
 for(const [id,needed] of Object.entries(expected)){
  assert.equal(find(result,id).needed,needed,id);
  assert.equal(find(result,id).have,100);
 }
});

test('shared ingredients and duplicate menu dishes do not lose or double-count planned portions',()=>{
 const s=newGame(112);s.phase='prep';
 s.menu=['chicken_stew','chicken_stew','veg_stir'];
 for(const id of Object.keys(s.inventory))s.inventory[id]=90;
 const f=prepStockForecast(s);
 assert.equal(f.portionsToCook,f.guestCount);
 const totalChicken=Math.floor(f.guestCount/3)+(f.guestCount%3>0?1:0)+
   Math.floor(f.guestCount/3)+(f.guestCount%3>1?1:0);
 assert.equal(find(f,'chicken').needed,totalChicken);
});

test('already prepared meals reduce future material demand without assuming a second consumption',()=>{
 const s=newGame(412);s.phase='prep';
 for(const id of Object.keys(s.inventory))s.inventory[id]=100;
 const id='chicken_stew',ingredients=recipeCraftSnapshot(s,id).ingredientIds;
 const before=prepStockForecast(s),ownedBefore={...s.inventory};
 assert.equal(prepDish(s,id),true);
 const after=prepStockForecast(s);
 assert.equal(after.coveredByPrep,1);
 assert.equal(after.portionsToCook,before.portionsToCook-1);
 for(const ing of new Set(ingredients)){
  const used=ingredients.filter(x=>x===ing).length;
  assert.equal(find(after,ing).needed,find(before,ing).needed-used);
  assert.equal(s.inventory[ing],ownedBefore[ing]-used);
 }
});

test('low pantry triggers a voluntary warning, not a gate on opening',()=>{
 const s=newGame(778);s.phase='prep';
 for(const id of Object.keys(s.inventory))s.inventory[id]=0;
 const beforeLedger=JSON.stringify(s.ledger),beforeInventory=JSON.stringify(s.inventory),coins=s.coins;
 const f=prepStockForecast(s);
 assert.ok(f.shortageCount>0);
 assert.ok(f.shortages.every(x=>x.short===x.needed-x.have && x.short>0));
 assert.equal(JSON.stringify(s.ledger),beforeLedger);
 assert.equal(JSON.stringify(s.inventory),beforeInventory);
 assert.equal(s.coins,coins);
 assert.equal(kitchenHasMenuCoverage(s),true,'shortages do not block opening');
});

test('the same daily market can refill risky inventory in prep and rerenders immediately',()=>{
 const s=newGame(615);s.phase='prep';s.coins=1000;
 const offers=ensureDailyMarket(s).goods;
 const candidate=['chicken','mushroom'].find(id=>offers[id]);
 assert.ok(candidate);
 for(const id of Object.keys(s.inventory))s.inventory[id]=100;
 s.inventory[candidate]=0;
 const before=prepStockForecast(s),old=find(before,candidate);
 const market=ensureDailyMarket(s),stock=market.goods[candidate].stock;
 assert.ok(old.short>0);
 assert.equal(purchase(s,candidate,3),true);
 const after=prepStockForecast(s),next=find(after,candidate);
 assert.equal(next.have,3);
 assert.equal(next.short,Math.max(0,old.short-3));
 assert.equal(market.goods[candidate].stock,stock-3);
 assert.strictEqual(ensureDailyMarket(s),market);
});

test('rare or absent items are not falsely described as purchasable',()=>{
 const s=newGame(912);s.phase='prep';
 s.menu=['ember_pepper_wok','ember_pepper_wok','ember_pepper_wok'];
 s.recipes.ember_pepper_wok=88;
 for(const id of Object.keys(s.inventory))s.inventory[id]=100;
 s.inventory.ember_pepper=0;
 const f=prepStockForecast(s);
 assert.equal(find(f,'ember_pepper').short>0,true);
 assert.equal(ING.ember_pepper.acquisitionPolicy,'BOSS_ONLY');
 assert.equal(f.purchasableCount,0);
 assert.equal(purchase(s,'ember_pepper'),false);
});

test('prep UI is a slim inline status inside the original card with one reused stock action',()=>{
 const app=file('../src/app.js'),css=file('../src/kitchen_050.css');
 const part=app.slice(app.indexOf('function prepInventoryCheck(){'),app.indexOf('\nfunction serviceLegacy()'));
 assert.match(part,/prepStockForecast\(game\)/);
 assert.match(part,/f\.shortages\.slice\(0,2\)/);
 assert.match(part,/class="v095-stock-check/);
 assert.match(part,/data-act="stock"/);
 assert.match(part,/\$\{prepInventoryCheck\(\)\}/);
 assert.doesNotMatch(part,/disabled[^\n]*shortageCount/);
 assert.match(css,/\.v095-stock-check\{/);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.match(css,/@media\(max-height:650px\)/);
 assert.ok(css.indexOf('.v095-stock-check')>css.indexOf('.kitchen-prep-card'));
});

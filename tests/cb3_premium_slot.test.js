import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCBDeck} from '../src/cb_build_rules.js';
import {newGame,stageCB3Migration,activateCB3,formalCBChapter,formalCBDeck,setFormalCBDeck,setPremiumMenu,premiumMenuActive,premiumMenuOptions,premiumReserved,prepDish,createService,selectArrivalDish,setServicePaused,formalCBWaveOptions,breakPrep,resumeBreak,tick,closeService,advanceDay} from '../src/engine.js';
test('formal premium consumes the existing slot and cost, freezes craft and reserves but never invents sales',()=>{
 for(const seed of [1,2,3,4,5,20261009,42,99]){
  const s=newGame(seed);for(const id of Object.keys(s.inventory))s.inventory[id]=20;for(const id of ['mushroom_heart','garlic','chicken','mushroom','ember_pepper','beef'])s.inventory[id]=20;
  s.recipes.mushroom_heart_wok=80;s.recipes.ember_pepper_wok=80;
  assert.equal(stageCB3Migration(s).status,'staged');assert.ok(activateCB3(s));
  const c=formalCBChapter(s),rare=s.cbBuild.collection.find(x=>x.recipeId==='mushroom_heart_wok');assert.ok(rare);s.phase='menu';
  assert.equal(setPremiumMenu(s,rare.recipeId,1),false);assert.ok(!premiumMenuOptions(s).some(x=>x.id===rare.recipeId));
  const deck=[...c.deck];deck[2]=rare.variantId;assert.ok(setFormalCBDeck(s,deck));
  const before=structuredClone(s.inventory),ledger=s.ledger.length,cost=formalCBDeck(s,c.deck).used;
  assert.equal(setPremiumMenu(s,rare.recipeId,3),false);assert.equal(setPremiumMenu(s,'ember_pepper_wok',1),false);
  s.inventory.mushroom_heart=0;assert.equal(setPremiumMenu(s,rare.recipeId,1),false);s.inventory.mushroom_heart=20;
  assert.ok(setPremiumMenu(s,rare.recipeId,2));assert.ok(premiumMenuActive(s));assert.equal(s.premiumMenu.variantId,rare.variantId);
  assert.equal(formalCBDeck(s,c.deck).used,cost);assert.equal(s.menu.length,3);assert.deepEqual(s.inventory,before);assert.equal(s.ledger.length,ledger);
  assert.equal(premiumReserved(s).mushroom_heart,2);assert.equal(setFormalCBDeck(s,deck),false);
  assert.ok(setPremiumMenu(s,null));assert.ok(!premiumMenuActive(s));assert.equal(premiumReserved(s).mushroom_heart,undefined);
  assert.ok(setPremiumMenu(s,rare.recipeId,2));s.phase='prep';assert.equal(prepDish(s,rare.recipeId),false);assert.equal(setPremiumMenu(s,null),false);
  s.phase='service';assert.ok(createService(s,{walkable:false}));const frozen=structuredClone(s.service.premiumOffered.craft);assert.equal(frozen.variantId,rare.variantId);
  const normal={id:'test-normal',segment:'regular'};selectArrivalDish(s,normal);assert.notEqual(normal.recipeId,rare.recipeId);assert.ok(!normal.premium);
  setServicePaused(s,false);for(let i=0;i<240&&!s.service.done;i++){if(s.service.breakAt){assert.equal(formalCBWaveOptions(s,2).length,0);assert.equal(breakPrep(s,rare.recipeId),false);resumeBreak(s);}tick(s,1);}
  assert.ok(s.service.done);assert.deepEqual(s.service.premiumOffered.craft,frozen);assert.ok(s.service.orders.filter(o=>o.premium).length<=2);assert.ok(s.service.orders.every(o=>o.recipeId!==rare.recipeId||o.premium));
  assert.ok(closeService(s));assert.equal(s.report.premium.sold,1);assert.equal(new Set(s.ledger.map(x=>x.id)).size,s.ledger.length);assert.ok(Object.values(s.inventory).every(x=>x>=0));
  s.phase='upgrade';assert.ok(advanceDay(s));assert.ok(!premiumMenuActive(s));assert.ok(s.menu.includes(rare.recipeId));
 }
});
test('premium white does not count for stars affix',()=>{
 const v={recipeId:'mushroom_stir',variantId:'x',vessel:'WOK',baseTier:3,rarity:5,affixes:[{id:'stars',value:8}],ingredientIds:['mushroom','garlic'],basePrice:100,baseTime:10,recipeTags:[],materialCost:1};
 const w={...v,recipeId:'chicken_stew',variantId:'w',rarity:1,baseTier:1,affixes:[]};
 assert.equal(compileCBDeck([v,w]).mushroom_stir.price,108);assert.equal(compileCBDeck([v,w],'chicken_stew').mushroom_stir.price,100);
});

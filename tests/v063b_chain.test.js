import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ING,RECIPES} from '../src/data.js';
import {newGame,ensureRecipeVariants,recipeCraftSnapshot,chooseRecipeVariant,
 selectArrivalDish,createService,tick,feedCrew,crewEffects,prepareBento,availableBento,
 enterField,beginLiveResearch,dropLiveIngredient,stepLiveResearch,finishLiveResearch,
 prepDish,activeRecipeVariant,closeService} from '../src/engine.js';
import {startActionField,stepActionField} from '../src/field_v04.js';

function equip(s,id,style,ingredients=null,quality=86){
 s.recipes[id]=quality;ensureRecipeVariants(s);
 const v={variantId:'test-'+id+'-'+style,recipeId:id,ingredientIds:ingredients||RECIPES[id].ids,
  vessel:RECIPES[id].station,style,styleLabel:style,quality,valid:true,legacy:false};
 (s.recipeVariants[id]??=[]).push(v);s.activeVariantIds[id]=v.variantId;return v;
}
test('different recipes with 爆炒 resolve DIFFERENT time and guest benefits',()=>{
 const s=newGame();
 equip(s,'garlic_beef','burst');
 equip(s,'chili_meat','burst');
 const g=recipeCraftSnapshot(s,'garlic_beef'),chili=recipeCraftSnapshot(s,'chili_meat');
 assert.equal(g.timeDelta,-1);assert.equal(chili.timeDelta,0);
 assert.notDeepEqual(g.guestFitDelta,chili.guestFitDelta);
});
test('guest freezes exact craft including real ingredient replacement and price at order',()=>{
 const s=newGame();equip(s,'chili_meat','burst',['beef','chili']);
 s.menu=['chili_meat','chili_meat','chili_meat'];
 s.phase='service';assert.equal(createService(s),true);
 const o=s.service.orders[0];o.segment='adventurer';
 selectArrivalDish(s,o);const snap=structuredClone(o.craft);
 assert.deepEqual(o.craft.ingredientIds,['beef','chili']);
 assert.equal(o.craft.variantId,'test-chili_meat-burst');
 const second=equip(s,'chili_meat','home',['chicken','chili']);
 assert.ok(chooseRecipeVariant(s,'chili_meat',second.variantId));
 assert.deepEqual(o.craft,snap,'existing order must not change');
 o.status='queued';o.arrival=0;s.service.queued.push(o.id);s.service.paused=false;
 const initialB=s.inventory.beef,initialC=s.inventory.chicken;
 tick(s,1);
 assert.equal(s.inventory.beef,initialB-1,'cooking with beef must consume beef');
 assert.equal(s.inventory.chicken,initialC,'cannot charge default chicken');
 assert.equal(o.craft.variantId,snap.variantId);
});
test('finished dish lands and earns frozen crafted price once, not base price',()=>{
 const s=newGame();
 equip(s,'mushroom_stir','aroma',['mushroom','garlic'],84);
 s.menu=['mushroom_stir','mushroom_stir','mushroom_stir'];s.phase='service';
 assert.equal(createService(s),true);
 const o=s.service.orders[0];o.segment='regular';selectArrivalDish(s,o);
 assert.equal(o.craft.price,RECIPES.mushroom_stir.price+1);
 o.status='queued';o.arrival=0;s.service.queued.push(o.id);s.service.paused=false;
 for(let i=0;i<15;i++)tick(s,1);
 assert.ok(['eating','review','served'].includes(o.status),o.status);
 const sales=s.ledger.filter(x=>x.id==='sale-'+o.id);
 assert.equal(sales.length,1);assert.equal(sales[0].amount,o.craft.price);
 assert.equal(s.service.income,s.ledger.filter(x=>x.type==='sale').reduce((sum,x)=>sum+x.amount,0),'income tracks all diner landing sales, including additional arrivals');
 for(let i=0;i<5&&o.status!=='served';i++)tick(s,1);
 assert.equal(o.status,'served');
 s.service.done=true;const report=closeService(s);
 assert.ok(report.byCraft['mushroom_stir|test-mushroom_stir-aroma']);
 assert.ok(report.byCraft['mushroom_stir|test-mushroom_stir-aroma'].revenue>=19);
});
test('real ingredients and style freeze when pre-cooking, even after recipe switch',()=>{
 const s=newGame();s.phase='prep';
 const a=equip(s,'chili_meat','burst',['beef','chili']);
 s.menu=['chili_meat','mushroom_stir','chicken_stew'];const x=s.inventory.beef;
 assert.ok(prepDish(s,'chili_meat'));assert.equal(s.inventory.beef,x-1);
 assert.equal(s.prepVariants.chili_meat[0].variantId,a.variantId);
 equip(s,'chili_meat','home',['chicken','chili']);
 assert.equal(s.prepVariants.chili_meat[0].variantId,a.variantId);
});
test('crew food checks recipe-specific craft and respects existing limits',()=>{
 const s=newGame();s.phase='prep';s.crew.helper.hired=true;
 equip(s,'mushroom_stir','aroma',['mushroom','garlic'],76);
 const before={...s.inventory};assert.equal(feedCrew(s,'helper','mushroom_stir'),true);
 assert.equal(s.inventory.mushroom,before.mushroom-1);
 assert.equal(s.crew.helper.feed.craftBonus?.bonus,1);
 assert.ok(crewEffects(s).helper.seconds<=4);
 assert.equal(feedCrew(s,'helper','mushroom_stir'),false);
});
test('bento is daily-only, consumes exactly one recipe and is preserved in field',()=>{
 const s=newGame(),before={...s.inventory};
 const options=availableBento(s);
 assert.ok(options.some(x=>x.recipeId==='chicken_stew'));
 assert.equal(prepareBento(s,'chicken_stew'),true);
 assert.equal(s.inventory.chicken,before.chicken-1);
 assert.equal(s.inventory.mushroom,before.mushroom-1);
 assert.equal(prepareBento(s,'chicken_stew'),false);
 s.phase='field';assert.equal(enterField(s,'risk'),true);startActionField(s);
 assert.equal(s.field.bento.recipeId,'chicken_stew');
 assert.equal(s.ledger.filter(x=>x.id==='bento-1-1').length,1);
});
test('enemy protection bento reduces one actual enemy hit, not an infinite shield',()=>{
 const s=newGame();prepareBento(s,'chicken_stew');s.phase='field';s.selectedWeaponSlot=1;enterField(s,'risk');startActionField(s);
 const f=s.field;
 f.enemies=[{id:'enemy',kind:'chicken',x:f.pos.x+.6,y:f.pos.y,hp:80,maxHp:80,cooldown:0,phase:0,warning:0}];
 for(let i=0;i<30;i++)stepActionField(s,0,0,.06);
 assert.equal(f.bento.used,true);
 assert.equal(f.hp,3,'protected one point from first enemy strike');
});
test('research settlement persists independent receipt and never awards failed dish',()=>{
 const s=newGame();s.phase='research';
 assert.equal(beginLiveResearch(s,['chicken','chili'],'WOK'),true);
 dropLiveIngredient(s,'chicken');dropLiveIngredient(s,'chili');
 for(let i=0;i<22;i++)stepLiveResearch(s,.07);
 const r=finishLiveResearch(s);assert.equal(r.sellable,false);
 assert.equal(s.researchReceipt,true);assert.equal(s.cook,null);
 assert.ok(s.lastCook.ingredientCost>0);
 assert.equal(s.recipeVariants.chili_meat,undefined);
});
test('main game contains dedicated settlement controls and per-craft service report',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/function researchReceipt\(\)/);
 assert.match(app,/receipt-retry/);assert.match(app,/receipt-finish/);
 assert.match(app,/byCraft/);assert.match(app,/data-bento/);
});

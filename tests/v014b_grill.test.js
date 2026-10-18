import test from 'node:test';
import assert from 'node:assert/strict';
import {RECIPES,RECIPE_INDEX,recipeSignature} from '../src/data.js';
import {evaluateGrillCook} from '../src/grill_cooking_v014b.js';
import {evaluatePlacedGrill} from '../src/grill_cooking_v014c.js';
import {newGame,ensureKitchen,buyGrill,GRILL_COST,grillAvailable,configureKitchenSlot,fieldWeaponChoices,
 selectFieldWeapon,enterField,beginLiveResearch,threadGrillIngredient,placeGrillSkewer,grillCookPreview,dropLiveIngredient,performLiveAction,stepLiveResearch,
 finishLiveResearch,recipeCraftSnapshot,chooseRecipeVariant,createService,setServicePaused,tick,resumeBreak,closeService,markManual} from '../src/engine.js';
import {startActionField,useFieldSkill,inForkFlameCone,stepActionField} from '../src/field_v04.js';
import {DINER_FLOOR} from '../src/restaurant_scene_v075.js';
function owned(seed=1203){const s=newGame(seed);s.phase='upgrade';s.chapterProgress.stars=2;s.kitchen.thirdUnlocked=true;s.kitchen.slots.push({type:'WOK',level:1});s.coins=500;assert.equal(buyGrill(s),true);return s;}
function advanceResearch(s,seconds){for(let i=0;i<Math.round(seconds*10);i++)stepLiveResearch(s,.1)}
function outcome(ids,turn=4.5,finish=9.5,brush=5.5){const drops=ids.map((id,index)=>({id,t:0,index}));const actions=turn===null?[]:[{type:'turn',t:turn,with:[...ids]},...(brush===null?[]:[{type:'brush',t:brush,with:[...ids]}])];return evaluateGrillCook(ids,drops,actions,finish);}
test('second star and central expansion purchase the bundle once, never migrate it into an old save',()=>{
 const old=newGame();old.kitchen.thirdUnlocked=true;old.kitchen.slots.push({type:'WOK',level:1});old.phase='upgrade';old.coins=500;
 assert.equal(ensureKitchen(old).grillOwned,false);assert.equal(grillAvailable(old),false);assert.equal(configureKitchenSlot(old,2,'GRILL'),false);
 old.chapterProgress.stars=2;assert.equal(grillAvailable(old),true);
 const before=old.coins;assert.equal(buyGrill(old),true);assert.equal(buyGrill(old),false);
 assert.equal(old.coins,before-GRILL_COST);assert.equal(old.ledger.filter(x=>x.id==='grill-fork-bundle').length,1);
 old.phase='prep';assert.equal(configureKitchenSlot(old,0,'GRILL'),false);assert.equal(configureKitchenSlot(old,2,'GRILL'),true);
 assert.equal(ensureKitchen(old).slots[2].type,'GRILL');assert.equal(fieldWeaponChoices(old).length,3);
});
test('ten authored grill recipes use unique signatures; both faces and brushing matter',()=>{
 const grillIds=Object.keys(RECIPES).filter(id=>RECIPES[id].station==='GRILL');
 assert.equal(grillIds.length,10);
 assert.equal(new Set(grillIds.map(id=>recipeSignature(RECIPES[id].ids,'GRILL'))).size,10);
 for(const id of grillIds)assert.equal(RECIPE_INDEX[recipeSignature(RECIPES[id].ids,'GRILL')],id);
 assert.equal(RECIPE_INDEX[recipeSignature(['beef','onion'],'GRILL')],undefined);
 for(const id of grillIds){
  const ids=RECIPES[id].ids;
  assert.equal(outcome(ids,1,5).sellable,false,'early finish is raw on both sides');
  assert.equal(outcome(ids,null,9.5).sellable,false,'one face cannot pass');
  assert.equal(outcome(ids,4.5,19).sellable,false,'late finish burns');
  assert.equal(outcome(ids,4.5,9.5).sellable,true);
  assert.equal(outcome(ids,4.5,9.5,null).quality,80);
  assert.equal(outcome(ids).quality,85);
  assert.equal(outcome(ids).affinity,'signature');
 }
 const s=owned();s.phase='research';s.inventory.beef=3;s.inventory.garlic=3;
 const initial={beef:s.inventory.beef,garlic:s.inventory.garlic};
 assert.equal(beginLiveResearch(s,['beef','garlic'],'GRILL'),true);
 assert.equal(s.cook.mode,'v014c-grill');
 assert.equal(threadGrillIngredient(s,'beef'),true);assert.equal(performLiveAction(s,'turn'),false);
 advanceResearch(s,3);assert.equal(s.cook.elapsed,0,'threading never cooks');
 assert.equal(threadGrillIngredient(s,'garlic'),true);assert.equal(performLiveAction(s,'brush'),false);
 assert.equal(placeGrillSkewer(s,'middle'),true);
 advanceResearch(s,4.5);assert.equal(performLiveAction(s,'turn'),true);advanceResearch(s,1);assert.equal(performLiveAction(s,'brush'),true);
 advanceResearch(s,4);assert.equal(finishLiveResearch(s).sellable,true);
 assert.equal(s.inventory.beef,initial.beef-1);assert.equal(s.inventory.garlic,initial.garlic-1);
 assert.equal(s.lastCook.sellable,true);assert.equal(s.recipes.grill_beef,88);
 const glazed=recipeCraftSnapshot(s,'grill_beef');
 assert.ok(glazed.price>RECIPES.grill_beef.price);assert.equal(glazed.timeDelta,1);
 assert.equal(s.recipeVariants.grill_beef.length,1);
});
function service(seed,staffed,recipeId='grill_beef'){const s=owned(seed);s.phase='prep';assert.equal(configureKitchenSlot(s,2,'GRILL'),true);
 s.menu=[recipeId,'chicken_stew','mushroom_stir'];s.recipes[recipeId]=85;
 s.crew.helper2={hired:true,onDuty:staffed,station:2,level:1,xp:0};
 for(const id of Object.keys(s.inventory))s.inventory[id]=100;
 s.phase='service';assert.equal(createService(s,{walkable:true}),true);
 Object.assign(s.service.hero,DINER_FLOOR.right);
 const o=s.service.orders[0];o.recipeId=recipeId;o.status='queued';o.arrival=0;o.patience=1000;
 o.craft=recipeCraftSnapshot(s,recipeId);s.service.queued.push(o.id);
 assert.equal(markManual(s,o.id),false);
 assert.equal(setServicePaused(s,false),true);
 for(let i=0;i<110&&!s.service.done;i++){if(s.service.breakAt)resumeBreak(s);tick(s,1);}
 return {s,o};}
test('a real GRILL order uses centre staff, material and sale ledger; an empty station cannot cook',()=>{
 const active=service(1301,true),v=active.s.service;
 assert.ok(v.events.some(e=>e.type==='started'&&e.order===active.o.id&&e.station==='CENTER'));
 assert.equal(active.s.ledger.filter(e=>e.id==='service-cook-'+active.o.id).length,1);
 assert.deepEqual(active.s.ledger.find(e=>e.id==='service-cook-'+active.o.id)?.items,{beef:-1,garlic:-1});
 assert.equal(active.o.status,'served');assert.equal(active.s.ledger.filter(e=>e.id==='sale-'+active.o.id).length,1);
 assert.equal(closeService(active.s).kitchen.stats.CENTER.count>0,true);
 const empty=service(1301,false);
 assert.equal(empty.s.service.events.some(e=>e.type==='started'&&e.order===empty.o.id),false);
 assert.equal(empty.s.ledger.some(e=>e.id==='service-cook-'+empty.o.id),false);
 const newDish=service(1301,true,'grill_garlic_mushroom');
 assert.equal(newDish.o.status,'served');
 assert.deepEqual(newDish.s.ledger.find(e=>e.id==='service-cook-'+newDish.o.id)?.items,{mushroom:-1,garlic:-1});
 assert.equal(newDish.s.ledger.filter(e=>e.id==='sale-'+newDish.o.id).length,1);
});
test('fork flame is a directional cone with multiple targets and line-of-sight',()=>{
 const s=owned();s.phase='field';assert.equal(selectFieldWeapon(s,'GRILL'),true);assert.equal(enterField(s,'safe'),true);
 assert.equal(s.field.weapon.type,'GRILL');startActionField(s);
 const f=s.field;f.pos={x:4.5,y:6.5};f.facing={x:1,y:0};f.obstacles=[];f.worldW=12;f.worldH=16;
 f.enemies=[{id:'a',x:5,y:6.5,hp:4},{id:'b',x:5.8,y:6.5,hp:4},{id:'c',x:6.5,y:6.5,hp:4},{id:'side',x:5.7,y:7.6,hp:4}];
 assert.equal(inForkFlameCone(f.pos,f.facing,{x:6.5,y:6.5}),true);
 assert.equal(useFieldSkill(s),true);assert.deepEqual(f.enemies.map(e=>e.hp),[2,2,2,4]);assert.equal(useFieldSkill(s),false);
 f.skillCd=0;f.obstacles=[{x:5,y:6}];assert.equal(useFieldSkill(s),true,'skill still animates when blocked');
 assert.ok(f.enemies.every(e=>e.hp>=0));
 const prior=newGame();prior.phase='field';enterField(prior,'safe');const weapon=structuredClone(prior.field.weapon);
 prior.kitchen.thirdUnlocked=true;prior.kitchen.slots.push({type:'WOK',level:1});prior.chapterProgress.stars=2;prior.phase='upgrade';prior.coins=500;buyGrill(prior);
 assert.deepEqual(prior.field.weapon,weapon,'in-flight weapon never changes after purchase');
});

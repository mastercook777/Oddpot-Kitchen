import test from 'node:test';
import assert from 'node:assert/strict';
import {ING,RECIPES,RECIPE_INDEX} from '../src/data.js';
import {liveRecipeId,evaluateLiveCook} from '../src/cooking_v063.js';
import {newGame,enterField,startCook,selectFieldWeapon,fieldWeaponSnapshot,
 completeFieldSegment,chooseFieldBranch,settleField,fieldBagSlotsUsed,addFieldBag,
 purchase,ensureDailyMarket,buyKitchenUpgrade,stationDuration,discardFieldStack,load,save,nextPhase} from '../src/engine.js';
import {startActionField,stepActionField,useFieldSkill} from '../src/field_v04.js';
const start=(route='safe',weapon=0)=>{
 const s=newGame(42);s.phase='field';selectFieldWeapon(s,weapon);
 assert.equal(enterField(s,route),true);
 assert.equal(startActionField(s),true);
 return s;
};
const clearStage=s=>{
 const target=s.field.nodes.find(n=>n.key==='target');assert.ok(target);
 target.claimed=true;return completeFieldSegment(s);
};
test('catalog retains normal recipes and all four Boss dishes alongside the encounter additions',()=>{
 assert.equal(Object.keys(ING).length,12);
 assert.equal(Object.keys(RECIPE_INDEX).length,186);
 assert.equal(Object.keys(RECIPES).length,185);
 for(const recipe of ['mushroom_heart_wok','mushroom_heart_pot','ember_pepper_wok','ember_pepper_pot'])
  assert.equal(RECIPES[recipe].rare,true);
 assert.equal(liveRecipeId(['mushroom_heart','garlic'],'WOK'),'mushroom_heart_wok');
 assert.equal(liveRecipeId(['ember_pepper','beef','garlic'],'WOK'),'ember_pepper_wok');
 assert.equal(liveRecipeId(['ember_pepper','mushroom'],'WOK'),null,'rare ingredient must not enter generic recipes');
 for(const recipe of ['mushroom_heart_wok','mushroom_heart_pot','ember_pepper_wok','ember_pepper_pot']){
  const r=RECIPES[recipe],time=r.station==='POT'?16:9;
  const result=evaluateLiveCook(r.ids,r.station,
   r.ids.map((id,index)=>({id,t:0,index})),
   r.station==='POT'?[{type:'reduce',t:6,with:r.ids}]:[{type:'flip',t:3,with:r.ids}],
   time);
  assert.equal(result.sellable,true,recipe+': '+JSON.stringify(result.doneness));
 }
});
test('market offers four rotating ordinary staples, while boss ingredients remain field-only',()=>{
 const s=newGame();s.coins=400;
 const offered=ensureDailyMarket(s).goods;
 for(const id of ['garlic','mushroom','cabbage','chicken']){
  assert.equal(ING[id].acquisitionPolicy,'SHOP_STAPLE');
  assert.equal(purchase(s,id),Boolean(offered[id]),id);
 }
 for(const id of ['beef','chili','onion','potato'])
  assert.equal(purchase(s,id),Boolean(offered[id]),id);
 for(const id of ['mushroom_heart','ember_pepper','tide_sour_pulp','starlit_nectar'])
  assert.equal(purchase(s,id),false,id);
});
test('two explicit branch choices each, no fourth segment, one authoritative inventory settlement',()=>{
 const s=start('safe');
 assert.equal(s.field.segmentIndex,1);
 assert.equal(clearStage(s),true);
 assert.equal(s.field.segmentStatus,'choice');
 assert.equal(s.field.choices.length,2);
 const first=s.field.choices.map(x=>x.choiceId);
 const secondChoice=s.field.choices[0].choiceId;
 assert.equal(chooseFieldBranch(s,secondChoice),true);
 assert.equal(chooseFieldBranch(s,secondChoice),false,'branch cannot be selected twice');
 assert.equal(startActionField(s),true);
 assert.equal(s.field.segmentIndex,2);
 assert.equal(clearStage(s),true);
 assert.equal(s.field.choices.length,2);
 assert.equal(chooseFieldBranch(s,s.field.choices[0].choiceId),true);
 assert.equal(startActionField(s),true);
 assert.equal(s.field.segmentIndex,3);
 assert.equal(s.field.enemies.some(e=>e.isBoss),false,'safe route can avoid all boss combat');
 const old=s.inventory.mushroom||0;
 assert.equal(addFieldBag(s.field,'mushroom',2),2);
 assert.equal(clearStage(s),true);
 assert.equal(s.phase,'research');
 assert.equal(s.inventory.mushroom,old+2);
 assert.equal(s.ledger.filter(e=>e.type==='exploration').length,1);
 assert.equal(settleField(s),false,'settlement may never happen twice');
 assert.equal(s.field.selectedBranches.length,2);
 assert.equal(first.length,2);
});
test('danger final segment deterministically spawns matching mini boss and rare pickup',()=>{
 for(const [route,bossId,ingredient] of [['risk','spore_king','mushroom_heart'],['spring_risk','ember_king','ember_pepper']]){
  const s=start(route,1);
  clearStage(s);
  assert.equal(s.field.choices.length,2);
  chooseFieldBranch(s,s.field.choices[1].choiceId);startActionField(s);
  clearStage(s);chooseFieldBranch(s,s.field.choices[0].choiceId);startActionField(s);
  const f=s.field,boss=f.enemies.find(e=>e.isBoss);
  assert.equal(boss.id,bossId);
  f.enemies=[boss];boss.cooldown=999;f.pos={x:boss.x+2,y:boss.y+.9};
  f.damageCd=999;
  const before=s.inventory.onion;
  for(let i=0;i<400&&boss.hp>0;i++)stepActionField(s,0,0,.06);
  assert.equal(boss.hp,0,'boss must be defeatable by Lv1 POT');
  const rare=f.nodes.find(n=>n.key==='boss-reward-3');
  assert.equal(rare?.id,ingredient);
  assert.equal(rare?.n,2);
  assert.equal(s.inventory.onion,before,'POT onions never cost ingredients');
  assert.equal(completeFieldSegment(s),false,'must still claim target source');
  f.nodes.find(n=>n.key==='target').claimed=true;
  f.pos={x:rare.x,y:rare.y};
  for(let i=0;i<18;i++)stepActionField(s,0,0,.06);
  assert.equal(rare.claimed,true);
  assert.equal(completeFieldSegment(s),true);
  assert.equal(s.inventory[ingredient],2);
  assert.equal(s.ledger.filter(t=>t.type==='exploration').length,1);
  assert.equal(s.bossCleared[bossId],true);
 }
});
test('WOK shield has distinct skill and kitchen upgrade is reused on expedition',()=>{
 const s=newGame();
 const initial=fieldWeaponSnapshot(s);
 assert.equal(initial.type,'WOK');
 assert.equal(initial.level,1);
 s.phase='upgrade';s.coins=300;assert.equal(buyKitchenUpgrade(s,0),true);
 assert.equal(fieldWeaponSnapshot(s).level,2);
 const r=RECIPES.mushroom_stir;
 assert.ok(stationDuration(s,'WOK',r,null)<r.time);
 s.phase='field';enterField(s,'safe');startActionField(s);
 const f=s.field;f.enemies=[];assert.equal(f.weapon.level,2);
 assert.equal(useFieldSkill(s),true);
 assert.ok(f.guardTime>=.5);
 assert.equal(useFieldSkill(s),false,'skill cooldown survives repeated presses');
});
test('same ingredient gets multiple bag stacks, full inventory cannot silently gain new items',()=>{
 const s=start(),f=s.field;
 assert.equal(addFieldBag(f,'mushroom',5),5);
 assert.equal(fieldBagSlotsUsed(f),2);
 assert.equal(f.bagStacks.length,2);
 assert.ok(discardFieldStack(s,'mushroom-1'));
 assert.equal(f.bag.mushroom,2);
 const ids=['garlic','cabbage','chicken','chili','beef','onion','potato'];
 ids.slice(0,6).forEach(id=>assert.equal(addFieldBag(f,id,1),1));
 assert.equal(fieldBagSlotsUsed(f),7);
 assert.equal(addFieldBag(f,'potato',5),3,'one spare stack admits only 3');
 assert.equal(fieldBagSlotsUsed(f),8);
 assert.equal(addFieldBag(f,'mushroom_heart',2),0,'rare must stay on ground until player frees a slot');
});

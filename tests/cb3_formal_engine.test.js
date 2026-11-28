import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,stageCB3Migration,activateCB3,formalCBChapter,formalCBDeck,setFormalCBDeck,confirmFormalCBCraft,removeFormalCBCraft,toggleFormalCBLock,beginLiveResearch,dropLiveIngredient,threadGrillIngredient,placeGrillSkewer,performLiveAction,stepLiveResearch,finishLiveResearch,recipeCraftSnapshot,canMenu,createService,serviceDayPlan,prepDish,setServicePaused,tick,resumeBreak,closeService,selectMenuRecipe} from '../src/engine.js';
test('formal activation, real research collection, deck, and normal service without fixture',()=>{
 const s=newGame();assert.equal(stageCB3Migration(s).status,'staged');assert.ok(activateCB3(s));assert.ok(canMenu(s));assert.equal(s.cbExperiment,undefined);
 s.phase='research';for(const id of ['garlic','mushroom'])s.inventory[id]=20;
 assert.equal(beginLiveResearch(s,['beef','chicken'],'WOK'),false);assert.ok(beginLiveResearch(s,['garlic','mushroom'],'WOK'));assert.ok(s.cook.cbTiming);for(const id of s.cook.ids)assert.ok(dropLiveIngredient(s,id));
 for(let i=0;i<90;i++)stepLiveResearch(s,.1);const r=finishLiveResearch(s);assert.ok(r.sellable&&r.cbCandidate);const n=s.cbBuild.collection.length;assert.ok(confirmFormalCBCraft(s));assert.ok(confirmFormalCBCraft(s));assert.equal(s.cbBuild.collection.length,n+1);assert.equal(finishLiveResearch(s),false);
 const id=r.cbCandidate.variantId;assert.ok(toggleFormalCBLock(s,id));assert.equal(removeFormalCBCraft(s,id),false);
 s.researchReceipt=false;s.phase='menu';const deck=s.cbBuild.chapters.hearth.deck.map(x=>s.cbBuild.collection.find(v=>v.variantId===x).recipeId==='mushroom_stir'?id:x);assert.ok(setFormalCBDeck(s,deck));assert.equal(recipeCraftSnapshot(s,'mushroom_stir').variantId,id);assert.equal(selectMenuRecipe(s,0,'veg_stir'),false);assert.equal(setFormalCBDeck(s,[id,id,id]),false);
 s.phase='prep';assert.ok(prepDish(s,'mushroom_stir'));s.phase='service';const p=serviceDayPlan(s);assert.ok(createService(s,{walkable:false}));assert.equal(s.service.orders.length,p.count);setServicePaused(s,false);for(let i=0;i<200&&!s.service.done;i++){if(s.service.breakAt)resumeBreak(s);tick(s,1);}assert.ok(s.service.done);assert.ok(closeService(s));assert.equal(new Set(s.ledger.map(x=>x.id)).size,s.ledger.length);assert.ok(Object.values(s.inventory).every(x=>x>=0));
});
test('activation rejects stale and unsafe saves',()=>{const s=newGame();stageCB3Migration(s);s.phase='research';assert.equal(activateCB3(s),false);s.phase='forecast';s.menu.reverse();assert.equal(activateCB3(s),false);assert.equal(formalCBChapter(s),null);});

test('four actual formal cookware timelines consume ingredients once and collect',()=>{
 for(const [v,ids,recipe,actions] of [
 ['WOK',['garlic','mushroom'],'mushroom_stir',['flip','toss']],
 ['POT',['chicken','mushroom'],'chicken_stew',['gentle','reduce']],
 ['GRILL',['beef','garlic'],'grill_beef',['brush','smoke']],
 ['STEAM',['cloud_rice','chicken'],'steam_cloud_rice',['vent','seal']]]){
  const s=newGame();if(v==='STEAM'){s.activeWorld='cloud';s.cloudProgress={localCrew:true};s.menu=['cloud_rice_chicken','sour_rice','cloud_potato_rice'];s.recipes=Object.fromEntries(s.menu.map(id=>[id,72]));s.kitchen.steamerOwned=true;}
  if(v==='GRILL')s.kitchen.grillOwned=true;for(const id of ids)s.inventory[id]=10;
  assert.equal(stageCB3Migration(s).status,'staged');assert.ok(activateCB3(s));s.phase='research';assert.ok(beginLiveResearch(s,ids,v));assert.ok(s.cook.cbTiming);
  if(v==='GRILL'){for(const id of ids)assert.ok(threadGrillIngredient(s,id));assert.ok(placeGrillSkewer(s,'middle'));assert.equal(performLiveAction(s,'turn'),false);}
  else for(const id of ids)assert.ok(dropLiveIngredient(s,id));
  for(let i=0;i<90;i++){if(i===6)assert.ok(performLiveAction(s,actions[0]));if(i===22)assert.ok(performLiveAction(s,actions[1]));stepLiveResearch(s,.1);}
  const r=finishLiveResearch(s);assert.equal(r.recipeId,recipe);assert.ok(r.sellable&&r.cbCandidate);assert.ok(r.doneness.every(x=>x.label==='熟透'));assert.ok(confirmFormalCBCraft(s));assert.ok(s.cbBuild.discoveredFormulas.includes(r.cbCandidate.formulaId));for(const id of ids)assert.equal(s.inventory[id],9);assert.equal(finishLiveResearch(s),false);
 }
});

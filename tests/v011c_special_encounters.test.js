import test from 'node:test';
import assert from 'node:assert/strict';
import {ING,RECIPES,RECIPE_INDEX} from '../src/data.js';
import {newGame,enterField,completeFieldSegment,chooseFieldBranch,settleField,syncFieldBagStacks,resolveSpecialFieldEvent,beginLiveResearch,dropLiveIngredient,performLiveAction,stepLiveResearch,finishLiveResearch,setPremiumMenu,premiumMenuOptions,createService,selectArrivalDish,tick,setServicePaused,advanceWalkableInteraction,currentServiceEvent,chooseServiceEvent,resumeBreak,closeService,purchase,buildFieldMap,interactExplorer,load,save,REGULAR_GUESTS} from '../src/engine.js';
import {startActionField,resolveFieldEvent,stepActionField} from '../src/field_v04.js';
import {makeSpecialEncounterPlan,specialEncounterOffer,previewSpecialEncounter,specialBagSlots} from '../src/field_encounters_v011c.js';
import {insertPlannedFieldEncounter,makeFieldEncounterPlan} from '../src/field_encounter_plan_v011b.js';
import {fieldTilePath} from '../src/field_rules_v011a.js';
import {liveRecipeId,evaluateLiveCook,liveIngredientHeatFeedback,resolveTechnique} from '../src/cooking_v063.js';
import {DINER_FLOOR,dinerWalk,dinerBlocked} from '../src/restaurant_scene_v075.js';
function encounter(kind='merchant',region='forest',seed=91){
 const s=newGame(seed);s.phase='field';enterField(s,region==='spring'?'spring_safe':'safe');startActionField(s);
 const n={key:'test-event',eventId:'test-'+seed+'-'+kind,kind,region,type:'event',id:region==='spring'?'potato':'mushroom',x:5.5,y:7.5,status:'available',claimed:false,offer:specialEncounterOffer(kind,region)};
 s.field.nodes=[n];s.field.activeEvent=n.key;s.field.enemies=[];s.field.hazards=[];s.field.obstacles=[];return {s,f:s.field,n};
}
const economic=s=>({coins:s.coins,hp:s.field.hp,bag:structuredClone(s.field.bag),inventory:structuredClone(s.inventory),ledger:structuredClone(s.ledger),claimed:s.field.nodes[0].claimed});
test('C chance is deterministic, rare rather than fixed daily, bounded and lightly guaranteed',()=>{
 for(const route of ['safe','risk','spring_safe','spring_risk']){
  let npc=0,ecology=0;
  for(let seed=1;seed<=1000;seed++){
   const s=newGame(seed),plan=makeSpecialEncounterPlan(s,route);assert.deepEqual(plan,makeSpecialEncounterPlan(s,route));
   assert.equal(plan.encounters.filter(e=>e.kind!=='ecology').length,plan.npcScheduled?1:0);assert.ok(plan.encounters.length<=2);
   npc+=Number(plan.npcScheduled);ecology+=Number(plan.encounters.some(e=>e.kind==='ecology'));
   for(const e of plan.encounters)assert.ok(e.kind==='ecology'?[1,2,3].includes(e.segment):[2,3].includes(e.segment));
   s.encounterProgress={misses:2};assert.ok(makeSpecialEncounterPlan(s,route).npcScheduled);
  }
  assert.ok(npc>=(/risk/.test(route)?420:320)&&npc<=(/risk/.test(route)?580:480));assert.ok(ecology>=180&&ecology<=320);
 }
});
test('all eight biome maps place scheduled C events safely and idempotently',()=>{
 const zones=['herb_path','glow_mushroom','old_tree_edge','forest_garden','hot_spring_shallows','steam_crack','ember_edge','steam_lake'];
 for(const zone of zones)for(let seed=1;seed<=32;seed++){
  const s=newGame(seed);s.fieldZoneId=zone;s.encounterProgress={misses:2};const route=/^(hot_|steam_|ember_)/.test(zone)?'spring_safe':'safe';const plan=makeSpecialEncounterPlan(s,route);
  for(const entry of plan.encounters){const map=buildFieldMap(s,route);insertPlannedFieldEncounter(map,plan,entry.segment);const n=map.nodes.find(n=>n.key===entry.eventId);assert.ok(n,zone);assert.ok(fieldTilePath(map,map.spawn,{x:n.x+.5,y:n.y+.5},{avoidHazards:true}).length);
   assert.ok(!map.hazards.some(h=>h.x===n.x&&h.y===n.y));assert.ok(!map.obstacles.some(h=>h.x===n.x&&h.y===n.y));const before=map.nodes.length;insertPlannedFieldEncounter(map,plan,entry.segment);assert.equal(map.nodes.length,before);
  }
 }
});
test('completed runs count missed NPC opportunities; early retreat, faint and duplicate settlement do not',()=>{
 for(const reason of ['retreat','faint']){const {s}=encounter();s.encounterProgress={misses:1};settleField(s,reason);assert.equal(s.encounterProgress.misses,1);}
 for(const opportunity of [true,false]){
  const {s,f}=encounter();s.encounterProgress={misses:1};f.segmentIndex=3;f.specialNpcOpportunity=opportunity;settleField(s,'completed');assert.equal(s.encounterProgress.misses,opportunity?0:2);assert.equal(settleField(s,'completed'),false);assert.equal(s.encounterProgress.misses,opportunity?0:2);
 }
});
test('an actually placed NPC resets the opportunity guarantee even on early exit',()=>{
 for(const reason of ['retreat','faint']){const {s,f}=encounter();s.encounterProgress={misses:2};f.specialNpcOpportunity=true;settleField(s,reason);assert.equal(s.encounterProgress.misses,0);}
});
test('complete real three-stage plans retain offers and cannot exceed their event budget',()=>{
 for(const route of ['safe','spring_safe'])for(let seed=1;seed<=24;seed++){
  const s=newGame(seed);s.phase='field';s.encounterProgress={misses:2};enterField(s,route);const plan=JSON.stringify(s.field.encounterPlan);let npc=0,events=0;
  for(let i=1;i<=3;i++){const f=s.field;assert.equal(JSON.stringify(f.encounterPlan),plan);const current=f.nodes.filter(n=>n.type==='event');npc+=current.filter(n=>n.kind!=='ecology').length;events+=current.length;startActionField(s);f.nodes.find(n=>n.key==='target').claimed=true;
   if(i<3){completeFieldSegment(s);chooseFieldBranch(s,f.choices[0].choiceId);}else completeFieldSegment(s);
  }
  assert.equal(npc,1);assert.ok(events<=2);assert.equal(s.encounterProgress.misses,0);
 }
});
test('merchant commits gold once to field bag, never directly to warehouse, including reload/forged repeat defense',()=>{
 const {s,f,n}=encounter();const before=s.coins;assert.ok(resolveFieldEvent(s,'buy'));assert.equal(s.coins,before-36);assert.equal(f.bag.tide_sour_pulp,2);assert.equal(s.inventory.tide_sour_pulp,undefined);assert.equal(n.status,'resolved');assert.equal(f.activeEvent,null);
 assert.equal(s.ledger.filter(t=>t.id==='encounter-'+n.eventId).length,1);const stored=JSON.parse(JSON.stringify(s));const beforeRepeat=economic(stored);assert.equal(resolveFieldEvent(stored,'buy'),false);assert.deepEqual(economic(stored),beforeRepeat);
 n.claimed=false;n.status='available';f.activeEvent=n.key;assert.equal(resolveSpecialFieldEvent(s,'buy'),false);assert.equal(f.bag.tide_sour_pulp,2);assert.equal(s.coins,before-36);
});
test('unaffordable, partial-space and invalid choice offers leave all economic state intact',()=>{
 for(const scenario of ['no-gold','full','partial','invalid']){
  const {s,f}=encounter();if(scenario==='no-gold')s.coins=35;
  if(scenario==='full'){f.capacity=1;f.bag={garlic:3};}
  if(scenario==='partial'){f.capacity=1;f.bag={tide_sour_pulp:2};}
  syncFieldBagStacks(f);const before=economic(s);assert.equal(resolveFieldEvent(s,scenario==='invalid'?'claim-free':'buy'),false);assert.deepEqual(economic(s),before);assert.equal(f.activeEvent,'test-event');
 }
});
test('barter reads field only, can free a full stack, and never exchanges partial quantities',()=>{
 for(const region of ['forest','spring']){
  const {s,f}=encounter('traveler',region),id=region==='forest'?'mushroom':'potato';f.capacity=1;s.inventory[id]=99;
  let before=economic(s);assert.equal(resolveFieldEvent(s,'trade'),false);assert.deepEqual(economic(s),before);
  f.bag={[id]:2};syncFieldBagStacks(f);assert.ok(previewSpecialEncounter(s,f.nodes[0],'trade').ok);assert.ok(resolveFieldEvent(s,'trade'));assert.deepEqual(f.bag,{starlit_nectar:2});assert.equal(f.bagStacks.length,1);assert.equal(s.inventory[id],99);assert.equal(s.coins,120);
 }
 const {s,f}=encounter('traveler');f.capacity=1;f.bag={mushroom:3};syncFieldBagStacks(f);const before=economic(s);assert.equal(resolveFieldEvent(s,'trade'),false);assert.deepEqual(economic(s),before);
});
test('decline consumes only the opportunity and cannot later claim any goods',()=>{
 for(const kind of ['merchant','traveler','ecology']){
  const {s,f,n}=encounter(kind);const inventory=JSON.stringify(s.inventory),coins=s.coins;assert.ok(resolveFieldEvent(s,'leave'));assert.equal(s.coins,coins);assert.equal(JSON.stringify(s.inventory),inventory);assert.deepEqual(f.bag,{});assert.equal(n.claimed,true);assert.equal(n.result.choice,'leave');assert.equal(resolveFieldEvent(s,'buy'),false);
 }
});
test('ecology discovery is explicit, HP-safe and one-time; full bag never charges HP',()=>{
 const {s,f}=encounter('ecology');f.hp=1;let before=economic(s);assert.equal(resolveFieldEvent(s,'forage'),false);assert.deepEqual(economic(s),before);assert.ok(resolveFieldEvent(s,'observe'));assert.equal(f.hp,1);assert.equal(f.bag.mushroom,1);
 const other=encounter('ecology','spring');other.f.capacity=1;other.f.bag={garlic:3};before=economic(other.s);assert.equal(resolveFieldEvent(other.s,'forage'),false);assert.deepEqual(economic(other.s),before);
 other.f.bag={};assert.ok(resolveFieldEvent(other.s,'forage'));assert.equal(other.f.hp,2);assert.equal(other.f.bag.potato,3);assert.equal(other.f.ecologyStats.damageTaken,1);assert.equal(other.f.ecologyStats.collected,3);
});
test('retreat/faint settle bought goods by original rule once and never refund purchase coins',()=>{
 for(const reason of ['retreat','faint']){
  const {s,f}=encounter();resolveFieldEvent(s,'buy');assert.ok(settleField(s,reason));assert.equal(s.inventory.tide_sour_pulp,reason==='faint'?1:2);assert.equal(s.coins,84);assert.equal(settleField(s,reason),false);assert.equal(s.ledger.filter(t=>t.type==='exploration').length,1);assert.equal(s.ledger.filter(t=>t.type==='field_trade').length,1);
 }
});
test('legacy plan/offer and source identities remain compatible through normal save/load',()=>{
 const {s,f}=encounter();f.encounterPlan=makeFieldEncounterPlan(s,'safe');f.nodes=[{key:'old',type:'event',id:'mushroom',n:1,x:5,y:5,claimed:false}];f.activeEvent='old';f.bag={mushroom:1};syncFieldBagStacks(f);assert.ok(resolveFieldEvent(s,'trade'));assert.deepEqual(f.bag,{chili:1});
 const old=globalThis.localStorage;const values=new Map();globalThis.localStorage={setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k)};
 try{const x=encounter('merchant').s;save(x);const y=load();assert.deepEqual(y.field.encounterPlan,x.field.encounterPlan);assert.deepEqual(y.field.nodes,x.field.nodes);assert.ok(resolveFieldEvent(y,'buy'));save(y);const z=load();assert.equal(resolveFieldEvent(z,'buy'),false);assert.equal(z.field.bag.tide_sour_pulp,2);assert.equal(z.coins,84);}finally{globalThis.localStorage=old;}
});
test('twelve ingredients/four new curated recipes extend catalog without generic rare combinations or source leakage',()=>{
 assert.equal(Object.keys(ING).length,17);assert.equal(Object.keys(RECIPES).length,198);assert.equal(Object.keys(RECIPE_INDEX).length,199);
 assert.equal(['cloud_rice','sky_moss','storm_egg','sour_bell'].filter(id=>ING[id].acquisitionPolicy==='FIELD_ONLY').length,4);
 for(const id of ['tide_sour_pulp','starlit_nectar']){
  const s=newGame();s.phase='field';s.selectedTarget=id;enterField(s,'safe');assert.ok(s.field.nodes.every(n=>n.id!==id));assert.ok(buildFieldMap(s,'safe',id).nodes.every(n=>n.id!==id));assert.equal(purchase(newGame(),id),false);
  assert.equal(liveRecipeId([id,'beef'],'WOK'),null);assert.equal(liveRecipeId([id,'mushroom'],'POT'),null);
 }
 for(const id of ['sour_chicken_wok','sour_potato_pot','nectar_cabbage_wok','nectar_chicken_pot']){
  const r=RECIPES[id],type=r.station==='WOK'?(id==='sour_chicken_wok'?'toss':'flip'):'gentle',t=r.station==='WOK'?8:12;
  const result=evaluateLiveCook(r.ids,r.station,r.ids.map((id,index)=>({id,t:0,index})),[{type,t:3,with:r.ids}],t);assert.equal(result.recipeId,id);assert.equal(result.sellable,true);assert.ok(result.doneness.every(d=>d.label==='熟透'));assert.equal(resolveTechnique(id,result.style).affinity,'signature');
  for(const part of r.ids)assert.ok(Number.isFinite(liveIngredientHeatFeedback({id:part,t:0},t,[],r.station).progress));
 }
});
test('quote previews and invalid offer payloads are read-only; direct legacy harvest cannot bypass a special event',()=>{
 const {s,f,n}=encounter();const before=JSON.stringify(s);assert.ok(previewSpecialEncounter(s,n,'buy').ok);assert.equal(JSON.stringify(s),before);
 n.offer.gain={unknown:2};assert.equal(previewSpecialEncounter(s,n,'buy').ok,false);n.offer.gain={tide_sour_pulp:1.5};assert.equal(previewSpecialEncounter(s,n,'buy').ok,false);n.offer.gain={tide_sour_pulp:2};
 f.x=n.x;f.y=n.y;const eco=economic(s);assert.equal(interactExplorer(s).ok,false);assert.deepEqual(economic(s),eco);
 assert.equal(specialBagSlots({mushroom:4,garlic:2}),3);
});
test('merchant and traveler goods complete real research then physical current-service hidden-dish sale exactly once',()=>{
 for(const [kind,recipe] of [['merchant','sour_chicken_wok'],['traveler','nectar_cabbage_wok']]){
  const {s,f}=encounter(kind);if(kind==='traveler')f.bag={mushroom:2};const wallet=s.coins;assert.ok(resolveFieldEvent(s,kind==='merchant'?'buy':'trade'));settleField(s);
  const r=RECIPES[recipe],rare=r.ids[0];assert.equal(s.inventory[rare],2);assert.equal(s.recipes[recipe],undefined);
  assert.ok(beginLiveResearch(s,r.ids,r.station));for(const id of r.ids)assert.ok(dropLiveIngredient(s,id));
  for(let i=0;i<30;i++)stepLiveResearch(s,.1);assert.ok(performLiveAction(s,kind==='merchant'?'toss':'flip'));for(let i=0;i<50;i++)stepLiveResearch(s,.1);
  const result=finishLiveResearch(s);assert.ok(result.sellable);assert.equal(result.recipeId,recipe);assert.equal(s.inventory[rare],1);assert.ok(s.recipes[recipe]);
  if(kind==='traveler')s.guestRelationships[REGULAR_GUESTS.regular.id]={visits:3,happyMeals:2};
  s.phase='menu';assert.ok(premiumMenuOptions(s).some(x=>x.id===recipe));assert.ok(setPremiumMenu(s,recipe,1));s.phase='service';assert.ok(createService(s,{walkable:true}));setServicePaused(s,false);
  const v=s.service,o=v.orders.find(x=>kind==='merchant'?x.segment==='critic':x.guestId===REGULAR_GUESTS.regular.id);assert.ok(o);assert.equal(selectArrivalDish(s,o).premium,true);v.orders=[o];o.status='queued';o.arrival=0;o.seatedAt=0;o.patience=140;o.tableId=0;o.seatId=0;v.queued=[o.id];
  let accumulator=0;
  function frame(){advanceWalkableInteraction(s,.04);accumulator+=.04;if(accumulator>=1){accumulator-=1;tick(s,1);}if(v.breakAt){const event=currentServiceEvent(s);for(const c of event?.choices||[])if(chooseServiceEvent(s,c.id)){resumeBreak(s);break;}}}
  function walk(target){for(let i=0;i<400;i++){const h=v.hero,dx=target.x-h.x,dy=target.y-h.y,d=Math.hypot(dx,dy);if(d<.012)break;dinerWalk(h,dx/d,dy/d,.04,s);assert.ok(!dinerBlocked(h.x,h.y,s));frame();}assert.ok(Math.hypot(v.hero.x-target.x,v.hero.y-target.y)<.02);}
  walk(DINER_FLOOR.left);for(let i=0;i<500&&o.status!=='pickup';i++)frame();assert.equal(o.status,'pickup');assert.equal(s.inventory[rare],0);assert.equal(s.ledger.filter(t=>t.id==='sale-'+o.id).length,0);
  walk({x:.5,y:.325});walk(DINER_FLOOR.pass);for(let i=0;i<20&&o.status==='pickup';i++)frame();assert.equal(o.status,'carried');
  walk({x:.5,y:DINER_FLOOR.tableWork[0].y});walk(DINER_FLOOR.tableWork[0]);for(let i=0;i<400&&o.status!=='served';i++)frame();assert.equal(o.status,'served');assert.equal(o.deliveryMode,'hero');
  assert.equal(v.premiumConsumed,1);assert.equal(s.ledger.filter(t=>t.id==='sale-'+o.id).length,1);assert.equal(s.ledger.filter(t=>t.type==='exploration').length,1);assert.equal(s.coins,wallet+s.ledger.reduce((n,t)=>n+(Number(t.amount)||0),0));
  tick(s,2);assert.equal(s.ledger.filter(t=>t.id==='sale-'+o.id).length,1);v.done=true;const report=closeService(s);assert.equal(report.premium.sold,1);assert.equal(report.premium.revenue,o.craft.price);
 }
});

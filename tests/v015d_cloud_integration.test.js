import test from 'node:test';
import assert from 'node:assert/strict';
import {RECIPES,CLOUD_MARKET_STAPLES} from '../src/data.js';
import {evaluateLiveCook,reviewLiveCook,liveCookAmount,liveRecipeId} from '../src/cooking_v063.js';
import {newGame,travelPortal,activeWorld,chapterRecipeAvailable,ensureDailyMarket,purchase,redeemFerrySupply,FERRY_SUPPLY_PACKS,advanceDay,enterField,ensureKitchen,cookwareUpgradeCost,buyCookwareUpgrade,serviceDayPlan,chooseCampaign,selectedCampaign,beginLiveResearch,dropLiveIngredient,performLiveAction,stepLiveResearch,finishLiveResearch,canMenu,kitchenHasMenuCoverage,createService,setServicePaused,tick,resumeBreak,closeService,save,load} from '../src/engine.js';
import {getFieldBiome} from '../src/field_biomes_v081.js';
import {specialEncounterOffer,makeSpecialEncounterPlan} from '../src/field_encounters_v011c.js';

const local=new Set(['cloud_rice','sky_moss','storm_egg','sour_bell']);
function cloud(seed=1551){
 const s=newGame(seed);s.chapterProgress.stars=3;s.coins=600;
 assert.equal(travelPortal(s,'cloud',{tool:'WOK'}),true);return s;
}

test('steam seal and vent individually affect real quality, with time-correct heat and explicit recap',()=>{
 const ids=['sky_moss','storm_egg'],drops=ids.map((id,index)=>({id,t:0,index}));
 const seal={type:'seal',t:1,with:ids},good={type:'vent',t:4,with:ids},early={type:'vent',t:2,with:ids};
 const cook=actions=>evaluateLiveCook(ids,'STEAM',drops,actions,10);
 const none=cook([]),one=cook([seal]),both=cook([seal,good]),dry=cook([seal,early]),late=cook([{...seal,t:3},{...good,t:6}]);
 for(const r of [none,one,both,dry,late])assert.equal(r.sellable,true);
 assert.deepEqual([none.quality,one.quality,both.quality,dry.quality,late.quality],[74,77,84,70,72]);
 assert.equal(both.style,'steam_even');assert.equal(dry.style,'steam_dry');
 assert.equal(liveCookAmount(drops[1],.5,[], 'STEAM'),liveCookAmount(drops[1],.5,[seal,good],'STEAM'));
 assert.ok(liveCookAmount(drops[1],8,[seal,good],'STEAM')<liveCookAmount(drops[1],8,[seal],'STEAM'));
 assert.deepEqual(reviewLiveCook(both).steps.filter(x=>x.type==='action').map(x=>x.detail.includes('+5')?5:x.detail.includes('+7')?7:null),[5,7]);
 assert.match(reviewLiveCook(dry).steps.find(x=>x.label==='排汽').detail,/-7/);
});

test('the live research buttons persist both steam scoring actions as a sellable recipe variant',()=>{
 const s=cloud();s.kitchen.steamerOwned=true;s.phase='research';
 assert.equal(beginLiveResearch(s,['sky_moss','storm_egg'],'STEAM'),true);
 assert.equal(dropLiveIngredient(s,'sky_moss'),true);assert.equal(dropLiveIngredient(s,'storm_egg'),true);
 for(let i=0;i<10;i++)stepLiveResearch(s,.1);
 assert.equal(performLiveAction(s,'seal'),true);
 for(let i=0;i<30;i++)stepLiveResearch(s,.1);
 assert.equal(performLiveAction(s,'vent'),true);
 for(let i=0;i<60;i++)stepLiveResearch(s,.1);
 const result=finishLiveResearch(s);
 assert.equal(result.recipeId,'steam_moss_egg');assert.equal(result.quality,84);
 assert.equal(s.recipes.steam_moss_egg,84);
 assert.ok(s.recipeVariants.steam_moss_egg.some(v=>v.quality===84&&v.style==='steam_even'));
});

test('six early local-only recipes cover both stations; each ferry pack unlocks cross-world cooking',()=>{
 const s=cloud();const newLocal=['rice_moss_stir','rice_egg_pot','moss_egg_stir','sour_moss_stir','sour_egg_pot','rice_moss_bell'];
 for(const id of newLocal){const r=RECIPES[id];assert.ok(r.ids.every(x=>local.has(x)));assert.equal(chapterRecipeAvailable(s,id),true);assert.equal(liveRecipeId(r.ids,r.station),id)}
 assert.deepEqual(new Set(newLocal.map(id=>RECIPES[id].station)),new Set(['WOK','POT']));
 for(const [packId,ids] of Object.entries({homestead:['cloud_rice_chicken','sky_egg_chicken'],woodland:['mushroom_cloud_stir','garlic_moss_pot'],hearthfire:['potato_egg_stir','chili_bell_pot']})){
  assert.ok(Object.keys(FERRY_SUPPLY_PACKS[packId].items).every(id=>!local.has(id)));
  for(const id of ids)assert.ok(RECIPES[id].ids.some(x=>Object.hasOwn(FERRY_SUPPLY_PACKS[packId].items,x)));
 }
 assert.equal(chapterRecipeAvailable(s,'chicken_stew'),false);
});

test('Cloud market carries local offers only and preserves an existing same-day legacy quote',()=>{
 const s=cloud();assert.deepEqual(new Set(Object.keys(ensureDailyMarket(s).goods)),new Set(CLOUD_MARKET_STAPLES));
 const old=cloud(234);old.market={dayKey:'1-1',schema:5,goods:{cloud_rice:{stock:6,initialStock:8,price:5},sky_moss:{stock:7,initialStock:8,price:4},chicken:{stock:3,initialStock:8,price:7},onion:{stock:5,initialStock:8,price:6}}};
 assert.equal(ensureDailyMarket(old),old.market);assert.equal(purchase(old,'chicken',1),true);assert.equal(old.market.goods.chicken.stock,2);
 old.phase='upgrade';advanceDay(old);assert.deepEqual(new Set(Object.keys(ensureDailyMarket(old).goods)),new Set(CLOUD_MARKET_STAPLES));
 assert.equal(purchase(old,'chicken',1),false);
});

test('three ferry choices spend one voucher per local day, preserve other world and survive save/load',()=>{
 const previous=globalThis.localStorage,values=new Map();globalThis.localStorage={setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k)};
 try{
  const s=cloud();s.ferryCredits=3;
  for(const [index,id] of Object.keys(FERRY_SUPPLY_PACKS).entries()){
   const initial={...s.inventory};assert.equal(redeemFerrySupply(s,id),true);
   for(const [ing,n] of Object.entries(FERRY_SUPPLY_PACKS[id].items))assert.equal(s.inventory[ing],(initial[ing]||0)+n);
   assert.equal(redeemFerrySupply(s,id),false);
   assert.equal(s.ferryCredits,2-index);
   if(index<2){s.phase='upgrade';assert.equal(advanceDay(s),true)}
  }
  assert.equal(s.ledger.filter(x=>x.type==='ferry_supply').length,3);
  const cloudStock={...s.inventory},hearthStock={...s.worlds.hearth.inventory};s.phase='upgrade';assert.equal(travelPortal(s,'hearth'),true);
  assert.deepEqual(s.inventory,hearthStock);assert.equal(travelPortal(s,'cloud'),true);assert.deepEqual(s.inventory,cloudStock);
  save(s);const restored=load();assert.equal(restored.ferryCredits,0);assert.equal(redeemFerrySupply(restored),false);
 }finally{globalThis.localStorage=previous}
});

test('Cloud field plans, biomes and encounters supply no old materials or old enemies',()=>{
 for(const seed of [1,2,3,50,451,2026])for(const route of ['cloud_safe','cloud_risk']){
  const s=cloud(seed);s.phase='field';assert.equal(enterField(s,route),true);
  assert.ok(s.field.sequence.every(x=>local.has(x.id)));
  assert.ok(s.field.nodes.filter(x=>x.id).every(x=>local.has(x.id)||x.id==='gale_core'));
  assert.equal(makeSpecialEncounterPlan(s,route).region,'cloud');
 }
 for(const zone of ['cloud_dock','cloud_pass','cloud_garden','cloud_roost','cloud_gust']){
  const biome=getFieldBiome(zone,'cloud_safe');assert.ok(biome.resources.every(([id])=>local.has(id)));assert.ok(biome.enemyMix.every(id=>id==='gust_moth'));
 }
 for(const kind of ['merchant','traveler','ecology']){
  const offer=specialEncounterOffer(kind,'cloud');assert.ok(Object.keys({...offer.cost,...offer.gain}).every(id=>local.has(id)));
 }
});

test('Cloud steamer upgrade is local; inherited Hearth training discounts WOK and POT',()=>{
 const s=newGame(99);s.chapterProgress.stars=3;ensureKitchen(s).mastery.WOK=2;ensureKitchen(s).mastery.POT=2;s.coins=300;
 assert.equal(travelPortal(s,'cloud',{tool:'WOK'}),true);s.phase='upgrade';s.coins=400;s.kitchen.steamerOwned=true;
 assert.equal(cookwareUpgradeCost(s,'STEAM'),80);assert.equal(cookwareUpgradeCost(s,'POT'),55);
 const before=s.coins;assert.equal(buyCookwareUpgrade(s,'STEAM'),true);assert.equal(s.coins,before-80);assert.equal(s.kitchen.mastery.STEAM,2);
 assert.equal(buyCookwareUpgrade(s,'POT'),true);assert.equal(s.kitchen.mastery.POT,2);
 assert.equal(travelPortal(s,'hearth'),true);assert.equal(s.kitchen.mastery.STEAM,1);
});

test('Cloud first star raises natural attendance; local marketing selects only local guests',()=>{
 const s=cloud(173);s.phase='prep';const before=serviceDayPlan(s);s.cloudProgress.stars=1;
 const after=serviceDayPlan(s);assert.ok(after.count>before.count);
 assert.equal(chooseCampaign(s,'guild'),false);
 assert.equal(chooseCampaign(s,'cloud_weaver'),true);assert.equal(selectedCampaign(s).id,'cloud_weaver');
 const promoted=serviceDayPlan(s);assert.equal(promoted.count,after.count+2);
 assert.ok(promoted.guests.slice(-2).every(g=>g==='cloud_weaver'));
});


test('first Cloud day can research three local recipes and sell real orders without a return trip',()=>{
 const s=cloud(1551);assert.equal(s.coins,120);
 for(const [id,n] of Object.entries({cloud_rice:4,sky_moss:4,storm_egg:3,sour_bell:2}))assert.equal(purchase(s,id,n),true);
 s.phase='research';const cooked=[];
 for(const [ids,vessel,seconds] of [
  [['cloud_rice','sky_moss'],'WOK',9],
  [['cloud_rice','storm_egg'],'POT',10],
  [['sky_moss','sour_bell'],'WOK',7]
 ]){
  assert.equal(beginLiveResearch(s,ids,vessel),true);
  for(const id of ids)assert.equal(dropLiveIngredient(s,id),true);
  for(let i=0;i<seconds*10;i++)stepLiveResearch(s,.1);
  const result=finishLiveResearch(s);assert.ok(result?.sellable,result?.reason);cooked.push(result.recipeId);
 }
 assert.deepEqual(cooked,['rice_moss_stir','rice_egg_pot','sour_moss_stir']);
 s.menu=cooked;s.phase='prep';assert.equal(canMenu(s),true);assert.equal(kitchenHasMenuCoverage(s),true);
 s.phase='service';assert.equal(createService(s),true);setServicePaused(s,false);
 for(let i=0;i<170&&!s.service.done;i++){if(s.service.breakAt)resumeBreak(s);tick(s,1)}
 const report=closeService(s);assert.ok(report.served>0);assert.ok(report.revenue>0);
 assert.ok(Object.keys(report.byDish).some(id=>cooked.includes(id)));
 assert.ok(s.ledger.some(x=>x.type==='sale'));assert.equal(activeWorld(s),'cloud');
});

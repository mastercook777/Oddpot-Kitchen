import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,requestThirdStar,thirdStarAvailable,createService,setServicePaused,tick,resumeBreak,closeService,advanceDay,portalAvailable,travelPortal,activeWorld,localStars,roomExpansionAvailable,chooseCampaign,enterField,completeFieldSegment,chooseFieldBranch,settleField,ensureDailyMarket,purchase,buySteamer,steamerAvailable,beginLiveResearch,dropLiveIngredient,performLiveAction,stepLiveResearch,finishLiveResearch,kitchenHasMenuCoverage,ensureKitchen,load,save} from '../src/engine.js';
import {ING,RECIPES,CLOUD_MARKET_STAPLES} from '../src/data.js';
import {evaluateLiveCook,liveRecipeId} from '../src/cooking_v063.js';
import {scoreThirdStar} from '../src/restaurant_third_star_v015.js';
import {startActionField} from '../src/field_v04.js';
import {MINI_BOSS_PATTERNS} from '../src/field_bosses_v011g.js';
const cookFor=(s,seconds)=>{for(let i=0;i<Math.ceil(seconds*10);i++)stepLiveResearch(s,.1)};

function feast(seed=1){
 const s=newGame(seed);s.chapterProgress.stars=2;s.cycle=4;s.day=1;s.phase='prep';s.dining.tableCount=4;
 s.coins=500;s.inventory=Object.fromEntries(Object.keys(s.inventory).map(id=>[id,100]));
 s.crew.helper.hired=true;s.crew.waiter.hired=true;s.crew.helper.onDuty=true;s.crew.waiter.onDuty=true;
 s.kitchen.mastery={WOK:2,POT:2,GRILL:1};s.kitchen.slots.forEach(slot=>slot.level=2);
 s.menu=['chicken_stew','veg_stir','chili_meat'];s.recipes.chili_meat=76;
 return s;
}
function shift(s){
 s.phase='service';assert.equal(createService(s),true);setServicePaused(s,false);
 for(let i=0;i<160&&!s.service.done;i++){if(s.service.breakAt)resumeBreak(s);tick(s,1)}
 assert.equal(s.service.done,true);return closeService(s);
}
test('third-star invitation becomes three frozen real orders and a single earned star',()=>{
 const s=feast(1);assert.equal(thirdStarAvailable(s),true);
 assert.equal(requestThirdStar(s),true);const report=shift(s);
 assert.deepEqual(report.thirdRating.verdicts.map(v=>v.segment),['family','gardener','critic']);
 assert.equal(report.thirdRating.recognized,2);assert.equal(report.thirdRating.passed,true);
 assert.equal(s.chapterProgress.stars,3);assert.equal(s.ledger.filter(x=>x.id==='chapter-hearth-star-3').length,1);
 assert.equal(closeService(s),false);assert.equal(portalAvailable(s),false);
 s.phase='upgrade';assert.equal(portalAvailable(s),true);
});
test('failed feast cannot grant a star and may be retried next day',()=>{
 const s=feast(7);s.kitchen.mastery={WOK:1,POT:1,GRILL:1};s.kitchen.slots.forEach(slot=>slot.level=1);
 assert.equal(requestThirdStar(s),true);const report=shift(s);
 assert.equal(report.thirdRating.passed,false);assert.equal(s.chapterProgress.stars,2);
 assert.equal(s.ledger.some(x=>x.id==='chapter-hearth-star-3'),false);
 assert.equal(thirdStarAvailable(s),false);s.phase='upgrade';advanceDay(s);
 assert.equal(thirdStarAvailable(s),true);assert.equal(requestThirdStar(s),true);
});
test('judge verdict ignores fake values unless the frozen order was truly served',()=>{
 const orders=[{id:'a',segment:'family',status:'served',sat:83},{id:'b',segment:'gardener',status:'left',sat:99},{id:'c',segment:'critic',status:'rejected',sat:99}];
 const score=scoreThirdStar(orders,['a','b','c'],999);
 assert.equal(score.recognized,1);assert.equal(score.passed,false);
});
test('portal carries exactly one hired employee and a tool type while keeping local economies',()=>{
 const s=feast();s.chapterProgress.stars=3;s.phase='forecast';
 s.crew.helper.xp=24;s.crew.helper.level=2;s.kitchen.mastery.WOK=2;
 const hearthCoins=s.coins,hearthStock=structuredClone(s.inventory),hearthLedger=structuredClone(s.ledger);
 assert.equal(travelPortal(s,'cloud',{tool:'WOK',crew:'helper'}),true);
 assert.equal(activeWorld(s),'cloud');assert.equal(s.coins,120);
 assert.equal(s.crew.helper.hired,true);assert.equal(s.crew.helper.level,2);
 assert.equal(s.crew.waiter.hired,false);assert.equal(s.kitchen.mastery.WOK,2);
 assert.equal(s.kitchen.mastery.POT,1);assert.equal(s.inventory.cloud_rice,4);
 assert.equal(s.cloudProgress.stars||0,0);
 assert.equal(localStars(s),0);
 s.phase='prep';assert.equal(chooseCampaign(s,'garden'),false);
 s.phase='upgrade';s.dining.tableCount=3;s.coins=500;
 assert.equal(roomExpansionAvailable(s),false,'hearth stars cannot unlock cloud fourth table');
 s.dining.tableCount=2;s.phase='forecast';
 assert.equal(ensureDailyMarket(s).goods && Object.keys(ensureDailyMarket(s).goods).every(id=>CLOUD_MARKET_STAPLES.includes(id)),true);
 const offered=Object.keys(s.market.goods)[0];assert.equal(purchase(s,offered,1),true);
 const cloudCoins=s.coins,cloudStock=structuredClone(s.inventory);
 s.crew.helper.xp=36;s.phase='upgrade';assert.equal(travelPortal(s,'hearth'),true);
 assert.equal(s.coins,hearthCoins);assert.deepEqual(s.inventory,hearthStock);assert.deepEqual(s.ledger,hearthLedger);
 assert.equal(s.crew.helper.xp,36,'the chosen employee keeps earned experience');
 assert.equal(travelPortal(s,'cloud'),true);assert.equal(s.coins,cloudCoins);assert.deepEqual(s.inventory,cloudStock);
 assert.equal(s.ledger.filter(x=>x.type==='purchase').length,1);
});
test('cloud exploration unlocks a purchased steamer, and a genuinely cooked steam dish can enter the menu',()=>{
 const s=feast();s.chapterProgress.stars=3;s.phase='forecast';travelPortal(s,'cloud',{tool:'POT'});
 assert.equal(steamerAvailable(s),false);s.phase='field';assert.equal(enterField(s,'cloud_safe'),true);
 assert.equal(s.field.region,'cloud');assert.equal(s.field.nodes[0].id,'cloud_rice');
 assert.equal(settleField(s),true);assert.equal(settleField(s),false);
 assert.equal(s.cloudProgress.explored,true);assert.equal(s.ledger.filter(x=>x.type==='exploration').length,1);
 s.phase='upgrade';assert.equal(steamerAvailable(s),true);assert.equal(buySteamer(s),true);assert.equal(buySteamer(s),false);
 assert.equal(s.ledger.filter(x=>x.id==='cloud-steamer').length,1);
 s.phase='research';assert.equal(beginLiveResearch(s,['cloud_rice','chicken'],'STEAM'),true);
 for(const id of ['cloud_rice','chicken'])assert.equal(dropLiveIngredient(s,id),true);
 assert.equal(performLiveAction(s,'seal'),true);cookFor(s,3);
 assert.equal(performLiveAction(s,'vent'),true);cookFor(s,5);
 const cooked=finishLiveResearch(s);assert.equal(cooked.recipeId,'steam_cloud_rice');assert.equal(cooked.sellable,true);
 assert.equal(cooked.style,'steam_even');assert.equal(s.recipes.steam_cloud_rice,cooked.quality);
 s.menu=['steam_cloud_rice'];assert.equal(kitchenHasMenuCoverage(s),true);
 ensureKitchen(s).steamerOwned=false;assert.equal(kitchenHasMenuCoverage(s),false);
 assert.equal(liveRecipeId(['cloud_rice','chicken'],'POT'),'cloud_rice_chicken');
 assert.equal(liveRecipeId(['cloud_rice','chicken'],'STEAM'),'steam_cloud_rice');
 assert.equal(ING.cloud_rice.acquisitionPolicy,'FIELD_ONLY');assert.equal(RECIPES.steam_cloud_rice.station,'POT');
});
test('saved active world restores portal, cloud purchases and steamer without mutating dormant hearth',()=>{
 const old=globalThis.localStorage,values=new Map();
 globalThis.localStorage={setItem:(key,value)=>values.set(key,value),getItem:key=>values.get(key)};
 try{
  const s=feast();s.chapterProgress.stars=3;s.phase='forecast';travelPortal(s,'cloud');
  s.cloudProgress.explored=true;s.phase='upgrade';buySteamer(s);save(s);
  const loaded=load();assert.equal(activeWorld(loaded),'cloud');assert.equal(loaded.kitchen.steamerOwned,true);
  assert.equal(travelPortal(loaded,'hearth'),true);assert.equal(loaded.kitchen.steamerOwned,false);
  assert.equal(loaded.coins,500);assert.equal(travelPortal(loaded,'cloud'),true);
  assert.equal(loaded.ledger.filter(x=>x.id==='cloud-steamer').length,1);
 }finally{globalThis.localStorage=old}
});
test('local steam orders sell through the real restaurant and earn only the Cloud Harbor objective',()=>{
 const s=feast(9);s.chapterProgress.stars=3;s.phase='forecast';travelPortal(s,'cloud',{tool:'POT'});
 s.cloudProgress.explored=true;s.phase='upgrade';buySteamer(s);
 s.phase='prep';s.menu=['steam_cloud_rice'];s.recipes.steam_cloud_rice=84;
 s.inventory.cloud_rice=60;s.inventory.chicken=60;
 const before=s.coins,report=shift(s);
 assert.ok(report.byDish.steam_cloud_rice?.count>=1);
 assert.equal(s.ledger.filter(x=>x.type==='sale').length,report.served);
 s.phase='upgrade';advanceDay(s);s.phase='prep';
 s.inventory.cloud_rice=60;s.inventory.chicken=60;
 shift(s);
 assert.ok(s.cloudProgress.servedLocal>=6);
 assert.equal(s.cloudProgress.stars,1);
 assert.equal(s.ledger.filter(x=>x.id==='chapter-cloud-first-service').length,1);
 assert.ok(s.coins>before);
 assert.equal(s.chapterProgress.stars,3,'hearth third star remains untouched');
});
test('steam timing visibly changes doneness and craft style',()=>{
 const ids=['cloud_rice','chicken'],drops=ids.map((id,index)=>({id,t:0,index}));
 const sealed=evaluateLiveCook(ids,'STEAM',drops,[{type:'seal',t:0,with:ids},{type:'vent',t:3,with:ids}],6);
 const unsealed=evaluateLiveCook(ids,'STEAM',drops,[],6);
 assert.equal(sealed.sellable,true);assert.equal(sealed.style,'steam_even');
 assert.equal(unsealed.sellable,false);assert.ok(sealed.quality>unsealed.quality);
});
test('high-risk third segment has a distinct storm boss, whose rare core is never sold by the market',()=>{
 const s=feast(26);s.chapterProgress.stars=3;s.phase='forecast';travelPortal(s,'cloud');
 s.phase='field';assert.equal(enterField(s,'cloud_risk'),true);
 for(let i=1;i<=2;i++){
  s.field.nodes.find(x=>x.key==='target').claimed=true;
  assert.equal(completeFieldSegment(s),true);
  assert.equal(chooseFieldBranch(s,s.field.choices[0].choiceId),true);
 }
 assert.equal(s.field.segmentIndex,3);
 assert.equal(startActionField(s),true);
 const boss=s.field.enemies.find(e=>e.kind==='boss_gust');assert.ok(boss);
 assert.deepEqual(MINI_BOSS_PATTERNS.boss_gust.map(x=>x.kind),['fan','charge','ring']);
 assert.equal(ING.gale_core.bossId,'gust_king');assert.equal(purchase(s,'gale_core'),false);
 assert.equal(liveRecipeId(['gale_core','sky_moss','storm_egg'],'STEAM'),'gale_core_steam');
 s.field.bag={gale_core:2};s.field.bossDefeated='gust_king';
 assert.equal(settleField(s),true);assert.equal(s.inventory.gale_core,2);assert.equal(s.bossCleared.gust_king,true);
 assert.equal(settleField(s),false);
});

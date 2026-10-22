import test from 'node:test';
import assert from 'node:assert/strict';
import {ING,RECIPES,CLOUD_MARKET_STAPLES,MARKET_ROTATION_STAPLES} from '../src/data.js';
import {liveRecipeId} from '../src/cooking_v063.js';
import {
 newGame,activeWorld,travelPortal,redeemFerrySupply,FERRY_SUPPLY_PACKS,
 chapterRecipeAvailable,recipeAtlasRegion,recipeResearchAccess,beginLiveResearch,
 dropLiveIngredient,finishLiveResearch,canMenu,selectMenuRecipe,createService,
 setServicePaused,tick,resumeBreak,closeService,save,load
} from '../src/engine.js';

function cloud(seed=15151){
 const s=newGame(seed);s.chapterProgress.stars=3;s.phase='forecast';
 assert.equal(travelPortal(s,'cloud'),true);return s;
}
const fusionIds=['cloud_chili_rice','cloud_garlic_egg','cloud_mushroom_moss','cloud_beef_sour','cloud_potato_rice'];
const original=new Set(MARKET_ROTATION_STAPLES);
const cloudNative=new Set(['cloud_rice','sky_moss','storm_egg','sour_bell','gale_core']);

test('cargo: 8 imports from Hearth, not readily forageable Cloud-native materials',()=>{
 assert.deepEqual(Object.keys(FERRY_SUPPLY_PACKS),['spice','forest','hunt']);
 for(const pack of Object.values(FERRY_SUPPLY_PACKS)){
  assert.equal(Object.values(pack.items).reduce((a,b)=>a+b,0),8);
  for(const id of Object.keys(pack.items)){
   assert.equal(original.has(id),true,ING[id]?.name);
   assert.equal(cloudNative.has(id),false);
   assert.equal(CLOUD_MARKET_STAPLES.includes(id),['chicken','onion'].includes(id));
  }
 }
});

test('five hand-curated dishes require BOTH worlds and register real live-cooking signatures',()=>{
 const s=cloud();assert.equal(activeWorld(s),'cloud');
 for(const id of fusionIds){
  const r=RECIPES[id];assert.ok(r,id);
  assert.equal(recipeAtlasRegion(id),'cloud');
  assert.equal(r.ids.some(x=>cloudNative.has(x)),true);
  assert.equal(r.ids.some(x=>original.has(x)),true);
  assert.equal(chapterRecipeAvailable(s,id),true);
  assert.equal(liveRecipeId(r.ids,r.method==='steam'?'STEAM':r.station),id);
 }
 for(const id of ['chicken_stew','chili_meat','mushroom_stir'])assert.equal(chapterRecipeAvailable(s,id),false);
 s.phase='research';s.inventory.chili=4;s.inventory.cloud_rice=4;
 assert.equal(beginLiveResearch(s,['chicken','chili'],'WOK'),false,'plain Hearth recipes remain inaccessible in Cloud');
});

test('import -> research -> menu -> genuine Cloud order settlement, using the existing ledger',()=>{
 const s=cloud();s.ferryCredits=1;
 const homeSnapshot=structuredClone(s.worlds.hearth.inventory);
 assert.equal(redeemFerrySupply(s,'spice'),true);
 assert.deepEqual(s.worlds.hearth.inventory,homeSnapshot,'supplier voucher does not silently empty Hearth pantry');
 assert.equal(s.inventory.chili,4);assert.equal(s.inventory.cloud_rice,4);
 s.phase='research';assert.equal(recipeResearchAccess(s,'cloud_chili_rice').ready,true);
 const oldRice=s.inventory.cloud_rice;
 assert.equal(beginLiveResearch(s,['chili','cloud_rice'],'WOK'),true);
 assert.equal(dropLiveIngredient(s,'chili'),true);assert.equal(dropLiveIngredient(s,'cloud_rice'),true);
 s.cook.elapsed=7;
 const result=finishLiveResearch(s);assert.equal(result.sellable,true,JSON.stringify(result));
 assert.equal(result.recipeId,'cloud_chili_rice');
 assert.equal(s.inventory.chili,3);assert.equal(s.inventory.cloud_rice,oldRice-1);
 assert.ok(s.recipes.cloud_chili_rice>0);
 s.recipes.cloud_rice_chicken=78;s.phase='menu';
 s.menu=['cloud_chili_rice','cloud_rice_chicken','cloud_chili_rice'];
 assert.equal(canMenu(s),true);assert.equal(selectMenuRecipe(s,0,'chicken_stew'),false);
 s.phase='service';s.menu=['cloud_chili_rice','cloud_chili_rice','cloud_chili_rice'];
 s.inventory.chili=60;s.inventory.cloud_rice=60;
 assert.equal(createService(s),true);setServicePaused(s,false);
 for(let i=0;i<210&&!s.service.done;i++){if(s.service.breakAt)resumeBreak(s);tick(s,1)}
 assert.equal(s.service.done,true);
 const report=closeService(s);assert.ok(report?.served>0,JSON.stringify(report));
 assert.ok(s.ledger.some(x=>x.type==='sale'),'new menu must use the original real order sale ledger');
 assert.equal(s.ledger.filter(x=>x.type==='ferry_supply').length,1);
});

test('legacy 3-item Cloud freights cannot duplicate new Hearth imports after reload',()=>{
 const s=cloud();s.ferryCredits=2;
 s.ledger.push({id:'ferry-supply-1-1',type:'ferry_supply',items:{cloud_rice:2,sky_moss:1},amount:0});
 assert.equal(redeemFerrySupply(s,'spice'),false);
 const oldStorage=globalThis.localStorage,store=new Map();
 globalThis.localStorage={setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)};
 try{save(s);const loaded=load();assert.equal(redeemFerrySupply(loaded,'spice'),false);}
 finally{globalThis.localStorage=oldStorage}
});

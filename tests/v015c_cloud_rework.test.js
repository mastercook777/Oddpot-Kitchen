import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,travelPortal,crewRoleName,chapterRecipeAvailable,selectMenuRecipe,canMenu,kitchenHasMenuCoverage,configureKitchenSlot,feedCrew,availableBento,prepareBento,setPremiumMenu,createService,setServicePaused,tick,resumeBreak,closeService,redeemFerrySupply,advanceDay,load,save} from '../src/engine.js';

function cloud(){
 const s=newGame(1551);s.chapterProgress.stars=3;s.crew.helper={hired:true,onDuty:true,station:0,level:2,xp:32};s.crew.waiter={hired:true,onDuty:true,level:2,xp:26};
 assert.equal(travelPortal(s,'cloud',{tool:'WOK',crew:'waiter'}),true);return s;
}
function localMenu(s){s.recipes.cloud_rice_chicken=82;s.recipes.sour_rice=77;s.recipes.steam_cloud_rice=80;s.menu=['cloud_rice_chicken','sour_rice','cloud_rice_chicken'];}

test('Cloud hires local characters; a migrated portal roster cannot clone old staff',()=>{
 const s=cloud();assert.equal(crewRoleName(s,'helper'),'阿岚');assert.equal(crewRoleName(s,'waiter'),'小羽');
 assert.equal(s.crew.helper.level,1);assert.equal(s.crew.waiter.hired,false);assert.deepEqual(s.menu,['','','']);
 s.crew.helper.xp=17;s.phase='upgrade';assert.equal(travelPortal(s,'hearth'),true);
 assert.equal(s.crew.helper.xp,32);assert.equal(s.crew.waiter.xp,26);
 // A v0.15 save had a copied waiter and a normal old menu on the Cloud side.
 s.worlds.cloud.crew.waiter={hired:true,onDuty:true,level:2,xp:26};
 s.worlds.cloud.cloudProgress.localCrew=false;
 s.worlds.cloud.menu=['chicken_stew','veg_stir','mushroom_stir'];
 assert.equal(travelPortal(s,'cloud'),true);
 assert.equal(s.crew.waiter.hired,false);assert.equal(s.crew.helper.xp,17);
 assert.deepEqual(s.menu,['','','']);
});

test('old recipes are reference only; two physical slots cannot promise three cookware types',()=>{
 const s=cloud();localMenu(s);s.phase='menu';
 assert.equal(chapterRecipeAvailable(s,'chicken_stew'),false);
 assert.equal(selectMenuRecipe(s,0,'chicken_stew'),false);
 assert.equal(canMenu(s),true);assert.equal(kitchenHasMenuCoverage(s),true);
 assert.equal(selectMenuRecipe(s,2,'steam_cloud_rice'),false,'unowned cookware cannot be listed');
 s.kitchen.steamerOwned=true;
 assert.equal(selectMenuRecipe(s,2,'steam_cloud_rice'),false,'WOK + POT + STEAM exceed two slots');
 s.menu=['sour_rice','steam_cloud_rice','sour_rice'];
 assert.equal(canMenu(s),true);assert.equal(kitchenHasMenuCoverage(s),false,'an owned steamer still needs a slot');
 s.phase='prep';assert.equal(configureKitchenSlot(s,1,'STEAM'),true);
 assert.equal(kitchenHasMenuCoverage(s),true);
 s.phase='service';assert.equal(createService(s),true);
 assert.ok(s.service.kitchenSnapshot.some(x=>x.type==='STEAM'));
});

test('old recipe cannot be smuggled into Cloud staff meals, travel food or hidden sales',()=>{
 const s=cloud();s.inventory.chicken=10;s.inventory.onion=10;
 assert.equal(availableBento(s).some(x=>x.recipeId==='chicken_stew'),false);
 assert.equal(prepareBento(s,'chicken_stew'),false);
 s.phase='prep';assert.equal(feedCrew(s,'helper','chicken_stew'),false);
 localMenu(s);s.phase='menu';s.recipes.gale_core_steam=86;
 s.inventory.gale_core=2;s.inventory.sky_moss=10;s.inventory.storm_egg=10;
 s.kitchen.steamerOwned=true;
 assert.equal(setPremiumMenu(s,'gale_core_steam'),false,'hidden dish cannot add a third cookware type');
 s.menu=['sour_rice','sour_rice','sour_rice'];
 assert.equal(setPremiumMenu(s,'gale_core_steam'),true);
 s.phase='prep';assert.equal(kitchenHasMenuCoverage(s),false,'hidden dish also needs an installed steamer');
});

test('one actual Hearth sale yields one ferry commission, redeemable once per Cloud day',()=>{
 const s=cloud();s.phase='upgrade';travelPortal(s,'hearth');
 s.inventory=Object.fromEntries(Object.keys(s.inventory).map(id=>[id,100]));
 s.phase='service';assert.equal(createService(s),true);setServicePaused(s,false);
 for(let i=0;i<160&&!s.service.done;i++){if(s.service.breakAt)resumeBreak(s);tick(s,1)}
 const report=closeService(s);assert.ok(report.served>0);
 assert.equal(s.ferryCredits,1);assert.equal(closeService(s),false);
 assert.equal(s.ledger.filter(x=>x.type==='ferry_commission').length,1);
 s.phase='upgrade';travelPortal(s,'cloud');assert.equal(s.ferryCredits,1);s.phase='forecast';
 const chicken=s.inventory.chicken;
 assert.equal(redeemFerrySupply(s),true);assert.equal(s.inventory.chicken,chicken+3);
 assert.equal(s.ferryCredits,0);s.ferryCredits=1;assert.equal(redeemFerrySupply(s),false,'another voucher cannot bypass the daily cap');
 assert.equal(s.ledger.filter(x=>x.type==='ferry_supply').length,1);
 s.phase='upgrade';assert.equal(advanceDay(s),true);assert.equal(redeemFerrySupply(s),true,'next local day can take a new supply');
 s.phase='upgrade';travelPortal(s,'hearth');assert.equal(s.ferryCredits,0);
});

test('portal travel and a night with no sales yield no commission',()=>{
 const s=cloud();s.phase='upgrade';travelPortal(s,'hearth');
 assert.equal(s.ferryCredits||0,0);
 s.phase='service';assert.equal(createService(s),true);
 s.service.orders.forEach(o=>o.status='left');s.service.done=true;
 assert.equal(closeService(s).served,0);assert.equal(s.ferryCredits||0,0);
 assert.equal(s.ledger.some(x=>x.type==='ferry_commission'),false);
});

test('old Cloud prep save migrates to research before menu inspection',()=>{
 const previous=globalThis.localStorage,values=new Map();
 globalThis.localStorage={setItem:(key,v)=>values.set(key,v),getItem:key=>values.get(key)};
 try{
  const s=cloud();s.cloudProgress.localCrew=false;s.phase='prep';s.menu=['chicken_stew','veg_stir','mushroom_stir'];
  s.crew.waiter={hired:true,onDuty:true,xp:26,level:2};save(s);
  const migrated=load();assert.equal(migrated.phase,'research');assert.equal(migrated.crew.waiter.hired,false);
  assert.deepEqual(migrated.menu,['','','']);
 }finally{globalThis.localStorage=previous}
});

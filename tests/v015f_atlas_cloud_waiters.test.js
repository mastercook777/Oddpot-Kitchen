import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame,travelPortal,activeWorld,chapterRecipeAvailable,recipeResearchAccess,
 recipeAtlasRegion,beginLiveResearch,hireCrew,ensureCrew,crewEffects,crewRoleName,
 stepWalkableShift,save,load} from '../src/engine.js';
import {dinerWaiterRoute} from '../src/restaurant_scene_v075.js';
import {payroll,settleCrewExperience} from '../src/restaurant_management_v012c.js';

function cloud(){
 const s=newGame(1515);
 s.chapterProgress.stars=3;s.phase='forecast';
 assert.equal(travelPortal(s,'cloud'),true);
 return s;
}
test('recipe atlas identifies region and respects chapter recipes and inventory in real research stage',()=>{
 const hearth=newGame();hearth.phase='research';
 assert.equal(recipeAtlasRegion('chicken_stew'),'hearth');
 assert.equal(recipeAtlasRegion('steam_moss_egg'),'cloud');
 assert.equal(recipeResearchAccess(hearth,'chicken_stew').ready,true);
 assert.equal(recipeResearchAccess(hearth,'steam_moss_egg').ready,false);
 assert.match(recipeResearchAccess(hearth,'steam_moss_egg').reason,/仅云港/);
 const choice=recipeResearchAccess(hearth,'chicken_stew');
 assert.equal(beginLiveResearch(hearth,['chicken','mushroom'],choice.type),true);
 assert.equal(hearth.cook.context,'research');assert.deepEqual(hearth.cook.ids,['chicken','mushroom']);
 assert.equal(recipeResearchAccess(hearth,'chicken_stew').ready,false,'cannot start a second live cook');
});
test('cloud shortcuts identify missing material, exclusive cookware, phase and true reserve',()=>{
 const s=cloud();s.phase='research';
 assert.equal(chapterRecipeAvailable(s,'chicken_stew'),false);
 assert.match(recipeResearchAccess(s,'steam_moss_egg').reason,/尚未购入云汽蒸笼/);
 s.kitchen.steamerOwned=true;
 assert.equal(recipeResearchAccess(s,'steam_moss_egg').ready,true);
 s.inventory.storm_egg=0;
 assert.match(recipeResearchAccess(s,'steam_moss_egg').reason,/缺少.*雷羽蛋/);
 s.inventory.storm_egg=2;s.phase='prep';
 assert.match(recipeResearchAccess(s,'steam_moss_egg').reason,/研发阶段/);
 s.phase='research';assert.equal(recipeResearchAccess(s,'steam_moss_egg').ready,true);
 assert.equal(beginLiveResearch(s,['sky_moss','storm_egg'],'STEAM'),true);
});
test('cloud unlock allows second waiter only after local first star and unique 55-coin hire',()=>{
 const s=cloud();s.phase='upgrade';s.coins=200;
 assert.equal(hireCrew(s,'waiter2'),false);
 s.cloudProgress.stars=1;
 assert.equal(hireCrew(s,'waiter2'),true);
 assert.equal(s.coins,145);
 assert.equal(hireCrew(s,'waiter2'),false);
 assert.equal(s.ledger.filter(x=>x.id==='crew-hire-waiter2').length,1);
 assert.equal(crewRoleName(s,'waiter2'),'小澜');
 assert.equal(ensureCrew(s).waiter2.hired,true);
 const eff=crewEffects(s);
 assert.equal(eff.waiter2.hired,true);assert.equal(eff.waiter2.salary,11);assert.equal(eff.waiter2.patience,2);
 assert.equal(hireCrew(newGame(),'waiter2'),false);
});
test('waiter2 is independently paid and gains only orders it actually served',()=>{
 const s=cloud();s.phase='upgrade';s.cloudProgress.stars=1;
 s.coins=140;hireCrew(s,'waiter');hireCrew(s,'waiter2');
 const snapshot=crewEffects(s);
 const shift={crew:snapshot,orders:[{id:'o1',status:'served'},{id:'o2',status:'served'},{id:'o3',status:'left'}],
 events:[{type:'waiter_pickup',role:'waiter',order:'o1'},{type:'waiter_pickup',role:'waiter2',order:'o2'},
 {type:'waiter_pickup',role:'waiter2',order:'o3'}]};
 const grew=settleCrewExperience(s,shift);
 assert.equal(grew.earned.waiter,1);assert.equal(grew.earned.waiter2,1);
 assert.equal(s.crew.waiter.xp,1);assert.equal(s.crew.waiter2.xp,1);
 const ledger=[];const result=payroll(s,shift,(state,id,type,items,cost)=>{ledger.push({id,type,cost});state.coins+=cost;return true});
 assert.equal(result.roster.waiter2,11);assert.equal(result.roster.helper,10);assert.equal(result.wage,30,'existing Cloud helper salary remains payable alongside both runners');
 assert.equal(ledger.length,1);
});
test('one real plate is never claimed twice: two couriers parallelize distinct pickups',()=>{
 const s=newGame();const hero={x:.5,y:.5,carryOrderId:null,recovery:0,energy:0,maxEnergy:6};
 s.phase='service';
 s.service={walkable:true,hero,time:2,orders:[
  {id:'a',status:'pickup',pickupAt:0,tableId:0,recipeId:'chicken_stew'},
  {id:'b',status:'pickup',pickupAt:0,tableId:1,recipeId:'chicken_stew'}],
  crew:{waiter:{hired:true,level:1},waiter2:{hired:true,level:1}},
  events:[],waiterBusyUntil:0};
 stepWalkableShift(s);
 assert.deepEqual(s.service.orders.map(o=>[o.status,o.deliveryRole]),[['delivering','waiter'],['delivering','waiter2']]);
 assert.equal(s.service.events.filter(e=>e.type==='waiter_pickup').length,2);
 stepWalkableShift(s);
 assert.equal(s.service.events.filter(e=>e.type==='waiter_pickup').length,2,'same tick cannot duplicate claim');
 const a=dinerWaiterRoute(s,3,'waiter'),b=dinerWaiterRoute(s,3,'waiter2');
 assert.equal(a.table,0);assert.equal(b.table,1);assert.equal(a.plate,true);assert.equal(b.plate,true);
 s.service.time=5;stepWalkableShift(s);
 assert.deepEqual(s.service.orders.map(o=>o.status),['flying','flying']);
 assert.deepEqual(s.service.events.filter(e=>e.type==='waiter_return').map(e=>e.role),['waiter','waiter2']);
 assert.equal(s.service.waiterBusyUntilByRole.waiter,7);
 assert.equal(s.service.waiterBusyUntilByRole.waiter2,7);
});
test('single-waiter, player-carried food and previous saves preserve historical delivery',()=>{
 const s=newGame();s.phase='service';s.service={walkable:true,time:2,hero:{x:.5,y:.5,carryOrderId:'a',energy:0,maxEnergy:6,recovery:0},
  orders:[{id:'a',status:'carried',pickupAt:0,tableId:0},{id:'b',status:'pickup',pickupAt:0,tableId:1}],crew:{waiter:{hired:true,level:1}},events:[],waiterBusyUntil:0};
 stepWalkableShift(s);
 assert.equal(s.service.orders[0].status,'carried');
 assert.equal(s.service.orders[1].deliveryRole,'waiter');
 assert.equal(dinerWaiterRoute(s,3,'waiter').table,1);
 assert.equal(dinerWaiterRoute(s,3,'waiter2').plate,false);
});
test('chapter travel and save recovery do not copy Cloud second waiter into Hearth',()=>{
 const s=cloud();s.phase='upgrade';s.cloudProgress.stars=1;s.coins=200;
 assert.equal(hireCrew(s,'waiter2'),true);
 assert.equal(travelPortal(s,'hearth'),true);assert.equal(activeWorld(s),'hearth');
 assert.equal(crewEffects(s).waiter2.hired,false);
 assert.equal(travelPortal(s,'cloud'),true);
 assert.equal(crewEffects(s).waiter2.hired,true);
 const original=globalThis.localStorage,store=new Map();
 globalThis.localStorage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
 try{save(s);const restored=load();assert.equal(restored.crew.waiter2.hired,true);}
 finally{globalThis.localStorage=original;}
});
test('atlas and Cloud worker/glass scene are wired into online and offline entry',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const app=read('src/app.js'),scene=read('src/scenes_v04.js'),pix=read('src/pixels_v041.js'),html=read('standalone.html');
 assert.match(app,/data-book-region/);assert.match(app,/recipeResearchAccess\(game,id\)/);
 assert.match(app,/beginLiveResearch\(game,r.ids,access.type\)/);
 assert.match(app,/row\('waiter2'\)/);
 assert.match(scene,/waiterDeliveryPose\(s,t,role\)/);
 assert.doesNotMatch(scene,/for\(const xx of \[\.09,\.91\]\)/);
 assert.match(scene,/Low, horizontal charcoal rack/);
 assert.match(pix,/cloud_waiter2:/);
 assert.match(html,/function stepWalkableShift/);
 assert.match(html,/function recipeResearchAccess/);
 assert.match(html,/cloud_waiter2/);
});

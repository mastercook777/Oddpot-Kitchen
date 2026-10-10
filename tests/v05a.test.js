import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, configureKitchenSlot, kitchenPreview, kitchenHasMenuCoverage, kitchenRefitCost, kitchenUpgradeCost, buyKitchenUpgrade, stationDuration, createService, tick, setServicePaused, ensureKitchen, closeService, resumeBreak} from '../src/engine.js';
import {RECIPES} from '../src/data.js';

function cookingGame(dual=false){
 const s=newGame(20261010);s.phase='prep';s.menu=['mushroom_stir','veg_stir','mushroom_stir'];
 for(const id of Object.keys(s.inventory))s.inventory[id]=50;
 if(dual)assert.equal(configureKitchenSlot(s,1,'WOK'),true);
 s.phase='service';assert.equal(createService(s),true);
 s.service.orders[1].arrival=0;
 assert.equal(setServicePaused(s,false),true);
 tick(s,1);return s;
}

test('v0.5A first daily refit is free, second costs 12, persisted no double refund',()=>{
 const s=newGame();s.phase='prep';assert.equal(kitchenRefitCost(s),0);
 assert.equal(configureKitchenSlot(s,1,'WOK'),true);assert.equal(ensureKitchen(s).slots[1].type,'WOK');
 assert.equal(s.coins,120);assert.equal(kitchenRefitCost(s),12);
 assert.equal(configureKitchenSlot(s,0,'POT'),true);assert.equal(s.coins,108);
 assert.equal(s.ledger.filter(x=>x.type==='kitchen_refit').length,1);
 assert.equal(configureKitchenSlot(s,0,'POT'),false);assert.equal(s.coins,108);
 s.phase='forecast';s.day=2;s.phase='prep';assert.equal(kitchenRefitCost(s),0);
});

test('v0.5A missing recipe station is an explicit opening blocker',()=>{
 const s=newGame();s.phase='prep';
 assert.equal(configureKitchenSlot(s,1,'WOK'),true);
 assert.equal(kitchenHasMenuCoverage(s),false);
 assert.deepEqual(kitchenPreview(s).risk,['POT']);
 s.phase='service';assert.equal(createService(s),false);
 assert.equal(s.service,null);
});

test('v0.5A two wok positions truly cook two orders in parallel',()=>{
 const base=cookingGame(false),dual=cookingGame(true);
 const working=s=>Object.values(s.service.stations).filter(Boolean);
 assert.equal(working(base).length,1);
 assert.equal(working(dual).length,2);
 assert.equal(dual.service.stations.WOK.orderId!==dual.service.stations.POT.orderId,true);
 assert.deepEqual(dual.service.kitchenSnapshot.map(x=>x.type),['WOK','WOK']);
});

test('v0.5A upgrades are permanent by physical station and actually reduce cooking seconds',()=>{
 const s=newGame();s.phase='upgrade';s.coins=200;
 assert.equal(kitchenUpgradeCost(s,0),60);assert.equal(kitchenUpgradeCost(s,1),75);
 const base=stationDuration(s,'WOK',RECIPES.veg_stir,null);
 assert.equal(buyKitchenUpgrade(s,0),true);
 assert.equal(buyKitchenUpgrade(s,1),true);
 assert.equal(s.coins,65);
 assert.equal(stationDuration(s,'WOK',RECIPES.veg_stir,null),base-2);
 assert.equal(stationDuration(s,'POT',RECIPES.chicken_stew,null),RECIPES.chicken_stew.time-2);
 assert.equal(buyKitchenUpgrade(s,0),false);
 assert.equal(s.ledger.filter(x=>x.type==='upgrade').length,2);
 s.phase='prep';assert.equal(configureKitchenSlot(s,1,'WOK'),true);
 assert.equal(ensureKitchen(s).slots[1].level,2);
});

test('v0.5A end of service includes exact station configuration and savings for report',()=>{
 const s=cookingGame(true);
 for(let i=0;i<110;i++){
  if(s.service.breakAt)resumeBreak(s);
  if(s.service.done)break;
  tick(s,1);
 }
 assert.equal(s.service.done,true);
 assert.equal(closeService(s)!==false,true);
 assert.equal(s.report.kitchen.slots[0].type,'WOK');
 assert.equal(s.report.kitchen.slots[1].type,'WOK');
 assert.equal(s.report.kitchen.stats.WOK.count+s.report.kitchen.stats.POT.count,s.report.served);
 assert.equal(s.ledger.filter(x=>x.type==='sale').length,s.report.served);
});


test('v0.5A returning to a valid kitchen cannot softlock players with no coins',()=>{
 const s=newGame();s.phase='prep';s.coins=0;
 assert.equal(configureKitchenSlot(s,1,'WOK'),true);
 assert.equal(kitchenHasMenuCoverage(s),false);
 assert.equal(configureKitchenSlot(s,1,'POT'),true);
 assert.equal(kitchenHasMenuCoverage(s),true);
 assert.equal(s.coins,0);
});

test('v0.5A old saves load kitchen upgrades and active-service telemetry safely',()=>{
 const s=newGame();delete s.kitchen;s.upgrade=true;
 let k=ensureKitchen(s);assert.deepEqual(k.slots.map(x=>x.level),[2,1]);
 assert.equal(stationDuration(s,'WOK',RECIPES.veg_stir,null),RECIPES.veg_stir.time-2);
});
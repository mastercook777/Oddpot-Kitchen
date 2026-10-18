import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame,ensureKitchen,ensureCrew,configureKitchenSlot,COOKWARE_UPGRADE_COST,
 cookwareUpgradeCost,buyCookwareUpgrade,buyKitchenUpgrade,kitchenUpgradeCost,
 fieldWeaponChoices,buyThirdKitchenBundle,assignCrew,createService,
 reassignIdleCooks,setCrewDuty,crewEffects} from '../src/engine.js';

const setup=()=>{
 const s=newGame(130013);s.phase='upgrade';s.coins=900;s.chapterProgress.stars=1;s.dining.tableCount=4;
 s.crew.helper.hired=true;s.crew.helper.onDuty=true;s.crew.helper.station=0;
 s.crew.waiter.hired=true;s.crew.waiter.onDuty=true;
 assert.equal(buyThirdKitchenBundle(s),true);return s;
};
test('v0.13-B pay only once for WOK type; every WOK shared level incl centre and explore weapon',()=>{
 const s=setup(),k=ensureKitchen(s);
 assert.equal(k.slots.length,3);assert.equal(k.mastery.WOK,1);
 assert.equal(cookwareUpgradeCost(s,'WOK'),60);
 const before=s.coins;
 assert.equal(buyCookwareUpgrade(s,'WOK'),true);
 assert.equal(s.coins,before-60);assert.equal(buyCookwareUpgrade(s,'WOK'),false);
 assert.equal(k.mastery.WOK,2);assert.equal(k.slots[0].level,2);assert.equal(k.slots[2].level,2);
 assert.equal(kitchenUpgradeCost(s,2),null,'same type cannot charge twice by slot');
 assert.equal(s.ledger.filter(x=>x.id==='cookware-upgrade-WOK').length,1);
 assert.equal(fieldWeaponChoices(s).find(x=>x.type==='WOK').level,2);
 s.phase='prep';assert.equal(configureKitchenSlot(s,2,'POT'),true);
 assert.equal(k.slots[2].level,1);
 assert.equal(configureKitchenSlot(s,2,'WOK'),true);assert.equal(k.slots[2].level,2);
});
test('v0.13-B POT upgrade applies to any physical slot and survives removal',()=>{
 const s=setup();assert.equal(cookwareUpgradeCost(s,'POT'),75);
 assert.equal(buyKitchenUpgrade(s,1),true);assert.equal(ensureKitchen(s).mastery.POT,2);
 s.phase='prep';assert.equal(configureKitchenSlot(s,2,'POT'),true);
 assert.equal(ensureKitchen(s).slots[2].level,2);assert.equal(buyKitchenUpgrade(s,2),false);
 assert.equal(fieldWeaponChoices(s).find(x=>x.type==='POT').level,2);
});
test('v0.13-B old paid position levels turn into type mastery with no repeat fee',()=>{
 const s=setup();s.kitchen.mastery=undefined;s.upgrade=false;
 s.kitchen.slots=[{type:'WOK',level:2},{type:'WOK',level:1},{type:'POT',level:2}];
 const money=s.coins;ensureKitchen(s);
 assert.deepEqual(s.kitchen.mastery,{WOK:2,POT:2,GRILL:1});
 assert.equal(s.kitchen.slots[0].level,2);
 assert.equal(s.kitchen.slots[1].level,2);
 assert.equal(s.kitchen.slots[2].level,2);
 assert.equal(cookwareUpgradeCost(s,'WOK'),null);
 assert.equal(cookwareUpgradeCost(s,'POT'),null);
 assert.equal(s.coins,money);
});
test('v0.13.0-alpha.3 direct left / middle / right priority spots never move another helper',()=>{
 const s=setup();s.phase='prep';
 assert.equal(s.crew.helper.station,0);assert.equal(s.crew.helper2.station,2);
 assert.equal(assignCrew(s,2,'helper'),false,'occupied middle cannot silently swap staff');
 assert.equal(s.crew.helper.station,0);assert.equal(s.crew.helper2.station,2);
 assert.equal(assignCrew(s,1,'helper'),true,'free right station is selectable');
 assert.equal(s.crew.helper.station,1);assert.equal(s.crew.helper2.station,2);
 assert.equal(assignCrew(s,1,'helper2'),false,'cannot duplicate a claimed right position');
 assert.equal(s.crew.helper.station,1);assert.equal(s.crew.helper2.station,2);
 assert.equal(assignCrew(s,0,'helper2'),true,'other helper can independently use freed left position');
 assert.equal(s.crew.helper.station,1);assert.equal(s.crew.helper2.station,0);
 assert.equal(assignCrew(s,2,'helper'),true,'former middle position now free');
 assert.equal(s.crew.helper.station,2);assert.equal(s.crew.helper2.station,0);
 assert.equal(assignCrew(s,2,'helper'),false,'same position is a no-op');
});
test('v0.13-B real idle helper moves from unneeded home to unattended compatible oven with travel delay',()=>{
 const s=setup();s.phase='prep';
 s.menu=['chili_meat','chicken_stew','mushroom_stir'];for(const id of s.menu)s.recipes[id]=82;
 s.phase='service';assert.equal(createService(s,{walkable:true}),true);
 const v=s.service;assert.equal(v.crew.helper.station,0);assert.equal(v.crew.helper2.station,2);
 v.time=8;
 // POT has a real queued order. WOK and CENTRE have none.
 const o=v.orders[0];o.recipeId='chicken_stew';o.status='queued';v.queued=[o.id];
 reassignIdleCooks(v);
 assert.equal(v.crew.helper.moveTo,1);
 assert.equal(v.crew.helper.currentStation,0,'travelling cook has not arrived');
 assert.ok(v.crew.helper.moveUntil>v.time);
 assert.notEqual(v.crew.helper2.moveTo,1,'one target can have only one cook');
 v.time+=1;reassignIdleCooks(v);assert.equal(v.crew.helper.currentStation,0);
 v.time+=1;reassignIdleCooks(v);assert.equal(v.crew.helper.currentStation,1);
 assert.equal(v.crew.helper.moveUntil,0);
 assert.equal(v.events.filter(x=>x.type==='crew_move').length,1);
 assert.equal(v.events.filter(x=>x.type==='crew_arrived').length,1);
});
test('v0.13-B busy helper never abandons an active order, and pre-opening preference remains frozen',()=>{
 const s=setup();s.phase='prep';
 s.menu=['chili_meat','chicken_stew','mushroom_stir'];for(const id of s.menu)s.recipes[id]=82;
 s.phase='service';assert.equal(createService(s,{walkable:true}),true);
 const v=s.service;v.time=10;v.stations.WOK={orderId:'actual',left:8,quality:80};
 const o=v.orders[0];o.recipeId='chicken_stew';o.status='queued';v.queued=[o.id];
 reassignIdleCooks(v);assert.notEqual(v.crew.helper.moveTo,1);
 assert.equal(s.crew.helper.station,0);assert.equal(v.crew.helper.station,0);
 assert.equal(v.crew.helper2.station,2);
});
test('all owned cookware types share mastery, including GRILL, and crew can roam',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const scene=readFileSync(new URL('../src/scenes_v04.js',import.meta.url),'utf8');
 assert.match(app,/\['WOK','POT',\.\.\.\(k\.grillOwned\?\['GRILL'\]:\[\]\)\]\.map\(type=>/);
 assert.match(app,/全店共享 Lv/);
 assert.doesNotMatch(app,/互换/);
 assert.match(app,/aria-pressed/);
 assert.match(app,/data-assign/);
 assert.match(scene,/person\.moveStart/);
});

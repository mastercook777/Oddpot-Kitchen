import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame,ensureKitchen,ensureCrew,buyThirdKitchenBundle,thirdKitchenBundleAvailable,
 THIRD_KITCHEN_BUNDLE_COST,createService,setServicePaused,assignCrew,crewEffects,crewPromotion,
 promoteCrew,configureKitchenSlot,tick,resumeBreak,closeService,advanceDay,fieldWeaponChoices,
 kitchenUpgradeCost,buyKitchenUpgrade,stationDuration,crewWage} from '../src/engine.js';
import {dinerSpot,DINER_FLOOR} from '../src/restaurant_scene_v075.js';
import {crewAppearance} from '../src/pixels_v041.js';
function game(){const s=newGame(131022);s.phase='upgrade';s.coins=750;s.chapterProgress.stars=1;s.dining.tableCount=4;return s;}
function prepared(seed,third=true){
 const s=game();s.seed=seed;s.cycle=3;s.day=1;s.reputation=24;
 s.crew.helper.hired=true;s.crew.helper.onDuty=true;s.crew.helper.station=0;
 s.crew.waiter.hired=true;s.crew.waiter.onDuty=true;
 if(third)assert.equal(buyThirdKitchenBundle(s),true);
 s.phase='prep';s.coins=500;s.management={dayKey:'3-1',openingCoins:500,campaignId:'none',wageDebt:0};
 s.menu=['chili_meat','chicken_stew','mushroom_stir'];
 for(const id of s.menu)s.recipes[id]=82;
 for(const id of Object.keys(s.inventory))s.inventory[id]=100;
 return s;
}
function shift(s){
 s.phase='service';assert.equal(createService(s,{walkable:true}),true);
 Object.assign(s.service.hero,DINER_FLOOR.right);
 assert.equal(setServicePaused(s,false),true);
 for(let i=0;i<130&&!s.service.done;i++){
  if(s.service.breakAt)resumeBreak(s);
  tick(s,1);
 }
 assert.equal(s.service.done,true);
 return closeService(s);
}
test('v0.13-A one purchase provides BOTH a real new station and employee, no free third equipment',()=>{
 const s=game();s.chapterProgress.stars=0;assert.equal(thirdKitchenBundleAvailable(s),false);
 s.chapterProgress.stars=1;s.dining.tableCount=3;assert.equal(thirdKitchenBundleAvailable(s),false);
 s.dining.tableCount=4;s.coins=THIRD_KITCHEN_BUNDLE_COST-1;assert.equal(thirdKitchenBundleAvailable(s),false);
 s.coins=350;const pre=s.coins;
 assert.equal(buyThirdKitchenBundle(s),true);
 assert.equal(s.coins,pre-THIRD_KITCHEN_BUNDLE_COST);
 assert.equal(ensureKitchen(s).slots.length,3);assert.equal(ensureKitchen(s).slots[2].type,'WOK');
 assert.equal(ensureCrew(s).helper2.hired,true);assert.equal(s.crew.helper2.onDuty,true);assert.equal(s.crew.helper2.station,2);
 assert.equal(buyThirdKitchenBundle(s),false);assert.equal(s.coins,pre-THIRD_KITCHEN_BUNDLE_COST);
 assert.equal(s.ledger.filter(e=>e.id==='third-kitchen-crew-bundle').length,1);
 const old=newGame();assert.equal(ensureKitchen(old).slots.length,2);assert.equal(old.crew.helper2?.hired||false,false);
});
test('v0.13-A staff site is an actual unique assignment with independent promotion and pay',()=>{
 const s=prepared(1652,true);
 assert.equal(crewWage('helper2',1),12);
 assert.equal(assignCrew(s,0,'helper2'),true,'taking an occupied position swaps the preferred cooking stations');
 assert.equal(s.crew.helper.station,2);
 assert.equal(assignCrew(s,1,'helper2'),true);
 assert.equal(assignCrew(s,2,'helper'),false,'阿火 is already assigned to centre after swap');
 assert.equal(crewEffects(s).helper.station,2);
 assert.equal(crewEffects(s).helper2.station,1);
 assert.equal(configureKitchenSlot(s,2,'POT'),true);
 assert.equal(ensureKitchen(s).slots[2].type,'POT');
 assert.equal(crewEffects(s).helper2.salary,12);
 assert.equal(dinerSpot({...DINER_FLOOR.centre},s),null,'centre is not built during preparation; no service snapshot yet');
 s.crew.helper2.xp=8;s.phase='report';const before=s.coins;
 assert.equal(crewPromotion(s,'helper2').ready,true);
 assert.equal(promoteCrew(s,'helper2'),true);
 assert.equal(s.crew.helper2.level,2);
 assert.equal(s.coins,before-28);
 assert.equal(promoteCrew(s,'helper2'),false);
 assert.ok(crewAppearance('helper2',3).uniform);
 assert.equal(kitchenUpgradeCost(s,2),75);
 s.phase='upgrade';assert.equal(buyKitchenUpgrade(s,2),true);
 assert.equal(ensureKitchen(s).slots[2].level,2);
 const choices=fieldWeaponChoices(s);assert.equal(choices.length,2,'one weapon by cookware TYPE not per station');
});
test('v0.13-A centre queued work is a physically independent staffed production station',()=>{
 let foundStarted=false,foundCompleted=false;
 for(let seed=501;seed<511;seed++){
  const s=prepared(seed,true);const r=shift(s),events=s.service.events;
  const centre=events.filter(e=>e.type==='started'&&e.station==='CENTER');
  const fire=events.filter(e=>e.type==='helper_finished'&&e.role==='helper2');
  foundStarted ||=centre.length>0;foundCompleted ||=fire.length>0;
  assert.equal(r.finance.wage,31,'阿火10＋小炭12＋小芽9');
  assert.equal(r.kitchen.slots.length,3);
  assert.equal(r.growth.earned.helper2,new Set(fire.map(e=>e.order)).size);
  assert.equal(r.kitchen.stats.CENTER.count,centre.length);
  assert.equal(r.finance.roster.helper2,12);
  for(const event of centre)assert.ok(events.filter(e=>e.type==='started'&&e.order===event.order).length===1,'each order starts only once');
  for(const order of s.service.orders)assert.ok(s.ledger.filter(e=>e.id==='sale-'+order.id).length<=1);
 }
 assert.equal(foundStarted,true);assert.equal(foundCompleted,true);
});
test('v0.13-A old 2-station service snapshot remains frozen across newly unlocked kitchen and wage rules',()=>{
 const s=prepared(1012,false);s.phase='service';createService(s,{walkable:true});
 assert.equal(s.service.kitchenSnapshot.length,2);
 assert.deepEqual(Object.keys(s.service.stations),['WOK','POT']);
 const crew=s.service.crew;
 assert.equal(crew.helper2.hired,false);
 s.kitchen.thirdUnlocked=true;s.kitchen.slots.push({type:'WOK',level:1});
 s.crew.helper2.hired=true;s.crew.helper2.onDuty=true;
 assert.deepEqual(Object.keys(s.service.stations),['WOK','POT']);
 assert.equal(s.service.kitchenSnapshot.length,2);
 assert.equal(s.service.crew.helper2.hired,false);
});
test('v0.13-A cashier does not invent salary or XP when second helper is off-duty',()=>{
 const s=prepared(1132,true);
 s.crew.helper2.onDuty=false;
 const r=shift(s);
 assert.equal(r.finance.wage,19);
 assert.equal(r.growth.earned.helper2,0);
 assert.equal(s.service.events.filter(e=>e.type==='started'&&e.station==='CENTER').length,0);
 assert.equal(r.kitchen.stats.CENTER.count,0);
});
test('v0.13-A static UI/scene and offline source all include new staffed expansion',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const scene=readFileSync(new URL('../src/scenes_v04.js',import.meta.url),'utf8');
 const build=readFileSync(new URL('../scripts/build-standalone.py',import.meta.url),'utf8');
 assert.match(app,/third-kitchen-bundle/);assert.match(app,/row\('helper2'\)/);assert.match(app,/中厨位/);
 assert.match(scene,/\['WOK','POT','CENTER'\]/);assert.match(scene,/kind:role/);
 assert.match(build,/third_kitchen_v013a\.css/);
});

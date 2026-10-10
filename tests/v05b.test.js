import test from 'node:test';
import assert from 'node:assert/strict';
import {
 newGame,ensureCrew,hireCrew,assignCrew,feedCrew,crewEffects,activeCrewMeal,
 stationDuration,createService,setServicePaused,tick,closeService,advanceDay,resumeBreak
} from '../src/engine.js';
import {RECIPES} from '../src/data.js';

function prepWithEnough(){const s=newGame(20261010);s.phase='prep';for(const id in s.inventory)s.inventory[id]=60;return s;}
function closeNight(s){s.phase='service';assert.equal(createService(s),true);assert.equal(setServicePaused(s,false),true);for(let i=0;i<110;i++){if(s.service.breakAt)resumeBreak(s);if(s.service.done)break;tick(s,1)}assert.equal(s.service.done,true);return closeService(s)}

test('v0.5B legacy saves without crew migrate safely and chef slots remain as before',()=>{
 const s=newGame();delete s.crew;delete s.staffFoodCost;
 assert.equal(ensureCrew(s).helper.hired,false);assert.equal(ensureCrew(s).waiter.hired,false);
 assert.equal(stationDuration(s,'WOK',RECIPES.veg_stir,null),RECIPES.veg_stir.time);
 assert.equal(s.staffFoodCost,0);
});

test('v0.5B one-time hires deduct coins exactly once and helper assignment follows physical slot',()=>{
 const s=prepWithEnough();assert.equal(hireCrew(s,'helper'),true);assert.equal(hireCrew(s,'waiter'),true);
 assert.equal(s.coins,45);assert.equal(hireCrew(s,'helper'),false);assert.equal(s.coins,45);
 assert.equal(s.ledger.filter(x=>x.type==='crew_hire').length,2);
 assert.equal(assignCrew(s,1),true);assert.equal(assignCrew(s,1),false);
 assert.equal(crewEffects(s).helper.station,1);
});

test('v0.5B staff meals consume real ingredients and cannot be double-claimed',()=>{
 const s=prepWithEnough();hireCrew(s,'helper');hireCrew(s,'waiter');
 const initial={...s.inventory};assert.equal(feedCrew(s,'helper','mushroom_stir'),true);
 assert.equal(s.inventory.mushroom,initial.mushroom-1);assert.equal(s.inventory.garlic,initial.garlic-1);
 assert.equal(feedCrew(s,'helper','chicken_stew'),false);
 assert.equal(feedCrew(s,'waiter','chicken_stew'),true);
 assert.equal(s.inventory.mushroom,initial.mushroom-2);assert.equal(s.inventory.chicken,initial.chicken-1);
 assert.equal(s.ledger.filter(x=>x.id.startsWith('crew-meal-')).length,2);
 assert.equal(s.staffFoodCost,14);assert.equal(s.crew.helper.meals,1);
});

test('v0.5B dish flavor, stove assignment and quality materially change helper output',()=>{
 const s=prepWithEnough();s.recipes.chili_meat=76;hireCrew(s,'helper');
 const base=stationDuration(s,'WOK',RECIPES.veg_stir,{crew:crewEffects(s)});
 assert.equal(base,5);assert.equal(feedCrew(s,'helper','chili_meat'),true);
 const spiced=crewEffects(s);assert.equal(spiced.helper.seconds,3);
 assert.equal(stationDuration(s,'WOK',RECIPES.veg_stir,{crew:spiced}),3);
 assert.equal(assignCrew(s,1),true); // assign to POT: spicy meal is mismatched
 assert.equal(crewEffects(s).helper.seconds,1);
 s.recipes.chili_meat=89;s.crew.helper.feed.quality=89;
 assert.equal(crewEffects(s).helper.seconds,2);
});

test('v0.5B waiter food increases real order patience on arrival, not only a UI label',()=>{
 const base=prepWithEnough(),fed=prepWithEnough();hireCrew(fed,'waiter');feedCrew(fed,'waiter','chicken_stew');
 base.phase='service';fed.phase='service';createService(base);createService(fed);
 setServicePaused(base,false);setServicePaused(fed,false);tick(base,3);tick(fed,3);
 assert.equal(base.service.orders[0].patience,32);
 assert.equal(fed.service.orders[0].patience,41);
 assert.equal(fed.service.crew.waiter.patience,9);
 assert.equal(fed.service.staffStats.waiterOrders,1);
});

test('v0.5B service snapshot measures helper saved seconds, waiter aid and meal cost in profit',()=>{
 const s=prepWithEnough();hireCrew(s,'helper');hireCrew(s,'waiter');
 feedCrew(s,'helper','mushroom_stir');feedCrew(s,'waiter','chicken_stew');
 const mealCost=s.staffFoodCost;
 const report=closeNight(s);
 assert.ok(report.staff.stats.helperOrders>0);assert.ok(report.staff.stats.helperSeconds>0);
 assert.ok(report.staff.stats.waiterOrders>0);assert.ok(report.staff.stats.waiterBonus>0);
 assert.equal(report.staff.foodCost,mealCost);assert.equal(s.staffFoodCost,0);
 assert.equal(report.profit,report.revenue-report.cost-(report.hospitalityCost||0)-(report.eventExpense||0));
 assert.equal(s.ledger.filter(x=>x.type==='consume'&&x.id.startsWith('crew-meal-')).length,2);
});

test('v0.5B meals expire across days but hires remain and familiarity caps at 3',()=>{
 const s=prepWithEnough();hireCrew(s,'helper');const before=crewEffects(s).helper.seconds;
 for(let day=1;day<=4;day++){s.day=day===4?1:day;s.cycle=day===4?2:1;
   assert.equal(feedCrew(s,'helper','mushroom_stir'),true);assert.equal(feedCrew(s,'helper','mushroom_stir'),false);
   assert.equal(s.crew.helper.meals,Math.min(3,day));
 }
 s.cycle=3;s.day=1;
 assert.equal(activeCrewMeal(s,'helper'),null);
 assert.equal(crewEffects(s).helper.seconds,before+1);
 assert.equal(s.crew.helper.hired,true);
});

test('v0.5B feeding disabled during service, protects meal timing and shared inventory',()=>{
 const s=prepWithEnough();hireCrew(s,'helper');const before={...s.inventory};
 s.phase='service';createService(s);
 assert.equal(feedCrew(s,'helper','mushroom_stir'),false);
 assert.deepEqual(s.inventory,before);assert.equal(s.service.crew.helper.seconds,1);
});

test('v0.5B saved ongoing v0.5A service migrates without missing-staff-stat crashes',async()=>{
 const {load}=await import('../src/engine.js');
 const s=prepWithEnough();s.phase='service';createService(s);
 delete s.crew;delete s.staffFoodCost;delete s.service.crew;delete s.service.staffStats;
 const oldStorage=globalThis.localStorage;
 globalThis.localStorage={getItem(){return JSON.stringify(s)}};
 try{const restored=load();assert.ok(restored);assert.equal(restored.service.staffStats.waiterBonus,0);
 assert.equal(setServicePaused(restored,false),true);
 for(let i=0;i<10;i++)tick(restored,1);
 assert.ok(restored.service.time>0);
 }finally{globalThis.localStorage=oldStorage}
});
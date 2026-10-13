import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RECIPES} from '../src/data.js';
import {newGame,canUse,consume,setPremiumMenu,premiumMenuActive,premiumMenuOptions,premiumReserved,
 premiumGuestEligible,serviceDayPlan,createService,selectArrivalDish,REGULAR_GUESTS,
 PREMIUM_MAX_SERVINGS,PREMIUM_PRICE_FACTOR,recipeCraftSnapshot,serviceGoalResult,
 tick,totalBusinessDay,closeService,advanceDay,prepStockForecast} from '../src/engine.js';

function ownRare(seed=177){
 const s=newGame(seed);s.phase='menu';s.recipes.ember_pepper_wok=91;
 s.inventory.ember_pepper=2;s.inventory.beef=12;s.inventory.garlic=12;
 return s;
}
test('rare menu is separate from three regular slots, cannot sell ingredients not owned',()=>{
 const s=ownRare();
 const oldMenu=[...s.menu];
 assert.ok(premiumMenuOptions(s).some(x=>x.id==='ember_pepper_wok'));
 assert.equal(setPremiumMenu(s,'ember_pepper_wok',3),false);
 assert.equal(setPremiumMenu(s,'ember_pepper_wok',2),true);
 assert.deepEqual(s.menu,oldMenu);
 assert.equal(premiumMenuActive(s),true);
 assert.equal(PREMIUM_MAX_SERVINGS,2);
 assert.equal(premiumReserved(s).ember_pepper,2);
 assert.equal(setPremiumMenu(s,'chicken_stew',1),false);
 assert.equal(setPremiumMenu(s,null),true);
 assert.equal(premiumMenuActive(s),false);
 s.inventory.ember_pepper=0;
 assert.equal(setPremiumMenu(s,'ember_pepper_wok',1),false);
});
test('hidden dish protects two actual rare portions against ordinary prep and consumption',()=>{
 const s=ownRare();
 assert.equal(setPremiumMenu(s,'ember_pepper_wok',2),true);
 s.phase='prep';
 assert.equal(canUse(s,['ember_pepper']),false);
 assert.equal(consume(s,['ember_pepper'],'steal-from-premium'),false);
 assert.equal(canUse(s,['ember_pepper'],true),true);
 assert.equal(s.inventory.ember_pepper,2);
 assert.equal(prepStockForecast(s).shortageCount>=0,true);
});
test('one real eligible guest is guaranteed in original wave plan without growing audience count',()=>{
 const s=ownRare(1);assert.equal(setPremiumMenu(s,'ember_pepper_wok',1),true);
 const p=serviceDayPlan(s);
 assert.equal(p.count,p.guests.length);
 assert.ok(p.guests.includes('critic'),'ghost critic inserted into existing planned customers if none qualified');
 s.premiumMenu=null;
 const baseline=serviceDayPlan(s);
 assert.equal(p.count,baseline.count,'no phantom customers added');
});
test('qualified critic can choose high-price rare dish without ordinary-budget rejection',()=>{
 const s=ownRare();
 assert.equal(setPremiumMenu(s,'ember_pepper_wok',2),true);
 s.phase='service';assert.equal(createService(s),true);
 const critic=s.service.orders.find(o=>o.segment==='critic');
 assert.ok(critic,'eligible critic comes through actual arrival plan');
 const regular={...critic,id:'extra-one',segment:'adventurer',guestId:null};
 assert.equal(premiumGuestEligible(s,critic),true);
 assert.equal(premiumGuestEligible(s,regular),false);
 let before=JSON.stringify(s.inventory);
 const order=selectArrivalDish(s,critic);
 assert.equal(order.premium,true);
 assert.equal(critic.premium,true);
 assert.equal(critic.recipeId,'ember_pepper_wok');
 assert.equal(critic.craft.price,Math.round(recipeCraftSnapshot(s,'ember_pepper_wok').price*PREMIUM_PRICE_FACTOR));
 assert.equal(s.inventory.ember_pepper,2,'selecting order does not consume raw materials');
 assert.equal(JSON.stringify(s.inventory),before);
 const normal=selectArrivalDish(s,regular);
 assert.notEqual(regular.recipeId,'ember_pepper_wok','unqualified stranger cannot order hidden dish');
 assert.equal(normal.premium,undefined);
});
test('premium assignment respects reserved daily portion count, excess guests use regular menu',()=>{
 const s=ownRare(110);setPremiumMenu(s,'ember_pepper_wok',1);
 s.phase='service';createService(s);
 const c=s.service.orders.find(o=>o.segment==='critic');
 assert.ok(selectArrivalDish(s,c)?.premium);
 const another={...c,id:'second-critic',premium:false,recipeId:null,craft:null};
 const after=selectArrivalDish(s,another);
 assert.equal(after.premium,undefined);
 assert.equal(another.premium,false);
 assert.notEqual(another.recipeId,'ember_pepper_wok');
});
test('stable named guests learn only from real satisfied consumption, deduped by sale review',()=>{
 const s=ownRare();s.premiumMenu=null;s.phase='service';assert.ok(createService(s));
 const visitor=s.service.orders.find(o=>o.guestId);
 assert.ok(visitor);
 assert.ok(Object.values(REGULAR_GUESTS).some(x=>x.id===visitor.guestId));
 assert.equal(premiumGuestEligible(s,visitor),false);
 visitor.status='eating';visitor.landedAt=0;visitor.arrival=0;visitor.patience=100;
 visitor.fit=100;visitor.quality=95;visitor.recipeId='chicken_stew';
 s.service.paused=false;
 tick(s,3);
 const g=s.guestRelationships[visitor.guestId];
 assert.ok(g,'relation created only after visitor review');
 assert.equal(g.visits,1);assert.equal(g.happyMeals,1);
 tick(s,1);
 assert.equal(g.visits,1,'review cannot be double counted');
 g.visits=2;g.happyMeals=2;
 assert.equal(premiumGuestEligible(s,visitor),true);
});
test('premium daily plan does not auto-sell; reports use actual served orders only',()=>{
 const s=ownRare();setPremiumMenu(s,'ember_pepper_wok',2);
 s.phase='service';createService(s);s.service.done=true;
 for(const o of s.service.orders){o.status='left';o.leftAt=0;}
 const report=closeService(s);
 assert.equal(report.premium.sold,0);
 assert.equal(report.premium.revenue,0);
 assert.equal(report.premium.limit,2);
 assert.equal(report.premium.ordered,0);
 assert.equal(s.inventory.ember_pepper,2);
});
test('rare ingredients are consumed through the original order and sale ledger, no bonus sale occurs',()=>{
 const s=ownRare(9921);
 assert.equal(setPremiumMenu(s,'ember_pepper_wok',2),true);
 s.phase='service';assert.equal(createService(s),true);
 const v=s.service,o=v.orders.find(x=>x.segment==='critic');
 assert.equal(selectArrivalDish(s,o).premium,true);
 for(const other of v.orders)if(other!==o)other.status='served';
 o.status='queued';o.arrival=0;o.patience=160;o.seatedAt=0;v.queued=[o.id];v.paused=false;
 const before=s.inventory.ember_pepper,cash=s.coins;
 tick(s,19);
 assert.equal(o.status,'served','the premium dish was physically prepared, landed, eaten and reviewed');
 assert.equal(s.inventory.ember_pepper,before-1);
 assert.equal(v.premiumConsumed,1);
 assert.equal(s.ledger.filter(t=>t.id==='sale-'+o.id).length,1);
 assert.equal(v.income,o.craft.price);
 assert.equal(s.coins,cash+o.craft.price);
 v.done=true;
 const report=closeService(s);
 assert.equal(report.premium.sold,1);
 assert.equal(report.premium.ordered,1);
 assert.equal(report.premium.revenue,o.craft.price);
 assert.equal(report.revenue,v.income);
});
test('future source types can be registered as rare recipes without Boss-only requirement',()=>{
 const s=ownRare();assert.ok(RECIPES.ember_pepper_pot.rare);
 // Availability depends on the rare recipe flag and learned/owned ingredients,
 // not on a hardcoded boss ID list in the menu selection.
 assert.ok(premiumMenuOptions(s).some(x=>x.id==='ember_pepper_wok'));
});
test('minimal interface references original sheet and not extra regular menu slots',()=>{
 const src=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/kitchen_050.css',import.meta.url),'utf8');
 assert.match(src,/data-act="premium"/);
 assert.match(src,/data-premium-set/);
 assert.match(src,/setPremiumMenu\(game,id,Number\(n\)\)/);
 assert.match(src,/v010-premium-report/);
 assert.match(css,/\.v010-premium-entry/);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.match(src,/今晚菜单 · 3 道/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {newGame,load,save,serviceDayPlan,createService,setServicePaused,tick,
 resumeBreak,closeService,advanceDay,totalBusinessDay} from '../src/engine.js';
import {setHiddenMenuRecipe,isRareRecipe,buildGrowthGuestPlan,
 applyRealRegularReview,markPlannedReferralsUsed,summarizeGrowthService} from '../src/restaurant_growth_v010.js';

function loadedRestaurant(seed=101){
 const s=newGame(seed);for(const id of Object.keys(s.inventory))s.inventory[id]=100;
 s.recipes.chicken_stew=100;
 s.phase='menu';
 return s;
}
function simulateNight(s){
 s.phase='service';assert.equal(createService(s,{walkable:false}),true);
 assert.equal(setServicePaused(s,false),true);
 let steps=0;while(!s.service.done&&steps++<140){
  if(s.service.breakAt)assert.equal(resumeBreak(s),true);
  else tick(s,1);
 }
 assert.equal(s.service.done,true);
 const report=closeService(s);
 assert.ok(report);
 return report;
}
test('default v0.9.5 gameplay has no invented guests or sales',()=>{
 const s=newGame(347);
 const plan=serviceDayPlan(s);
 assert.equal(plan.visitors.length,plan.count);
 assert.equal(plan.guests.length,plan.count);
 assert.ok(plan.visitors.every(x=>x===null));
 const a=JSON.parse(JSON.stringify(s));
 assert.deepEqual(serviceDayPlan(a),plan);
 assert.equal(s.restaurantGrowth.hiddenMenuRecipeId,null);
 assert.equal(s.restaurantGrowth.referrals.length,0);
});

test('hidden menu is a separate learned rare recipe slot',()=>{
 const s=newGame();s.phase='menu';
 assert.equal(setHiddenMenuRecipe(s,'chicken_stew'),false);
 assert.equal(isRareRecipe('mushroom_heart_wok'),true);
 assert.equal(setHiddenMenuRecipe(s,'mushroom_heart_wok'),false);
 s.recipes.mushroom_heart_wok=85;
 assert.equal(setHiddenMenuRecipe(s,'mushroom_heart_wok'),true);
 assert.equal(s.menu.length,3);
 assert.ok(!s.menu.includes('mushroom_heart_wok'));
 assert.equal(setHiddenMenuRecipe(s,null),true);
});

test('regular arrives on existing order and must finish actual meal before relationship/recommendation',()=>{
 const s=loadedRestaurant();
 const plan=serviceDayPlan(s),v=plan.visitors.filter(x=>x?.regularId);
 assert.equal(v.length,1);assert.equal(v[0].source,'first');
 s.phase='service';assert.equal(createService(s,{walkable:false}),true);
 const o=s.service.orders.find(x=>x.visitor?.regularId);
 assert.ok(o);assert.ok(s.service.orders.length===plan.count);
 assert.equal(Object.keys(s.restaurantGrowth.regulars).length,0);
 assert.equal(s.restaurantGrowth.referrals.length,0);
 assert.equal(setServicePaused(s,false),true);
 let guard=0;
 while(!['review','served','left','rejected'].includes(o.status)&&guard++<125){
  if(s.service.breakAt)resumeBreak(s);else tick(s,1);
 }
 assert.ok(['review','served'].includes(o.status),'first named visitor should complete a real meal');
 assert.ok(s.ledger.some(x=>x.id==='sale-'+o.id),'named visitor has real sale transaction');
 assert.ok(s.ledger.some(x=>x.id==='relationship-'+o.id));
 assert.equal(s.restaurantGrowth.regulars[o.visitor.regularId].visits,1);
 assert.equal(s.restaurantGrowth.referrals.length,1,'good actual review creates tomorrow\'s single lead');
 const earlier=JSON.stringify(s.restaurantGrowth);
 for(let i=0;i<8;i++)if(!s.service.breakAt&&!s.service.done)tick(s,1);
 assert.equal(JSON.stringify(s.restaurantGrowth),earlier,'same order is not applied twice');
});

test('word of mouth is a real future order, deterministic and not automatically paid',()=>{
 const s=loadedRestaurant(201);
 const day=totalBusinessDay(s);
 const original=serviceDayPlan(s);
 const actual=simulateNight(s);
 assert.ok(actual.growth.firstArrived>0);
 assert.equal(actual.growth.newReferrals,1);
 assert.equal(actual.revenue,s.service.orders.filter(o=>o.status==='served')
  .reduce((sum,o)=>sum+(o.craft?.price??0),0));
 const history=JSON.parse(JSON.stringify(s.restaurantGrowth));
 assert.ok(history.referrals[0].availableDay===day+1);
 s.phase='upgrade';assert.equal(advanceDay(s),true);
 const before=JSON.stringify(s.restaurantGrowth),next=serviceDayPlan(s);
 assert.equal(JSON.stringify(s.restaurantGrowth),before,'forecast never consumes a recommendation');
 assert.deepEqual(serviceDayPlan(s),next);
 assert.equal(next.count,next.guests.length);
 assert.equal(next.visitors.filter(x=>x?.source==='referral').length,1);
 const none=JSON.parse(JSON.stringify(s));none.restaurantGrowth.referrals=[];
 assert.equal(next.count,serviceDayPlan(none).count+1);
 s.phase='service';assert.equal(createService(s,{walkable:false}),true);
 const referred=s.service.orders.filter(o=>o.visitor?.source==='referral');
 assert.equal(referred.length,1);
 assert.equal(s.restaurantGrowth.referrals.filter(r=>r.usedDay===totalBusinessDay(s)).length,1);
 assert.equal(s.ledger.filter(e=>e.id==='sale-'+referred[0].id).length,0,'no imaginary revenue from forecast');
 assert.equal(s.service.orders.at(-1).visitor?.source,'referral');
 assert.equal(s.report,null);
});

test('review rule requires a named real reviewed dish; no direct auto-money and day cap of one lead',()=>{
 const s=loadedRestaurant(),cash=s.coins;
 const person={id:'1-1-o0',recipeId:'chicken_stew',sat:95,
  visitor:{regularId:'mushroom_mimi'}};
 assert.equal(applyRealRegularReview(s,person,1),true);
 assert.equal(s.restaurantGrowth.regulars.mushroom_mimi.visits,1);
 assert.equal(s.restaurantGrowth.referrals.length,1);
 assert.equal(applyRealRegularReview(s,{...person,id:'1-1-o1'},1),true);
 assert.equal(s.restaurantGrowth.referrals.length,1);
 assert.equal(s.coins,cash);
 assert.equal(applyRealRegularReview(s,{...person,id:'1-1-o2',sat:43},2),true);
 assert.equal(s.restaurantGrowth.referrals.length,1,'unhappy guest does not refer anyone');
 const guest={...person,visitor:null};
 assert.equal(applyRealRegularReview(s,guest,2),false);
});

test('challenge reviewer stays final when an earned friend joins the real crowd',()=>{
 const s=loadedRestaurant();s.day=3;s.restaurantGrowth.referrals.push({
 id:'referral-1-2-o0',fromRegularId:'mushroom_mimi',segment:'family',
 sourceOrderId:'1-2-o0',createdDay:2,availableDay:3,usedDay:null});
 const plan=serviceDayPlan(s);
 assert.equal(plan.guests.at(-1),'critic');
 assert.equal(plan.visitors.at(-2).source,'referral');
 s.phase='service';createService(s,{walkable:false});
 assert.equal(s.service.judgeOrderId,s.service.orders.at(-1).id);
 assert.equal(s.service.orders.at(-2).visitor.source,'referral');
});

test('existing v4 saves migrate without fictitious visits or losing old assets',()=>{
 const original=globalThis.localStorage;
 const s=newGame(909);delete s.restaurantGrowth;s.coins=307;s.reputation=19;
 s.inventory.mushroom=21;s.dining.tableCount=3;s.history=[{day:20,revenue:90}];
 const store=new Map([['oddpot-prototype-v04',JSON.stringify(s)]]);
 globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 try{
  const loaded=load();assert.ok(loaded);assert.deepEqual(loaded.restaurantGrowth,
   {signatureRecipeId:null,regulars:{},referrals:[]});
  assert.equal(loaded.coins,307);assert.equal(loaded.inventory.mushroom,21);
  assert.equal(loaded.dining.tableCount,3);assert.equal(loaded.history.length,1);
  save(loaded);assert.equal(load().restaurantGrowth.referrals.length,0);
 }finally{globalThis.localStorage=original}
});

test('growth module, menu button, old 320px-safe UI and offline build are wired',()=>{
 const file=p=>readFileSync(new URL(p,import.meta.url),'utf8');
 const app=file('../src/app.js'),css=file('../src/restaurant_growth_v010.css');
 const script=file('../scripts/build-standalone.py'),index=file('../index.html');
 assert.match(app,/data-act="hidden-menu"/);
 assert.match(app,/data-hidden-pick/);
 assert.match(app,/visitorCue/);
 assert.match(app,/growthReport\(game\)/);
 assert.match(css,/@media\(max-width:355px\)/);
 assert.match(index,/restaurant_growth_v010\.css/);
 assert.match(script,/restaurant_growth_v010\.js/);
 for(const path of ['src/engine.js','src/app.js','src/restaurant_growth_v010.js'])
  execFileSync(process.execPath,['--check',new URL('../'+path,import.meta.url).pathname]);
});

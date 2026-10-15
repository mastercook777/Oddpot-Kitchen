import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,ensureDailyMarket,purchase,createService,serviceDayPlan,ensureChapterProgress,
 ensureSecondAppraisal,secondStarAvailable,secondStarRequested,requestSecondStar,closeService,
 setServicePaused,tick,resumeBreak,advanceDay,guestBookEntries,chooseCampaign} from '../src/engine.js';
import {MARKET_ROTATION_STAPLES,CUSTOMERS,RECIPES,ING} from '../src/data.js';
import {scoreSecondStar} from '../src/restaurant_second_star_v013d.js';

const prep=(seed=812)=>{
 const s=newGame(seed);s.phase='prep';s.cycle=4;s.day=1;s.dining.tableCount=4;s.chapterProgress.stars=1;s.coins=5000;
 for(const id of MARKET_ROTATION_STAPLES)s.inventory[id]=200;
 s.crew.helper.hired=true;s.crew.helper.onDuty=true;s.crew.waiter.hired=true;s.crew.waiter.onDuty=true;
 return s;
};
function run(s){
 s.phase='service';assert.equal(createService(s),true);
 assert.equal(setServicePaused(s,false),true);
 for(let i=0;i<160&&!s.service.done;i++){if(s.service.breakAt)resumeBreak(s);tick(s,1)}
 assert.ok(s.service.done);
 return closeService(s);
}
test('eight rotating staples retain a chosen market and do not grant rare goods',()=>{
 const s=newGame(20261009);s.coins=10000;
 const before=ensureDailyMarket(s),ids=Object.keys(before.goods),gold=s.coins;
 assert.equal(ids.length,4);
 assert.equal(purchase(s,'mushroom_heart',1),false);
 const id=ids[0],price=before.goods[id].price,limit=before.goods[id].initialStock;
 for(let n=0;n<limit;n++)assert.equal(purchase(s,id,1),true);
 assert.equal(purchase(s,id,1),false);
 assert.equal(s.coins,gold-limit*price);
 assert.equal(ensureDailyMarket(s),before);
 assert.equal(s.ledger.filter(e=>e.type==='purchase').length,limit);
 s.phase='upgrade';assert.equal(advanceDay(s),true);
 const next=ensureDailyMarket(s);
 assert.equal(next.schema,3);assert.equal(Object.keys(next.goods).length,4);
 assert.notEqual(next.dayKey,before.dayKey);
});
test('old schema2 same-day stock never gets rerolled or restocked',()=>{
 const s=newGame();s.market={dayKey:'1-1',schema:2,goods:{chicken:{stock:2,initialStock:8,price:4}}};
 const old=s.market;assert.equal(ensureDailyMarket(s),old);assert.deepEqual(Object.keys(s.market.goods),['chicken']);
 s.coins=100;assert.equal(purchase(s,'chicken',1),true);
 assert.equal(s.market.goods.chicken.stock,1);
 assert.equal(ensureDailyMarket(s).goods.chicken.stock,1);
});
test('real vegetable-first matching exists and is neither mushroom chicken nor random spices',()=>{
 assert.deepEqual(CUSTOMERS.gardener.likes,['蔬食','清爽','温和']);
 for(const name of ['veg_stir','harvest_stir','potato_stew'])assert.ok(RECIPES[name].tags.includes('蔬食'),name);
 for(const name of ['chicken_stew','onion_chicken','mushroom_stir'])assert.equal(RECIPES[name].tags.includes('蔬食'),false,name);
 assert.equal(ING.ember_pepper.acquisitionPolicy,'BOSS_ONLY');
});
test('two-night appraisal can be requested only with star, four tables, and a later service day',()=>{
 const s=newGame();s.phase='prep';s.chapterProgress.stars=1;
 assert.equal(secondStarAvailable(s),false);s.dining.tableCount=4;s.cycle=3;s.day=1;
 assert.equal(secondStarAvailable(s),true);
 assert.equal(requestSecondStar(s),true);assert.equal(secondStarRequested(s),true);
 s.phase='service';assert.equal(createService(s),true);
 assert.equal(s.service.secondStarStage,1);
 assert.equal(requestSecondStar(s,false),false);
 const old=structuredClone(s);assert.equal(old.service.secondStarStage,1);
});
test('score uses genuine delivered orders, real queue loss and distinct sold menu entries',()=>{
 const v={orders:Array.from({length:12},(_,i)=>({status:i<10?'served':'left',sat:86,quality:84,recipeId:i%2?'veg_stir':'chicken_stew'})),events:[
 {type:'queue_left'},{type:'queue_seated',seconds:8},
 {type:'helper_finished',order:'a'},{type:'waiter_pickup',order:'b'}]};
 const busy=scoreSecondStar(v,1,120),craft=scoreSecondStar(v,2,120);
 assert.equal(busy.passed,true);assert.equal(craft.passed,true);
 assert.equal(craft.diversity,2);
 const impossible={...v,orders:v.orders.map(o=>({...o,status:'left'}))};
 assert.equal(scoreSecondStar(impossible,1,900).passed,false);
 assert.equal(scoreSecondStar(impossible,2,900).passed,false);
});
test('second star staged review freezes to real service snapshot and next day retains stage',()=>{
 const s=prep(333);
 assert.equal(requestSecondStar(s),true);
 const first=run(s);
 assert.equal(first.secondRating?.stage,1);
 assert.equal(s.chapterProgress.stars,1);
 assert.equal(closeService(s),false,'never score a shift twice');
 const expected=s.chapterProgress.secondAppraisal.stage;
 s.phase='upgrade';assert.equal(advanceDay(s),true);
 assert.equal(s.chapterProgress.secondAppraisal.stage,expected);
 assert.equal(s.chapterProgress.secondAppraisal.requestDay,null);
 s.phase='prep';
 assert.equal(secondStarAvailable(s),true);
 assert.equal(requestSecondStar(s),true);
 const r=run(s);
 assert.equal(r.secondRating.stage,expected);
 if(first.secondRating.passed&&r.secondRating.passed){
  assert.equal(s.chapterProgress.stars,2);
  assert.equal(s.ledger.filter(x=>x.id==='chapter-hearth-star-2').length,1);
  assert.equal(closeService(s),false);
 }
});
test('two-star reward promotes actual vegetable guests within demand, and targeted paid customers',()=>{
 const s=prep(144);
 const old=serviceDayPlan(s);
 assert.equal(old.guests.includes('gardener'),false);
 assert.equal(guestBookEntries(s).find(x=>x.segment==='gardener').seen,false);
 s.chapterProgress.stars=2;
 const normal=serviceDayPlan(s);
 assert.ok(normal.guests.includes('gardener'));
 assert.equal(normal.count,old.count,'a new natural type replaces a slot, not invented demand');
 assert.equal(chooseCampaign(s,'garden'),true);
 const paid=serviceDayPlan(s);
 assert.equal(paid.count,normal.count+2);assert.equal(paid.guests.filter(x=>x==='gardener').length>=3,true);
 s.phase='service';assert.equal(createService(s),true);
 assert.equal(s.service.marketing.cost,24);
 assert.equal(s.service.orders.filter(o=>o.segment==='gardener').length>=3,true);
 assert.equal(guestBookEntries(s).find(x=>x.segment==='gardener').seen,false,'no fake discovery before arrival');
});

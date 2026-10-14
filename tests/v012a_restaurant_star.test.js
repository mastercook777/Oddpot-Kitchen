import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {CUSTOMERS} from '../src/data.js';
import {
 newGame,load,SAVE_KEY,nextPhase,requestFirstStar,firstStarAvailable,firstStarRequested,
 ensureChapterProgress,createService,setServicePaused,resumeBreak,tick,closeService,
 advanceDay,serviceDayPlan,guestBookEntries,roomExpansionAvailable,expandDiningRoom,
 tableCapacity,advanceWalkableInteraction,recipeCraftSnapshot
} from '../src/engine.js';
import {scoreFirstStar,FIRST_STAR_TARGET,FOURTH_TABLE_COST} from '../src/restaurant_star_v012a.js';
import {dinerFloor,dinerBlocked,dinerSpot,dinerGuestRoute,dinerSeatPoint} from '../src/restaurant_scene_v075.js';

const ready=(seed=20261009)=>{
 const s=newGame(seed);s.cycle=2;s.day=1;s.phase='prep';
 for(const id of ['chicken','mushroom','cabbage','garlic','onion'])s.inventory[id]=50;
 return s;
};
const finish=s=>{
 assert.equal(setServicePaused(s,false),true);
 for(let i=0;i<160&&!s.service.done;i++){
  if(s.service.breakAt)assert.equal(resumeBreak(s),true);
  tick(s,1);
 }
 assert.equal(s.service.done,true);
 return closeService(s);
};

test('first star is optional, only after old Day 3, and frozen when service begins',()=>{
 const s=newGame();
 s.phase='prep';s.day=3;
 assert.equal(firstStarAvailable(s),false);
 assert.equal(requestFirstStar(s),false);
 const later=ready();
 assert.equal(firstStarAvailable(later),true);
 assert.equal(requestFirstStar(later),true);
 assert.equal(firstStarRequested(later),true);
 assert.equal(requestFirstStar(later,false),true);
 assert.equal(firstStarRequested(later),false);
 assert.equal(requestFirstStar(later),true);
 nextPhase(later,'service');
 assert.equal(createService(later),true);
 assert.equal(later.service.ratingAttempt,true);
 assert.equal(requestFirstStar(later,false),false,'cannot cancel after the actual service starts');
 assert.equal(JSON.parse(JSON.stringify(later)).service.ratingAttempt,true);
});

test('actual completed orders earn one star; ordinary sale count and old challenge are untouched',()=>{
 const s=ready(333);
 assert.equal(requestFirstStar(s),true);
 nextPhase(s,'service');assert.equal(createService(s),true);
 const report=finish(s);
 assert.ok(report.rating?.passed,JSON.stringify(report.rating));
 assert.ok(report.rating.score>=FIRST_STAR_TARGET);
 assert.equal(report.challenge,null,'the old Day 3 chef challenge does not recur');
 assert.equal(s.chapterProgress.stars,1);
 assert.equal(s.ledger.filter(e=>e.id==='chapter-hearth-star-1').length,1);
 assert.equal(s.ledger.filter(e=>e.type==='sale').length,report.served);
 assert.equal(closeService(s),false);
 assert.equal(s.ledger.filter(e=>e.id==='chapter-hearth-star-1').length,1);
 assert.equal(firstStarAvailable(s),false);
});

test('insufficient service fails without consuming star or coins; retry is next day',()=>{
 const s=ready();
 const noService=scoreFirstStar([{status:'left',sat:100,fit:100,quality:100}]);
 assert.equal(noService.passed,false);
 assert.equal(noService.coverage,0);
 assert.equal(requestFirstStar(s),true);
 nextPhase(s,'service');assert.equal(createService(s),true);
 const v=s.service;
 v.done=true;v.orders.forEach(o=>{o.status='left';o.leftReason='等待超时';});
 const coins=s.coins,r=closeService(s);
 assert.equal(r.rating.passed,false);
 assert.equal(s.chapterProgress.stars,0);
 assert.equal(s.coins,coins);
 assert.equal(s.ledger.filter(e=>e.type==='restaurant_star').length,0);
 s.phase='prep';assert.equal(firstStarAvailable(s),false,'same night cannot repeatedly reroll');
 s.phase='upgrade';assert.equal(advanceDay(s),true);
 assert.equal(firstStarAvailable(s),true);
 assert.equal(requestFirstStar(s),true);
});

test('a preexisting schema4 save does not gain stars or retroactive appraisal',()=>{
 const old=newGame();
 delete old.chapterProgress;
 old.cycle=2;old.day=1;old.phase='service';
 assert.equal(createService(old),true);
 const before=globalThis.localStorage;
 globalThis.localStorage={getItem:key=>key===SAVE_KEY?JSON.stringify(old):null};
 try{
  const restored=load();
  assert.equal(restored.version,4);
  assert.equal(ensureChapterProgress(restored).stars,0);
  assert.equal(restored.service.ratingAttempt,false);
 }finally{globalThis.localStorage=before}
});

test('one new customer replaces an existing slot after star and becomes known only on arrival',()=>{
 const s=ready(41),baseline=serviceDayPlan(s);
 assert.equal(baseline.guests.includes('stargazer'),false);
 assert.equal(guestBookEntries(s).find(g=>g.segment==='stargazer').seen,false);
 s.chapterProgress.stars=1;
 const plan=serviceDayPlan(s);
 assert.equal(plan.count,baseline.count);
 assert.ok(plan.guests.includes('stargazer'));
 assert.deepEqual(CUSTOMERS.stargazer.likes,['清爽','甜香','菌香']);
 nextPhase(s,'service');assert.equal(createService(s),true);
 assert.equal(guestBookEntries(s).find(g=>g.segment==='stargazer').seen,false);
 const target=s.service.orders.find(o=>o.segment==='stargazer');
 target.arrival=0;
 setServicePaused(s,false);tick(s,1);
 assert.equal(target.status,'entering');
 assert.equal(guestBookEntries(s).find(g=>g.segment==='stargazer').seen,true);
});

test('fourth table is gated, paid once, and has collision-safe paths and real eight-seat capacity',()=>{
 const s=newGame();s.phase='upgrade';s.cycle=2;s.day=1;s.reputation=5;s.coins=500;
 assert.equal(expandDiningRoom(s),true);
 assert.equal(tableCapacity(s),6);
 assert.equal(roomExpansionAvailable(s),false,'six-seat restaurant alone cannot buy star reward');
 s.chapterProgress.stars=1;
 assert.equal(roomExpansionAvailable(s),true);
 const before=s.coins;
 assert.equal(expandDiningRoom(s),true);
 assert.equal(expandDiningRoom(s),false);
 assert.equal(s.coins,before-FOURTH_TABLE_COST);
 assert.equal(tableCapacity(s),8);
 assert.equal(s.ledger.filter(e=>e.id==='expand-fourth-table').length,1);
 const floor=dinerFloor(s);
 assert.equal(floor.tables.length,4);
 assert.equal(dinerSpot(floor.tableWork[3],s),'TABLE3');
 for(let table=0;table<4;table++)for(let seat=0;seat<2;seat++){
  const target=dinerSeatPoint(table,seat,s);
  assert.equal(dinerBlocked(target.x,target.y,s),false);
  const path=dinerGuestRoute(table,seat,s);
  for(let i=0;i<path.length-1;i++)for(let j=0;j<=20;j++){
   const x=path[i].x+(path[i+1].x-path[i].x)*j/20;
   const y=path[i].y+(path[i+1].y-path[i].y)*j/20;
   assert.equal(dinerBlocked(x,y,s),false,`blocked table ${table} seat ${seat}`);
  }
 }
 s.phase='service';assert.equal(createService(s,{walkable:true}),true);
 for(const o of s.service.orders)o.arrival=0;
 setServicePaused(s,false);tick(s,1);
 assert.equal(new Set(s.service.orders.filter(o=>o.tableId!==null).map(o=>o.tableId+':'+o.seatId)).size,8);
});

test('a carried real plate can be served at the new fourth-table target once',()=>{
 const s=ready();s.dining.tableCount=4;s.chapterProgress.stars=1;
 nextPhase(s,'service');createService(s,{walkable:true});setServicePaused(s,false);
 const o=s.service.orders[0];
 Object.assign(o,{status:'pickup',tableId:3,seatId:0,recipeId:'chicken_stew',
  craft:recipeCraftSnapshot(s,'chicken_stew'),pickupAt:0,arrival:0,patience:100,fit:80,quality:80});
 s.service.orders=[o];s.service.stations={WOK:null,POT:null};
 Object.assign(s.service.hero,dinerFloor(s).pass);
 for(let i=0;i<11;i++)advanceWalkableInteraction(s,.04);
 assert.equal(o.status,'carried');
 Object.assign(s.service.hero,dinerFloor(s).tableWork[3]);
 for(let i=0;i<14;i++)advanceWalkableInteraction(s,.04);
 assert.equal(o.status,'flying');
 tick(s,1);
 assert.equal(o.status,'eating');
 assert.equal(s.ledger.filter(e=>e.id==='sale-'+o.id).length,1);
});

test('single-file offline build includes first-star code and executable plain script',()=>{
 const html=readFileSync(new URL('../standalone.html',import.meta.url),'utf8');
 const code=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(code?.includes('function scoreFirstStar('));
 assert.ok(code.includes('function requestFirstStar('));
 const check=spawnSync(process.execPath,['--check','-'],{input:code,encoding:'utf8'});
 assert.equal(check.status,0,check.stderr);
});

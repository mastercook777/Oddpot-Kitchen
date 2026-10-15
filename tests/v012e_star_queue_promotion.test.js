import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 newGame,serviceDayPlan,createService,setServicePaused,tick,closeService,ensureCrew,
 crewPromotion,promoteCrew,resumeBreak,starWordOfMouthBoost,naturalStarAttendance,
 serviceArrivalWave,serviceArrivalSecond,QUEUE_PATIENCE_SECONDS,queueServiceReport
} from '../src/engine.js';

function prepared(seed=12345,starred=true,tables=4){
 const s=newGame(seed);s.cycle=3;s.day=1;s.phase='prep';s.reputation=24;s.coins=500;
 s.chapterProgress.stars=starred?1:0;s.dining.tableCount=tables;
 s.crew.helper.hired=true;s.crew.helper.onDuty=true;s.crew.waiter.hired=true;s.crew.waiter.onDuty=true;
 s.menu=['chicken_stew','mushroom_stir','veg_stir'];
 for(const id of Object.keys(s.inventory))s.inventory[id]=100;
 s.management={dayKey:'3-1',openingCoins:500,campaignId:'none',wageDebt:0};
 return s;
}
function fullShift(s){
 s.phase='service';assert.equal(createService(s,{walkable:true}),true);
 setServicePaused(s,false);
 for(let i=0;i<140&&!s.service.done;i++){
  if(s.service.breakAt)assert.equal(resumeBreak(s),true);
  tick(s,1);
 }
 assert.equal(s.service.done,true);
 return closeService(s);
}
test('v0.12-E organic demand belongs to star reputation, never to the table purchase',()=>{
 for(let k=0;k<80;k++){
  const a=prepared(3001+k,true,3),b=prepared(3001+k,true,4),old=prepared(3001+k,false,4);
  const pa=serviceDayPlan(a),pb=serviceDayPlan(b),pOld=serviceDayPlan(old);
  assert.deepEqual(pa.guests,pb.guests);
  assert.equal(pa.count,pb.count);assert.equal(pa.baseCount,pb.baseCount);
  assert.ok(pa.count>pOld.count);
  assert.ok(pa.baseCount<=19);assert.ok(pOld.baseCount<=14);
  assert.ok(pa.count<=19);
  assert.equal(pa.starred,true);assert.equal(pOld.starred,false);
 }
 assert.equal(starWordOfMouthBoost(0,'集市热闹夜',90),0);
 assert.equal(starWordOfMouthBoost(1,'集市热闹夜',10),5);
 assert.equal(naturalStarAttendance(15,0,'矿工收工',50),15);
 assert.equal(naturalStarAttendance(15,1,'矿工收工',50),19);
});
test('v0.12-E original arrival schedule preserved before first star; starred rush peaks in wave 2',()=>{
 for(let n=6;n<=14;n++)for(let i=0;i<n;i++){
  assert.equal(serviceArrivalWave(i,n,false),Math.min(2,Math.floor(i*3/n)));
 }
 assert.equal(serviceArrivalSecond(1,4,3,false),33);
 assert.equal(serviceArrivalSecond(1,4,3,true),25);
 assert.equal(serviceArrivalWave(10,17,true),1);
 assert.ok(QUEUE_PATIENCE_SECONDS>=15&&QUEUE_PATIENCE_SECONDS<=35);
});
test('v0.12-E real queue events come from full chairs and leave without sales',()=>{
 let sawQueue=false,sawLoss=false;
 for(let i=0;i<12;i++){
  const s=prepared(9000+i,true,3),r=fullShift(s);
  assert.equal(r.queue.peak,r.queuePeak);
  assert.equal(r.queue.waited,s.service.events.filter(x=>x.type==='queue_seated').length);
  assert.equal(r.queue.abandoned,s.service.events.filter(x=>x.type==='queue_left').length);
  assert.equal(r.queue.remaining,0);
  for(const e of s.service.events.filter(x=>x.type==='queue_left')){
   const o=s.service.orders.find(x=>x.id===e.order);
   assert.equal(o.tableId,null);
   assert.equal(o.status,'left');
   assert.equal(o.leftReason,'等位超时');
   assert.ok(e.seconds>=QUEUE_PATIENCE_SECONDS);
   assert.ok(!s.ledger.some(x=>x.id==='sale-'+o.id));
  }
  assert.ok(r.queue.abandoned<=r.unseated);
  sawQueue ||= r.queue.peak>0;sawLoss ||=r.queue.abandoned>0;
 }
 assert.equal(sawQueue,true);assert.equal(sawLoss,true);
});
test('v0.12-E daily report promotions really cost coins once, do not mutate ended shift',()=>{
 const s=prepared(2222,false,3);s.crew.helper.xp=8;s.crew.waiter.xp=8;
 const r=fullShift(s);
 assert.equal(s.phase,'report');assert.ok(r.growth);
 const salary=r.finance.wage,shiftLevel=s.service.crew.helper.level,before=s.coins;
 assert.equal(crewPromotion(s,'helper').ready,true);
 assert.equal(promoteCrew(s,'helper'),true);
 assert.equal(s.coins,before-28);assert.equal(s.crew.helper.level,2);
 assert.equal(s.service.crew.helper.level,shiftLevel);
 assert.equal(r.finance.wage,salary);
 assert.equal(promoteCrew(s,'helper'),false);
 assert.equal(s.ledger.filter(e=>e.type==='crew_promotion').length,1);
});
test('v0.12-E old running shift retains generated order plan on earning first star',()=>{
 const s=prepared(911,false,3);
 s.phase='service';assert.equal(createService(s,{walkable:true}),true);
 const old=s.service.orders.map(o=>[o.id,o.arrival,o.segment]),count=s.service.orders.length;
 s.chapterProgress.stars=1;s.dining.tableCount=4;
 assert.equal(s.service.orders.length,count);assert.deepEqual(s.service.orders.map(o=>[o.id,o.arrival,o.segment]),old);
 assert.equal(s.service.tableCount,3);
});
test('v0.12-E clear daily queue and actionable upgrade markup are wired to the real report',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const build=readFileSync(new URL('../scripts/build-standalone.py',import.meta.url),'utf8');
 assert.match(app,/reportPromotionBanner\(\)/);
 assert.match(app,/现在安排晋升/);
 assert.match(app,/\['prep','upgrade','report'\]/);
 assert.match(app,/r\.queue\.waited/);
 assert.match(app,/r\.queue\.abandoned/);
 assert.match(build,/restaurant_demand_v012e\.js/);
 assert.match(build,/restaurant_growth_v012e\.css/);
});

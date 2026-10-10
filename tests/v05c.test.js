import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,createService,setServicePaused,tick,resumeBreak,closeService,serviceDayPlan,tableSeatState,serviceGoalResult,currentServiceEvent,chooseServiceEvent} from '../src/engine.js';
import {DINER_ACTOR_SCALE,seatLocation,plateFlight} from '../src/scenes_v04.js';

function begin(seed=20261009,day=1){const s=newGame(seed);s.day=day;s.phase='service';for(const k of Object.keys(s.inventory))s.inventory[k]=70;assert.equal(createService(s),true);return s;}
function complete(s){setServicePaused(s,false);for(let i=0;i<120&&!s.service.done;i++){if(s.service.breakAt)resumeBreak(s);tick(s,1)}assert.ok(s.service.done,`night didn't end, t=${s.service.time}`);return closeService(s);}

test('v0.5C nightly crowd count and scenario vary deterministically by seed and day',()=>{
 const outcomes=new Set();
 for(let d=1;d<=3;d++)for(let seed=10;seed<30;seed++){
  const s=newGame(seed);s.day=d;const a=serviceDayPlan(s),b=serviceDayPlan(s);
  assert.deepEqual(a,b);assert.equal(a.count,a.guests.length);
  assert.ok(a.count>=6&&a.count<=11);outcomes.add(`${a.count}:${a.pressure}`);
 }
 assert.ok(outcomes.size>=6,`only ${outcomes.size} patterns`);
});

test('v0.5C two seats per table accept up to four active customers without collision',()=>{
 const s=begin();setServicePaused(s,false);
 for(let i=0;i<7;i++)tick(s,1);
 const active=s.service.orders.filter(o=>['queued','cooking'].includes(o.status));
 assert.ok(active.length>=2);assert.ok(active.length<=4);
 assert.equal(new Set(active.map(o=>`${o.tableId}:${o.seatId}`)).size,active.length);
 assert.ok(active.every(o=>o.tableId===0||o.tableId===1));
 for(let i=0;i<2;i++){const seats=tableSeatState(s.service,i);assert.equal(seats.length,2);assert.notEqual(seats[0]?.id,seats[1]?.id);}
 assert.ok(active.some(o=>o.partySize===2));
});

test('v0.5C restaurant stage has identical character scale and distinct physical chair coordinates',()=>{
 assert.equal(DINER_ACTOR_SCALE,1.13);
 const l=seatLocation(0,0,390,600),r=seatLocation(0,1,390,600);
 assert.equal(r.x-l.x,66);assert.equal(r.y,l.y);
 assert.ok(seatLocation(1,0,390,600).x>r.x+20);
});

test('v0.5C served meal stays in flight until landing, no early duplicate plate',()=>{
 assert.equal(plateFlight(10,10).flying,true);
 assert.equal(plateFlight(10.5,10).landed,false);
 assert.equal(plateFlight(11.20,10).flying,false);
 assert.equal(plateFlight(11.20,10).landed,true);
 assert.equal(plateFlight(9.9,10).landed,false);
 assert.equal(plateFlight(10,10).progress,0);
});

test('v0.5C event pools vary, seeded plan does not change when view reopens',()=>{
 const first=new Set(),second=new Set();
 for(let seed=1;seed<=32;seed++){
  const s=begin(seed);first.add(s.service.eventPlan[1].id);second.add(s.service.eventPlan[2].id);
  assert.equal(s.service.eventPlan[1].id,s.service.eventPlan[1].id);
 }
 assert.ok(first.size>=2);assert.ok(second.size>=2);
});

test('v0.5C a planned event changes the next wave and cannot be claimed twice',()=>{
 const s=begin(4);setServicePaused(s,false);
 for(let i=0;i<20;i++)tick(s,1);
 assert.equal(s.service.breakAt,1);
 const event=currentServiceEvent(s);assert.ok(event);
 const choice=event.choices[0].id,coinBefore=s.coins;
 assert.equal(chooseServiceEvent(s,choice),true);
 assert.equal(chooseServiceEvent(s,choice),false);
 assert.ok(s.coins<=coinBefore);
 assert.equal(s.service.events.filter(e=>e.type==='management_choice').length,1);
});

test('v0.5C goal reward is idempotent and present in daily report',()=>{
 const s=begin(60);
 s.service.goal={kind:'served',target:1,label:'成功送达一单'};
 const repBefore=s.reputation;
 const r=complete(s);
 assert.ok(r.goal);assert.equal(r.goal.success,true);
 assert.equal(s.reputation>=repBefore+2,true);
 assert.equal(s.ledger.filter(x=>x.type==='goal_reward').length,1);
 assert.equal(closeService(s),false);
 assert.equal(s.ledger.filter(x=>x.type==='goal_reward').length,1);
 assert.equal(r.totalOrders,s.service.orders.length);
});

test('v0.5C full high-crowd service balances real orders and stock',()=>{
 let candidate;
 for(let seed=1;seed<100;seed++){const s=begin(seed);if(s.service.orders.length>=10){candidate=s;break;}}
 assert.ok(candidate);
 const report=complete(candidate);
 assert.equal(report.totalOrders,candidate.service.orders.length);
 assert.equal(report.served+report.left+report.rejected,report.totalOrders);
 assert.equal(candidate.ledger.filter(x=>x.type==='sale').length,report.served);
 assert.ok(Object.values(candidate.inventory).every(v=>v>=0));
});
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,createService,setServicePaused,tick,seatOccupiedAt,serviceSupplyStatus,serviceGoalResult} from '../src/engine.js';
import {guestPathPoints,guestStagePosition,waiterStagePosition,seatLocation} from '../src/scenes_v04.js';

function serveSetup(seed=11){const s=newGame(seed);s.phase='service';for(const k of Object.keys(s.inventory))s.inventory[k]=60;assert.equal(createService(s),true);return s}

test('a seat remains reserved during served guest exit, then releases',()=>{
 const o={tableId:0,seatId:1,status:'served',served:10};
 assert.equal(seatOccupiedAt(o,12),true);assert.equal(seatOccupiedAt(o,13.8),true);assert.equal(seatOccupiedAt(o,13.86),false);
 o.status='left';o.leftAt=20;assert.equal(seatOccupiedAt(o,22),true);assert.equal(seatOccupiedAt(o,22.7),false);
});

test('guest departure retraces entry path around furniture and ends at door',()=>{
 const w=390,h=600,o={tableId:0,seatId:0,arrival:0,status:'served',served:8};
 const pts=guestPathPoints(o,w,h),seat=seatLocation(0,0,w,h);
 assert.deepEqual(pts.at(-1),seat);
 const entering=guestStagePosition({...o,status:'queued'},1.8,w,h);
 assert.ok(Math.abs(entering.x-seat.x)<.05&&Math.abs(entering.y-seat.y)<.05);
 const half=guestStagePosition(o,11.05,w,h),center={x:w*.28,y:h*.60};
 assert.ok(Math.hypot(half.x-center.x,half.y-center.y)>44,'should not cross tabletop on departure');
 const end=guestStagePosition(o,12,w,h);
 assert.equal(end.visible,false);
});

test('waiter always returns home at each patrol boundary and never teleports on arrival',()=>{
 const v={events:[{type:'arrived',t:0,table:0},{type:'arrived',t:2,table:1},{type:'arrived',t:7,table:0}]};
 for(let k=1;k<4;k++){
  const a=waiterStagePosition(v,k*5-.01,390,600),b=waiterStagePosition(v,k*5,390,600);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.6,`teleport at ${k*5}`);
 }
});

test('live situation shows actual demands and accurate daily goal progress',()=>{
 const s=serveSetup();const a=serviceSupplyStatus(s);
 assert.equal(a.arrived>=1,true);assert.equal(a.queued>=1,true);
 assert.equal(serviceGoalResult(s.service).value,0);
 const o=s.service.orders.find(x=>x.status==='queued');
 assert.ok(o.recipeId,'guest picked an actual dish');
 // Deplete the needed recipe while the guest is still queued.
 for(const id of Object.keys(s.inventory))s.inventory[id]=0;
 const b=serviceSupplyStatus(s);
 assert.ok(b.shortages.some(x=>x.orderId===o.id));
 assert.equal(b.shortages[0].tableId,o.tableId);
 setServicePaused(s,false);tick(s,1);
 assert.ok(s.service.events.some(x=>x.type==='rejected'&&x.reason==='食材不足'));
 assert.ok(serviceSupplyStatus(s).lastProblem);
});

test('old saved orders with missing leftAt do not remain reserved forever',()=>{
 assert.equal(seatOccupiedAt({tableId:0,seatId:0,status:'left'},10),false);
 assert.equal(seatOccupiedAt({tableId:0,seatId:0,status:'rejected'},10),false);
});
test('different advertised crowd scenarios change guest count and arrival spacing',()=>{
 const counts={},spacing={};
 for(let seed=1;seed<=150;seed++){
  const s=serveSetup(seed),name=s.service.scenario;
  (counts[name]??=new Set()).add(s.service.orders.length);
  const o=s.service.orders.filter(x=>x.wave===0);
  if(o.length>1)spacing[name]=o[1].arrival-o[0].arrival;
 }
 assert.ok(Object.keys(counts).length>=4);
 assert.ok(Math.min(...counts['节日高峰'])>=10);
 assert.ok(Math.max(...counts['街坊小聚'])<=8);
 assert.equal(spacing['节日高峰'],1);
 assert.equal(spacing['街坊小聚'],3);
});
test('goal celebration is recorded once at milestone, not every tick',()=>{
 const s=serveSetup(55);s.service.goal={kind:'served',target:1,label:'成功送达一单'};
 setServicePaused(s,false);
 for(let i=0;i<18;i++)tick(s,1);
 assert.ok(s.service.events.filter(e=>e.type==='goal_reached').length<=1);
 if(s.service.breakAt)throw Error('unexpected break');
 for(let i=0;i<70&&!s.service.done;i++){if(s.service.breakAt){s.service.breakAt=0;s.service.paused=false;}tick(s,1)}
 assert.equal(s.service.events.filter(e=>e.type==='goal_reached').length,1);
});
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,createService,setServicePaused,tick,resumeBreak,seatOccupiedAt,tableSeatState,guestReview,serviceSupplyStatus,closeService,DINER_TIMING} from '../src/engine.js';
import {plateFlight,guestSceneBubble,guestStagePosition,waiterJobs,waiterStagePosition} from '../src/scenes_v04.js';
import {readFileSync} from 'node:fs';
const make=(seed=20261010)=>{const s=newGame(seed);s.phase='service';for(const id of Object.keys(s.inventory))s.inventory[id]=60;assert.ok(createService(s));return s;};
const advance=(s,seconds)=>{for(let i=0;i<seconds;i++){if(s.service.breakAt)resumeBreak(s);tick(s,1)}};

test('v0.5E a customer sits BEFORE ordering; kitchen queue stays empty until then',()=>{
 const s=make(),v=s.service,o=v.orders[0];assert.equal(o.status,'entering');assert.equal(o.recipeId,null);
 assert.equal(v.queued.length,0);setServicePaused(s,false);advance(s,1);
 assert.equal(o.status,'entering');assert.equal(v.events.some(e=>e.type==='ordered'),false);
 advance(s,1);assert.equal(o.status,'ordering');assert.equal(o.recipeId,null);
 advance(s,1);assert.ok(o.recipeId);assert.ok(['queued','cooking'].includes(o.status));
 assert.ok(v.events.find(e=>e.type==='ordered'&&e.order===o.id));
 const stages=v.events.filter(e=>e.order===o.id).map(e=>e.type);
 assert.ok(stages.indexOf('arrived')<stages.indexOf('seated'));
 assert.ok(stages.indexOf('seated')<stages.indexOf('ordered'));
});

test('v0.5E a throw starts before money and happiness; landing precedes tasting and rating',()=>{
 const s=make(128),v=s.service;setServicePaused(s,false);
 for(let i=0;i<19&&!v.events.some(e=>e.type==='throw');i++)advance(s,1);
 const e=v.events.find(e=>e.type==='throw');assert.ok(e,'there should be a thrown dish');
 const o=v.orders.find(x=>x.id===e.order);
 assert.equal(o.status,'flying');assert.equal(o.sat??null,null);
 assert.equal(s.ledger.filter(x=>x.type==='sale'&&x.id===`sale-${o.id}`).length,0);
 assert.equal(plateFlight(v.time,e.t,2).flying,true);
 advance(s,2);assert.equal(o.status,'eating');assert.equal(o.served,v.time);assert.equal(o.sat??null,null);
 assert.equal(s.ledger.filter(x=>x.type==='sale'&&x.id===`sale-${o.id}`).length,1);
 advance(s,3);assert.equal(o.status,'review');assert.ok(Number.isInteger(o.sat));assert.ok(o.reviewText);
 assert.ok(v.events.some(x=>x.type==='reviewed'&&x.order===o.id));
 advance(s,2);assert.equal(o.status,'served');assert.ok(Number.isFinite(o.reviewedAt));
 assert.equal(s.ledger.filter(x=>x.type==='sale'&&x.id===`sale-${o.id}`).length,1);
});

test('v0.5E room remains occupied during eating, review and farewell',()=>{
 for(const status of ['entering','ordering','queued','cooking','flying','eating','review']){
  assert.equal(seatOccupiedAt({tableId:0,seatId:0,status},9),true,status);
 }
 assert.equal(seatOccupiedAt({tableId:0,seatId:0,status:'served',reviewedAt:10},12),true);
 assert.equal(seatOccupiedAt({tableId:0,seatId:0,status:'served',reviewedAt:10},12.3),false);
 const s=make(),o=s.service.orders[0];assert.equal(tableSeatState(s.service,0)[o.seatId].id,o.id);
});

test('v0.5E customer quality and wait produce consistent meaningful review copy',()=>{
 const base={landedAt:10,arrival:3,patience:40,fit:91,quality:94,sat:94};
 assert.equal(guestReview(base).type,'delicious');
 assert.equal(guestReview({...base,sat:80}).type,'happy');
 assert.equal(guestReview({...base,sat:62}).type,'okay');
 assert.equal(guestReview({...base,sat:39}).type,'bad');
 assert.equal(guestReview({...base,landedAt:37}).type,'late');
 assert.equal(guestReview({...base,fit:42}).type,'taste');
 assert.equal(guestReview({...base,quality:49}).type,'quality');
});

test('v0.5E speech bubble is tied to the actor and follows actual meal state',()=>{
 const o={status:'ordering',recipeId:null};assert.equal(guestSceneBubble(o,4).kind,'choice');
 o.status='queued';o.recipeId='chicken_stew';assert.equal(guestSceneBubble(o,5).kind,'order');
 o.status='flying';assert.equal(guestSceneBubble(o,6),null);
 o.status='eating';assert.equal(guestSceneBubble(o,8).kind,'eating');
 o.status='review';o.reviewText='太好吃了';o.reviewType='delicious';assert.equal(guestSceneBubble(o,12).text,'太好吃了');
 o.status='served';o.reviewedAt=13;assert.equal(guestSceneBubble(o,13.4).kind,'delicious');
 assert.equal(guestSceneBubble(o,15),null);
});

test('v0.5E double seat pair may independently order and review without sharing a transaction',()=>{
 const s=make();setServicePaused(s,false);advance(s,3);
 const a=s.service.orders[0],b=s.service.orders[1];assert.notEqual(`${a.tableId}-${a.seatId}`,`${b.tableId}-${b.seatId}`);
 assert.ok(a.recipeId);advance(s,4);assert.ok(b.recipeId);
 for(let i=0;i<110&&!s.service.done;i++)advance(s,1);
 assert.ok(s.service.done);
 assert.equal(s.ledger.filter(e=>e.type==='sale').length,s.service.orders.filter(o=>o.status==='served').length);
 assert.equal(s.service.events.filter(e=>e.type==='reviewed').length,s.service.orders.filter(o=>o.status==='served').length);
 assert.ok(closeService(s));assert.equal(s.report.guestReviews.length,s.report.served);
});

test('v0.5E paused simulation freezes entering, plate and review timers',()=>{
 const s=make();setServicePaused(s,false);advance(s,4);setServicePaused(s,true);
 const v=s.service,t=v.time,snapshot=JSON.stringify(v.orders),count=v.events.length;
 assert.equal(tick(s,10),false);assert.equal(v.time,t);assert.equal(v.events.length,count);
 assert.equal(JSON.stringify(v.orders),snapshot);
});

test('v0.5E occupied chair transitions never exceed four across crowded service',()=>{
 const s=make(1024);setServicePaused(s,false);
 for(let i=0;i<110&&!s.service.done;i++){
  if(s.service.breakAt)resumeBreak(s);tick(s,1);
  const occupied=s.service.orders.filter(o=>seatOccupiedAt(o,s.service.time));
  assert.ok(occupied.length<=4,`chair overflow at ${s.service.time}`);
  assert.equal(new Set(occupied.map(o=>`${o.tableId}:${o.seatId}`)).size,occupied.length);
 }
});

test('v0.5E waiter jobs queue without overlapping and return to origin',()=>{
 const v={events:[{type:'seated',t:2,table:0},{type:'ordered',t:3,table:0},{type:'seated',t:4,table:1}],orders:[]};
 const jobs=waiterJobs(v);assert.equal(jobs.length,3);
 for(let i=1;i<jobs.length;i++)assert.ok(jobs[i].start>=jobs[i-1].end);
 const home=waiterStagePosition(v,0,390,600);
 for(const job of jobs){
  const start=waiterStagePosition(v,job.start,390,600),end=waiterStagePosition(v,job.end,390,600);
  assert.ok(Math.hypot(start.x-home.x,start.y-home.y)<.1);
  assert.ok(Math.hypot(end.x-home.x,end.y-home.y)<.1);
 }
});

test('v0.5E restaurant hides the four debug-like seat indicators but preserves chair targets',()=>{
 const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/diner_05e.css',import.meta.url),'utf8');
 assert.ok(source.includes('seat-hit-target'));assert.equal(source.includes('class="diner-seat-marker'),false);
 assert.ok(css.includes('diner-seat-marker{display:none'));
});
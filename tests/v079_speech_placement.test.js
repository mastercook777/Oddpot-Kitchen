import test from 'node:test';
import assert from 'node:assert/strict';
import {placeRestaurantSpeech} from '../src/scenes_v04.js';

const actors=[
 {id:'helper',x:.145,y:.345},
 {id:'waiter',x:.50,y:.485},
 {id:'guest-left',x:.185,y:.653},
 {id:'guest-right',x:.815,y:.653}
];
const customers=[
 {id:'guest-left',tableId:0,seatId:0,text:'这盘料理真是好吃！',kind:'review',priority:9},
 {id:'guest-right',tableId:1,seatId:1,text:'老板！等太久了呀！',kind:'upset',priority:10}
];
const worker={id:'staff-helper-chat',staffRole:'helper',text:'小芽，下一盘准备好！',kind:'staff',priority:1};
const intersect=(a,b,margin=0)=>Math.max(0,Math.min(a.x+a.width+margin,b.x+b.width+margin)-Math.max(a.x-margin,b.x-margin))*
 Math.max(0,Math.min(a.y+a.height+margin,b.y+b.height+margin)-Math.max(a.y-margin,b.y-margin));

test('speech placements stay readable and inside the active restaurant at three mobile sizes',()=>{
 for(const [w,h] of [[320,568],[375,667],[390,844]]){
  const placements=placeRestaurantSpeech(customers,worker,actors,w,h);
  assert.equal(placements.size,3);
  for(const cue of [...customers,worker]){
   const p=placements.get(cue.id);
   assert.ok(p,cue.id+' missing');
   assert.ok(p.x>=7&&p.y>=h*.205-0.01,cue.id+' above bounds');
   assert.ok(p.x+p.width<=w-7.001+0.001,cue.id+' out of right bounds');
   assert.ok(p.y+p.height<=h*.875+.001,cue.id+' below scene');
   assert.ok(Number.isFinite(p.tipX)&&Number.isFinite(p.tipY),'tail must point toward actor');
  }
  const guestRects=customers.map(c=>placements.get(c.id));
  assert.equal(intersect(guestRects[0],guestRects[1],5),0,'two diners must not overlap');
  assert.equal(intersect(placements.get(worker.id),guestRects[0],5),0,'staff must avoid guest text');
  assert.equal(intersect(placements.get(worker.id),guestRects[1],5),0,'staff must avoid guest text');
 }
});

test('placement never changes inventory, orders or any service state',()=>{
 const copy=JSON.stringify({actors,customers,worker});
 const a=placeRestaurantSpeech(customers,worker,actors,375,667);
 const b=placeRestaurantSpeech(customers,worker,actors,375,667);
 assert.equal(JSON.stringify([...a]),JSON.stringify([...b]));
 assert.equal(JSON.stringify({actors,customers,worker}),copy);
});

test('real worker actor location anchors the same cue at the left or right kitchen',()=>{
 const left=placeRestaurantSpeech([],worker,actors,375,667).get(worker.id);
 const moved=actors.map(a=>a.id==='helper'?{...a,x:.855}:a);
 const right=placeRestaurantSpeech([],worker,moved,375,667).get(worker.id);
 assert.ok(Math.abs(left.tipX-right.tipX)>200);
 assert.equal(left.staff,true);
 assert.equal(right.staff,true);
});
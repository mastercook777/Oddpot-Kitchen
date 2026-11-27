import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceWorkbenchPresentation,researchFrame} from '../src/three_y4b_research.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const initial={type:'GRILL',t:0,lane:null,turn:0,items:[],p:1};
function advance(p,f,end){for(let t=p.now+16;t<=end;t+=16)p=advanceWorkbenchPresentation(p,f,t);return p}
test('R2 empty skewer, insertion, quick sequential additions and lifted lane motion are visual only',()=>{
 let p=advanceWorkbenchPresentation(null,initial,0);close(p.z,1.35);assert.equal(p.items.length,0);
 const first={...initial,items:[{id:'beef',x:0}]};p=advanceWorkbenchPresentation(p,first,16);assert.ok(p.items[0].x<-.9);
 p=advance(p,first,432);close(p.items[0].x,0);
 const second={...first,items:[{id:'beef',x:-.31},{id:'garlic',x:.31}]};p=advanceWorkbenchPresentation(p,second,448);assert.ok(p.items[1].x<-.9);close(p.items[0].x,0);
 const third={...second,items:[{id:'beef',x:-.62},{id:'garlic',x:0},{id:'onion',x:.62}]};p=advanceWorkbenchPresentation(p,third,464);assert.equal(p.items.length,3);
 p=advance(p,third,880);third.items.forEach((v,i)=>close(p.items[i].x,v.x));
 const cooking={...third,lane:'middle'},snapshot=JSON.stringify(cooking);
 p=advanceWorkbenchPresentation(p,cooking,896);close(p.z,1.35);
 p=advance(p,cooking,1120);assert.ok(p.z>0&&p.z<1.35&&p.lift>.2);
 p=advance(p,cooking,1504);close(p.z,0);close(p.lift,0);
 p=advanceWorkbenchPresentation(p,{...cooking,turn:Math.PI/2,t:2.2},1520);assert.ok(p.lift>.19);
 const stalled=advanceWorkbenchPresentation(p,{...cooking,t:2.2},10000);assert.ok(stalled.clock-p.clock<=.060001);
 assert.equal(advanceWorkbenchPresentation(stalled,cooking,10016).clock,0);
 assert.equal(JSON.stringify(cooking),snapshot);
});
test('R2 all other cookware have separate drop and action trajectories; no phantom ingredients',()=>{
 for(const type of ['WOK','POT','STEAM']){
  const f={type,t:0,items:[{id:'beef',x:0}],p:1};let p=advanceWorkbenchPresentation(null,f,0);
  assert.ok(p.items[0].y>1);p=advance(p,f,624);close(p.items[0].y,0);
  const action=type==='WOK'?'toss':type==='POT'?'gentle':'vent';
  p=advanceWorkbenchPresentation(p,{...f,action,p:.5,t:1},640);
  assert.equal(p.items.length,1);
  if(type==='WOK')assert.ok(p.items[0].y>.9);
  else if(type==='POT')assert.ok(Math.abs(p.items[0].z)>.1);
  else close(p.items[0].y,0);
 }
});
test('R2 underlying automatic turn still follows the real grill clock',()=>{
 const cook={mode:'v014c-grill',cbTiming:true,elapsed:2.325,lane:'middle',skewer:['beef','garlic'],actions:[]};
 const prev={items:[{id:'beef',frontProgress:50,backProgress:0},{id:'garlic',frontProgress:100,backProgress:20}]};
 const f=researchFrame(cook,prev);
 assert.ok(f.turn>0&&f.turn<Math.PI);assert.equal(f.items.length,2);
 assert.equal(cook.elapsed,2.325);assert.equal(f.lane,'middle');
});

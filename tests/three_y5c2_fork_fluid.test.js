import test from 'node:test';import assert from 'node:assert/strict';
import {forkTwoHandPose,solveArm} from '../src/three_y3d_pose.js';
import {fluidRibbonSamples} from '../src/three_y5c2_fluid_fx.js';
import {fieldFx3D} from '../src/three_y3c_fx.js';
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
test('rigid fork grips stay on shaft, within arm reach, with fixed limb lengths',()=>{
 for(const moving of [true,false])for(let i=0;i<=100;i++)for(const kind of ['idle','thrust','flame']){
  const f={weapon:{type:'GRILL'},moving};if(kind==='thrust')f.attackFx={forkThrust:true,duration:.30,ttl:.30*(1-i/101)};if(kind==='flame'){f.skillOrigin={type:'GRILL',duration:.85};f.skillFx=.85*(1-i/101);}
  const before=JSON.stringify(f),q=forkTwoHandPose(f,i/60);
  assert.ok(Math.abs(distance(q.right,q.left)-.30)<1e-9);
  for(const [j,target] of [q.right,q.left].entries()){const s=[j?.265:-.265,.685,0],a=solveArm(s,target,[j?1:-1,-.5,-.2]);assert.ok(distance(target,a.hand)<1e-8);assert.ok(Math.abs(distance(s,a.elbow)-.15)<1e-8);}
  assert.equal(JSON.stringify(f),before);
 }
});
test('fork diagonal chest pose, chamber, forward thrust and recovery',()=>{
 const q=p=>forkTwoHandPose({weapon:{type:'GRILL'},attackFx:{forkThrust:true,ttl:.30*(1-p),duration:.30}});
 assert.ok(q(0).direction[1]>.35);assert.ok(q(.38).right[2]>q(.14).right[2]&&q(.38).left[2]>q(.14).left[2]);assert.ok(q(.99).left[2]<q(.38).left[2]);
});
test('fluid ribbons bounded, finite, read only across all phases and four headings',()=>{
 for(const kind of ['flame','potPressure','potErupt','thrust'])for(let i=0;i<=100;i++)for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){
  const d={kind,x:4,y:5,r:2.7,phase:i/100,alpha:1-i/100,dx:dx*2.1,dy:dy*2.1},before=JSON.stringify(d),a=fluidRibbonSamples(d,i/60);
  assert.ok(a.length>0&&a.length<=18&&a.every(v=>Object.values(v).every(Number.isFinite)&&v.opacity>=0&&v.opacity<=1&&v.width>0&&v.length>0));assert.equal(JSON.stringify(d),before);
 }
});
test('new pot eruption does not repeat generic burst ring',()=>{
 const f={weapon:{type:'POT'},pos:{x:4,y:5},skillOrigin:{type:'POT',x:4,y:5,delay:.38,duration:.86,radius:1.1},skillFx:.4,impactFx:[{kind:'burst',x:4,y:5,strong:true,ttl:.4,duration:.48}]};
 const a=fieldFx3D(f);assert.ok(a.some(d=>d.kind==='potErupt')&&!a.some(d=>d.kind==='wave'));
});

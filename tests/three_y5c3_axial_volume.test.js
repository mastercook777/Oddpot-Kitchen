import test from 'node:test';import assert from 'node:assert/strict';
import {forkAxialFrame,forkTwoHandPose,solveArm} from '../src/three_y3d_pose.js';
import {fireVolumePlan} from '../src/three_y5c3_fire_volume.js';
const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),len=a=>Math.hypot(...a);
test('Y5c3 shaft stroke stays on the exact horizontal axis, both grips remain reachable',()=>{
 const frame=forkAxialFrame();
 for(const moving of [false,true])for(let i=0;i<=200;i++)for(const type of ['idle','thrust','flame']){
  const f={weapon:{type:'GRILL'},moving};if(type==='thrust')f.attackFx={forkThrust:true,duration:.30,ttl:.30*(1-i/201)};if(type==='flame'){f.skillOrigin={type:'GRILL',duration:.85};f.skillFx=.85*(1-i/201);}
  const m=forkTwoHandPose(f,i/60);assert.ok(Math.abs(len(sub(m.left,m.right))-.30)<1e-9);
  for(const [j,target] of [m.right,m.left].entries()){const s=[j?.265:-.265,.685,0],q=solveArm(s,target,[j?1:-1,-.5,-.2]);assert.ok(len(sub(target,q.hand))<1e-8);}
  if(m.axialLocked){assert.ok(len(sub(m.direction,frame.direction))<1e-8&&m.lean===0&&m.yaw===frame.yaw);const delta=sub(m.right,frame.center),along=dot(delta,frame.direction);assert.ok(len(sub(delta,frame.direction.map(v=>v*along)))<1e-8);}
 }
 const q=p=>forkTwoHandPose({weapon:{type:'GRILL'},attackFx:{forkThrust:true,duration:.3,ttl:.3*(1-p)}});
 const travel=sub(q(.48).right,q(.14).right);assert.ok(dot(travel,frame.direction)>.20);assert.ok(Math.abs(travel[1])<1e-10);assert.ok(len(sub(q(.85).right,q(.14).right))<1e-8);
});
test('Y5c3 volume advances from nozzle to original range in sixteen directions',()=>{
 const sine=Math.sin(Math.PI*55/180);
 for(let i=0;i<16;i++)for(let j=0;j<=100;j++){const a=i*Math.PI/8,d={x:5,y:5,dx:Math.cos(a),dy:Math.sin(a),r:2.7,phase:j/100},nozzle={x:5+d.dx*.8,y:.46,z:(5+d.dy*.8)/sine},v=fireVolumePlan(d,sine,nozzle);assert.ok([...v.axis,v.length,v.width,v.height,v.head,v.opacity].every(Number.isFinite));assert.ok(Math.abs(v.length-1.9*Math.hypot(d.dx,d.dy/sine))<1e-8);assert.ok(v.opacity>=0&&v.opacity<=1&&v.head>=0&&v.head<=1);}
});

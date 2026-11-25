import test from 'node:test';import assert from 'node:assert/strict';
import {gaitPose,meleePose,potIdlePose,otherToolPose,skillMotion,solveArm} from '../src/three_y3d_pose.js';
import {fieldFx3D} from '../src/three_y3c_fx.js';
import {newGame,enterField} from '../src/engine.js';
import {startActionField,useFieldSkill,advancePotBurst} from '../src/field_v04.js';
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
test('Y5c gait changes both hands in opposite phase, preserves IK segment lengths and idle stillness',()=>{
 const f={moving:true},a=gaitPose(f,Math.PI/22),b=gaitPose(f,3*Math.PI/22);
 assert.ok(a.rightZ>0&&a.leftZ<0&&b.rightZ<0&&b.leftZ>0);
 assert.equal(gaitPose({},1).rightZ,0);
 for(let i=0;i<80;i++){const t=i/60;for(const [type,targets] of [['WOK',m=>[m.hand,m.shield]],['POT',m=>[m.hand,m.pot]],['GRILL',m=>[m.right,m.left]],['STEAM',m=>[m.right,m.left]]]){
 const f={moving:true,weapon:{type}},before=JSON.stringify(f),m=type==='WOK'?meleePose(f,t):type==='POT'?potIdlePose(f,t):otherToolPose(f,t);
 for(const [j,target] of targets(m).entries()){const s=[j?.265:-.265,.685,0],q=solveArm(s,target,[j?1:-1,-.2,-.3]);assert.ok(Math.abs(distance(s,q.elbow)-.15)<1e-8);assert.ok(Math.abs(distance(q.elbow,q.hand)-Math.hypot(.125,.015))<1e-8);}
 assert.equal(JSON.stringify(f),before);
 }}
});
function fixture(type,level=1){
 const s=newGame(77);s.phase='field';assert.ok(enterField(s,'safe'));assert.ok(startActionField(s));const f=s.field;
 Object.assign(f,{pos:{x:5,y:7.5},x:5,y:7.5,nodes:[],obstacles:[],hazards:[],enemies:[],attackCd:999,damageCd:999,weapon:{...f.weapon,type,level}});return {s,f};
}
function enemy(f,x,y){const e={id:'y5c-'+f.enemies.length,kind:'chicken',x,y,hp:8,maxHp:8,cooldown:999,warning:0};f.enemies.push(e);return e;}
test('Y5c whirl hits once at cast, retains guard and fixed origin with native spin',()=>{
 const {s,f}=fixture('WOK'),a=enemy(f,5.9,7.5),b=enemy(f,4,7.5),c=enemy(f,7.2,7.5);assert.ok(useFieldSkill(s));assert.equal(a.hp,6);assert.equal(b.hp,6);assert.equal(c.hp,8);assert.equal(f.guardTime,.45);assert.equal(f.skillCd,6.5);assert.equal(useFieldSkill(s),false);
 f.skillFx=.24;assert.ok(Math.abs(skillMotion(f).spin-Math.PI)<1e-8);f.pos.x+=1;const d=fieldFx3D(f).find(d=>d.kind==='whirl');assert.equal(d.x,5);assert.equal(d.r,1.85);assert.equal(a.hp,6);
});
test('Y5c soup locks real target, respects cover and escape, consumes no projectile and resolves exactly once',()=>{
 for(const level of [1,2]){const {s,f}=fixture('POT',level),e=enemy(f,6.8,7.5),blocked=enemy(f,7.8,7.5),escape=enemy(f,6.8,8.3);f.obstacles=[{x:7,y:7}];assert.ok(useFieldSkill(s));const b=f.potBurst,delay=level===1?.38:.30;assert.equal(b.delay,delay);assert.equal(b.radius,level===1?1.1:1.25);assert.equal(f.playerProjectiles.length,0);assert.equal(e.hp,8);assert.equal(fieldFx3D(f).find(d=>d.kind==='potPressure').x,6.8);escape.y=10;assert.equal(advancePotBurst(s,delay-.01),false);assert.equal(e.hp,8);assert.equal(advancePotBurst(s,.01),true);assert.equal(e.hp,6);assert.equal(blocked.hp,8);assert.equal(escape.hp,8);assert.equal(e.slowTime,.8);assert.equal(advancePotBurst(s,1),false);assert.equal(e.hp,6);f.skillFx=.3;assert.ok(fieldFx3D(f).some(d=>d.kind==='potErupt'));assert.equal(useFieldSkill(s),false);}
 const {s,f}=fixture('POT');assert.equal(useFieldSkill(s),false);assert.equal(f.skillCd,0);
});

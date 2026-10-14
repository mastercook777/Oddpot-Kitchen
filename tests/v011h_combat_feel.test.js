import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,enterField,settleField} from '../src/engine.js';
import {startActionField,stepActionField,useFieldSkill} from '../src/field_v04.js';
import {beginFieldHit,stepFieldHit,fieldHitPose,queueFieldImpact} from '../src/field_hit_response_v011h.js';
import {drawFieldHitEffects,drawFieldSkillWave,drawFieldSwipe} from '../src/field_effects_v011e2.js';
const blocked=(f,p,r=.18)=>p.x<r||p.y<r||p.x>f.worldW-r||p.y>f.worldH-r||f.obstacles.some(o=>Math.abs(p.x-o.x-.5)<.4+r&&Math.abs(p.y-o.y-.5)<.4+r);
function setup(type='WOK'){
 const s=newGame(77);s.phase='field';enterField(s,'safe');startActionField(s);
 const f=s.field;Object.assign(f,{pos:{x:5,y:7.5},x:5,y:7.5,nodes:[],obstacles:[],hazards:[],enemies:[],damageCd:999,attackCd:999});f.weapon.type=type;
 return {s,f};
}
function enemy(f,kind='chicken',x=5.9,y=7.5){const e={id:'test-'+f.enemies.length,kind,x,y,hp:8,maxHp:8,cooldown:999,warning:0,phase:0};f.enemies.push(e);return e;}
const advance=(s,time,dt=.01)=>{for(let t=0;t<time-1e-9;t+=dt)stepActionField(s,0,0,Math.min(dt,time-t));};
test('melee hit is immediate, recoil is continuous and player movement never freezes',()=>{
 const {s,f}=setup(),e=enemy(f);f.attackCd=0;stepActionField(s,0,0,.001);
 assert.equal(e.hp,7);const x=e.x;assert.ok(e.hitResponse);assert.equal(e.hitResponse.distance,.22);
 stepActionField(s,1,0,.02);assert.equal(e.x,x);assert.ok(f.pos.x>5);
 stepActionField(s,1,0,.03);assert.ok(e.x>x&&e.x<x+.22);assert.equal(f.combatJolt,0);
 advance(s,.12);assert.ok(e.x<=x+.22001);assert.equal(e.hp,7);
});
test('normalized impulses have exact distance, frame-size independence and no zero-dt motion',()=>{
 for(const direction of [[1,0],[1,1],[0,-1]]){
  const positions=[];
  for(const dt of [.01,.04,.06]){
   const {f}=setup(),e=enemy(f,'chicken',6,8);beginFieldHit(f,e,'wok',{x:6-direction[0],y:8-direction[1]});
   const at={x:e.x,y:e.y};stepFieldHit(f,e,0,blocked);assert.equal(e.x,at.x);assert.equal(e.y,at.y);
   for(let t=0;t<.4;t+=dt)stepFieldHit(f,e,dt,blocked);
   assert.ok(Math.abs(Math.hypot(e.x-at.x,e.y-at.y)-.22)<1e-8);positions.push([e.x,e.y]);
  }
  for(const p of positions)assert.ok(Math.hypot(p[0]-positions[0][0],p[1]-positions[0][1])<1e-8);
 }
});
test('heavy archetypes yield less and boss retains position, warning and active attack',()=>{
 const {s,f}=setup(),light=enemy(f),heavy=enemy(f,'boar',5.9,7.8),boss=enemy(f,'boss_spore',6,7.5);
 Object.assign(boss,{isBoss:true,warning:.8,bossAttack:{kind:'fan',aim:{...f.pos}},windupTotal:.9});
 const at={x:boss.x,y:boss.y};useFieldSkill(s);
 assert.equal(light.hitResponse.distance,.55);assert.equal(heavy.hitResponse.distance,.55*.55);
 assert.equal(boss.hitResponse.distance,0);assert.equal(boss.warning,.8);assert.ok(boss.bossAttack);
 for(let i=0;i<20;i++)stepFieldHit(f,boss,.02,blocked);
 assert.equal(boss.x,at.x);assert.equal(boss.y,at.y);
});
test('swept impulse stops before rock face and world border for both skills and both axes',()=>{
 for(const kind of ['wok','wok_skill','pot','pot_skill'])for(const axis of ['x','y']){
  const {f}=setup(),e=enemy(f,'chicken',5.9,5.9);f.obstacles=[axis==='x'?{x:6,y:5}:{x:5,y:6}];
  const origin={x:e.x-(axis==='x'?1:0),y:e.y-(axis==='y'?1:0)};beginFieldHit(f,e,kind,origin);
  for(let i=0;i<20;i++){stepFieldHit(f,e,.06,blocked);assert.ok(!blocked(f,e));}
  assert.ok(e[axis]<6);
  f.obstacles=[];e.x=f.worldW-.19;e.y=f.worldH-.19;beginFieldHit(f,e,kind,{x:e.x-1,y:e.y-1});
  for(let i=0;i<20;i++){stepFieldHit(f,e,.06,blocked);assert.ok(!blocked(f,e));}
 }
});
test('normal hit pauses then resumes a locked tell; WOK skill cancels ordinary rush',()=>{
 const {s,f}=setup(),e=enemy(f);e.warning=.6;e.windupTotal=.68;e.aim={...f.pos};e.attackOrigin={x:e.x,y:e.y};
 f.attackCd=0;stepActionField(s,0,0,.01);const warning=e.warning;
 advance(s,.15);assert.equal(e.warning,warning);advance(s,.07);assert.ok(e.warning<warning&&e.warning>0);
 e.brainVersion='0.11-B2';e.ecologyRush={end:{...f.pos}};e.ecologyAttack={origin:{x:e.x,y:e.y},end:{...f.pos}};
 useFieldSkill(s);assert.equal(e.warning,0);assert.equal(e.ecologyRush,null);assert.equal(e.ecologyAttack,null);
});
test('WOK target selection, fan cleave and active wave cannot hit through actual rock',()=>{
 for(const skill of [false,true]){
  const {s,f}=setup(),e=enemy(f,'chicken',6.1,7.5);f.obstacles=[{x:5,y:7}];
  if(skill)useFieldSkill(s);else {f.attackCd=0;stepActionField(s,0,0,.01);}
  assert.equal(e.hp,8);assert.equal(f.impactFx.length,0);assert.equal(f.combatJolt,0);
 }
});
test('POT empowered shot lands once at true point, distinguishes blast and spares enemies behind wall',()=>{
 const {s,f}=setup('POT'),e=enemy(f,'pepper',6.8,7.5),behind=enemy(f,'pepper',7.8,7.5);f.obstacles=[{x:7,y:7}];
 assert.equal(useFieldSkill(s),true);const p=f.playerProjectiles[0];assert.equal(p.empowered,true);const landing={x:p.targetX,y:p.targetY};
 assert.equal(e.hp,8);advance(s,.39);assert.equal(e.hp,6);assert.equal(behind.hp,8);assert.equal(f.playerProjectiles.length,0);
 const burst=f.impactFx.find(fx=>fx.kind==='burst');assert.ok(burst.strong);assert.equal(burst.x,landing.x);assert.equal(burst.y,landing.y);
 assert.ok(e.slowTime>0);advance(s,.2);assert.equal(e.hp,6);
});
test('POT normal bomb and shield wave have distinct effect kinds; cast origin stays fixed',()=>{
 const {s,f}=setup('POT');enemy(f,'pepper',6.8,7.5);f.attackCd=0;stepActionField(s,0,0,.01);assert.equal(f.playerProjectiles[0].empowered,false);
 advance(s,.39);assert.equal(f.impactFx.find(fx=>fx.kind==='burst').strong,false);
 const wok=setup();assert.equal(useFieldSkill(wok.s),true);const origin={...wok.f.skillOrigin};stepActionField(wok.s,1,0,.04);
 assert.deepEqual(wok.f.skillOrigin,origin);assert.notEqual(wok.f.pos.x,origin.x);assert.equal(wok.f.combatJolt,0);assert.equal(wok.f.impactFx.length,0);
});
test('cleave still hits at most two; fatal hit never displaces drop and settlement remains unique',()=>{
 const {s,f}=setup();for(let i=0;i<3;i++)enemy(f,'chicken',5.7+i*.1,7.5);f.enemies.forEach(e=>e.hp=1);f.attackCd=0;
 const inventory=s.inventory.chicken,coins=s.coins;stepActionField(s,0,0,.01);
 assert.equal(f.enemies.filter(e=>e.hp===0).length,2);assert.equal(f.nodes.length,2);
 const drops=f.nodes.map(n=>({x:n.x,y:n.y}));advance(s,.4);assert.deepEqual(f.nodes.map(n=>({x:n.x,y:n.y})),drops);
 assert.equal(s.coins,coins);assert.equal(s.inventory.chicken,inventory);
 assert.ok(settleField(s));assert.equal(settleField(s),false);
});
test('active hit response survives JSON reload exactly; old snapshot defaults are safe',()=>{
 const {s,f}=setup();enemy(f);f.attackCd=0;stepActionField(s,0,0,.01);stepActionField(s,0,0,.05);
 const loaded=JSON.parse(JSON.stringify(s));for(let i=0;i<15;i++){stepActionField(s,1,0,.02);stepActionField(loaded,1,0,.02);}assert.deepEqual(s,loaded);
 delete loaded.field.impactFx;delete loaded.field.combatJolt;delete loaded.field.skillOrigin;for(const e of loaded.field.enemies)delete e.hitResponse;
 assert.doesNotThrow(()=>stepActionField(loaded,0,0,.04));
});
test('event overlay rejects active skill without consuming cooldown',()=>{
 const {s,f}=setup();f.activeEvent='test-event';assert.equal(useFieldSkill(s),false);assert.equal(f.skillCd,0);
});
test('effects are bounded, smooth and pure when drawn repeatedly',()=>{
 const {s,f}=setup();const e=enemy(f);useFieldSkill(s);f.attackFx={ttl:.2,duration:.33,dx:1,dy:0};
 for(let i=0;i<100;i++)queueFieldImpact(f,{kind:'burst',x:6,y:7,radius:1.1,strong:true,ttl:.4,duration:.48});assert.equal(f.impactFx.length,24);
 const before=JSON.stringify(s),calls=[];const c=new Proxy({},{get:(_,k)=>(...a)=>calls.push([k,...a]),set:()=>true});
 for(let i=0;i<2;i++){drawFieldHitEffects(c,f);drawFieldSkillWave(c,f);drawFieldSwipe(c,f);fieldHitPose(e);}
 assert.equal(JSON.stringify(s),before);assert.ok(calls.some(c=>c[0]==='quadraticCurveTo'));assert.ok(!calls.some(c=>c[0]==='fillRect'));
});

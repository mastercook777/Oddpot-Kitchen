import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame,nextPhase,enterField} from '../src/engine.js';
import {startActionField,stepActionField} from '../src/field_v04.js';
import {meleeProfile,meleeAttackWouldHit,meleeWindupProgress} from '../src/field_combat_feedback_v084.js';

const scenario=(kind='boar',weapon=1)=>{
 const s=newGame(142);
 nextPhase(s,'field');s.selectedWeaponSlot=weapon;
 assert.equal(enterField(s,'risk'),true);
 assert.equal(startActionField(s),true);
 const f=s.field;f.enemies=[];f.hazards=[];
 f.pos={x:4.5,y:5};f.x=4.5;f.y=5;f.attackCd=120;
 const e={id:'test-'+kind,kind,x:4.5,y:4.12,hp:8,maxHp:8,cooldown:0,warning:0,phase:0};
 f.enemies.push(e);return {s,f,e};
};
const progress=(s,time)=>{for(let t=0;t<time;t+=.04)stepActionField(s,0,0,Math.min(.04,time-t));};

test('three melee archetypes announce their own anticipation timing and reach',()=>{
 for(const kind of ['chicken','boar','steam_crab']){
  const p=meleeProfile(kind);
  assert.ok(p.windup>=.65,p.windup+' should be visible on mobile');
  assert.ok(p.reach>=1&&p.dash>0);
 }
 assert.ok(meleeProfile('boar').windup>meleeProfile('chicken').windup);
 assert.equal(meleeProfile('pepper'),null);
});
test('enemy freezes during telegraph, locks attack angle and can be sidestepped',()=>{
 const {s,f,e}=scenario();
 stepActionField(s,0,0,.04);
 assert.equal(f.hp,3,'windup cannot damage immediately');
 assert.ok(e.warning>.65&&e.windupTotal===meleeProfile('boar').windup);
 assert.ok(e.aim&&e.attackOrigin);
 assert.ok(meleeWindupProgress(e)<.2);
 const at={x:e.x,y:e.y};
 // Run one quarter of the tell and ensure the enemy does not home onto us.
 progress(s,.22);
 assert.equal(e.x,at.x);assert.equal(e.y,at.y);
 f.pos.x+=2;f.x=f.pos.x;
 progress(s,1.05);
 assert.equal(f.hp,3,'locked cone is avoidable');
 assert.ok(e.strikeFx||e.lungeFx>=0);
});
test('standing in attack cone produces a single HP event with hit flash and recoil',()=>{
 const {s,f,e}=scenario('boar',1);
 stepActionField(s,0,0,.04);
 const originalY=f.pos.y;
 progress(s,.98);
 assert.equal(f.hp,2);
 assert.ok(f.hitFlash>0,'real damage should trigger visual flash');
 assert.ok(f.hitShake>0,'real damage should jolt the camera');
 assert.ok(f.hurtFx>0);
 assert.ok(f.popFx.some(x=>x.text==='♥ -1'),'show explicit HP loss');
 assert.ok(f.pos.y>originalY,'single impact knocks the player away from the attacker');
 assert.ok(e.strikeFx?.ttl>0);
 progress(s,.38);assert.equal(f.hp,2,'no repeated hits during one swing');
});
test('WOK passive shield still intercepts a telegraphed frontal blow without red injury flash',()=>{
 const {s,f}=scenario('chicken',0);
 f.facing={x:0,y:-1};
 stepActionField(s,0,0,.04);
 progress(s,.80);
 assert.equal(f.hp,3);
 assert.equal(f.shieldCharge,false);
 assert.ok(f.shieldFlash>0);
 assert.equal(f.hitFlash,0,'successful block is not damage');
});
test('angle-hit rule is deterministic and uses locked target instead of current player facing',()=>{
 const e={kind:'boar',x:2,y:2,attackOrigin:{x:2,y:2},aim:{x:4,y:2}};
 assert.equal(meleeAttackWouldHit(e,{x:3,y:2}),true);
 assert.equal(meleeAttackWouldHit(e,{x:2,y:3}),false);
 assert.equal(meleeAttackWouldHit(e,{x:4,y:2}),false,'outside reach');
});
test('rendering uses telegraphed fan, timed strike and true hit vignette',()=>{
 const code=readFileSync(new URL('../src/scenes_v04.js',import.meta.url),'utf8');
 assert.match(code,/drawMeleeWarnings\(c,f\)/);
 assert.match(code,/meleeWindupProgress/);
 assert.match(code,/fx\.ttl/);
 assert.match(code,/f\.hitFlash/);
 assert.match(code,/createRadialGradient/);
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/hp\.classList\.toggle\('taking-hit'/);
});

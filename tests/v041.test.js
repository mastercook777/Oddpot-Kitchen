import test from 'node:test';
import assert from 'node:assert/strict';
import {joystickVector} from '../src/controls_v041.js';
import {pixelActor,pixelEnemy,pixelImpact} from '../src/pixels_v041.js';
import {newGame,enterField,nextPhase,createService,tick,currentServiceEvent,chooseServiceEvent} from '../src/engine.js';
import {startActionField,stepActionField,useFieldSkill} from '../src/field_v04.js';

function explore(){const s=newGame();nextPhase(s,'field');assert.equal(enterField(s,'risk'),true);assert.equal(startActionField(s),true);return s;}
test('floating joystick starts from any touch point, deadzone and clamped magnitude',()=>{
 assert.deepEqual(joystickVector(180,400,183,402),{x:0,y:0,knobX:0,knobY:0});
 const a=joystickVector(180,400,234,400);assert.ok(a.x>.99);assert.equal(a.y,0);assert.equal(a.knobX,54);
 const b=joystickVector(26,270,-200,270);assert.equal(b.x,-1);assert.equal(b.knobX,-54);
 const c=joystickVector(200,240,218,264);assert.ok(c.x>0&&c.y>0&&Math.hypot(c.x,c.y)<1);
});
test('auto-attack creates visible swing and enemy hit reaction; effects expire',()=>{
 const s=explore(),f=s.field;
 const enemy=f.enemies[0];enemy.x=f.pos.x+.6;enemy.y=f.pos.y;enemy.cooldown=9;
 stepActionField(s,0,0,.03);
 assert.equal(enemy.hp,2);assert.ok(f.attackFx?.ttl>0);assert.ok(enemy.hurtFx>0);assert.ok(f.popFx.length);
 for(let i=0;i<12;i++)stepActionField(s,0,0,.03);
 assert.equal(f.attackFx,null);
});
test('active pan skill drives a separate broad visual shockwave and cooldown',()=>{
 const s=explore(),f=s.field;
 assert.equal(useFieldSkill(s),true);assert.ok(f.skillFx>0);assert.ok(f.skillCd>0);
 assert.equal(useFieldSkill(s),false);
 for(let i=0;i<16;i++)stepActionField(s,0,0,.03);
 assert.equal(f.skillFx,0);
});
test('hit warning and hero hurt state are set by real damage not visual timer',()=>{
 const s=explore(),f=s.field;const e=f.enemies[0];e.x=f.pos.x+.4;e.y=f.pos.y;e.warning=.02;e.cooldown=5;f.attackCd=8;
 stepActionField(s,0,0,.05);
 assert.equal(f.hp,2);assert.ok(f.hurtFx>0);
});
test('pixel actors and effects render with a minimal canvas without DOM/image files',()=>{
 const calls=[];const c={fillRect(...a){calls.push(a)},save(){},restore(){},translate(){},scale(){},rotate(){},set fillStyle(_) {}};
 pixelActor(c,'chef',32,64,2,{walk:1,attack:true,face:-1});
 pixelActor(c,'critic',32,64,2,{});
 pixelEnemy(c,'chicken',16,16,2,{walk:3});pixelEnemy(c,'pepper',16,16,2,{});
 pixelImpact(c,0,0,10);
 assert.ok(calls.length>40);
});
test('management outcome gets a persistent, explicitly named visual consequence',()=>{
 const s=newGame();s.phase='service';assert.equal(createService(s),true);s.service.paused=false;
 while(!s.service.breakAt)tick(s,1);
 assert.ok(currentServiceEvent(s));assert.equal(chooseServiceEvent(s,'kitchen'),true);
 assert.equal(s.service.decisionFlash,'炒锅加速 -3秒');assert.equal(s.service.eventEffects.WOK,3);
 assert.equal(chooseServiceEvent(s,'kitchen'),false);
});
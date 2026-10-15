import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pixelActor,crewAppearance,CREW_APPEARANCES} from '../src/pixels_v041.js';
import {drawCrewPortrait} from '../src/crew_portraits_v012d.js';
import {newGame,ensureCrew,crewEffects,promoteCrew} from '../src/engine.js';

const painted=(kind,level,extra={})=>{
 const operations=[];
 const ctx={fillStyle:null,
  save(){},restore(){},translate(){},scale(){},
  fillRect(x,y,w,h){operations.push([x,y,w,h,this.fillStyle])}};
 pixelActor(ctx,kind,34,40,2.45,{level,...extra});
 return operations;
};
const portrait=(role,level)=>{
 const operations=[];
 const ctx={fillStyle:null,save(){},restore(){},translate(){},scale(){},clearRect(){},
  fillRect(x,y,w,h){operations.push([x,y,w,h,this.fillStyle])}};
 const canvas={width:68,height:82,getContext:()=>ctx};
 assert.equal(drawCrewPortrait(canvas,role,level),true);
 assert.equal(ctx.imageSmoothingEnabled,false);
 return operations;
};
test('v0.12-D Lv1 staff sprites preserve default and invalid-level pixels exactly',()=>{
 for(const role of ['helper','waiter']){
  const natural=painted(role,undefined);
  assert.deepEqual(natural,painted(role,1));
  for(const bad of [-1,0,4,NaN,'3',{},null])assert.deepEqual(painted(role,bad),natural);
 }
});
test('v0.12-D both roles own three unique painter outputs and tier-accurate outfit labels',()=>{
 for(const role of ['helper','waiter']){
  const variants=[1,2,3].map(l=>painted(role,l));
  assert.notDeepEqual(variants[0],variants[1]);
  assert.notDeepEqual(variants[1],variants[2]);
  assert.notDeepEqual(variants[0],variants[2]);
  assert.equal(CREW_APPEARANCES[role].length,3);
  for(const [idx,look] of CREW_APPEARANCES[role].entries()){
   assert.equal(crewAppearance(role,idx+1).label,look.label);
   assert.ok(look.uniform.length>=8);
   assert.deepEqual(portrait(role,idx+1).slice(-5),variants[idx].slice(-5));
  }
 }
 assert.equal(crewAppearance('chef',3),null);
 assert.equal(crewAppearance('guest',3),null);
});
test('v0.12-D guest and player never change pixels when staff rank is supplied',()=>{
 for(const kind of ['chef','adventurer','family','regular','critic','stargazer']){
  assert.deepEqual(painted(kind,1),painted(kind,3),kind);
 }
 assert.equal(drawCrewPortrait({},'helper',3),false);
 assert.equal(drawCrewPortrait({getContext:()=>null},'helper',3),false);
 assert.equal(drawCrewPortrait({getContext:()=>({})},'guest',1),false);
});
test('v0.12-D business promotion still only changes existing level and business costs; portrait reads same level',()=>{
 const s=newGame(20261015);s.phase='prep';s.coins=500;
 for(const role of ['helper','waiter']){
  const p=ensureCrew(s)[role];p.hired=true;p.onDuty=true;p.xp=30;
  const before=s.coins;
  assert.equal(promoteCrew(s,role),true);
  assert.equal(s.coins,before-28);
  assert.equal(s.crew[role].level,2);
  assert.equal(crewAppearance(role,s.crew[role].level).level,2);
  assert.equal(promoteCrew(s,role),true);
  assert.equal(s.coins,before-28-64);
  assert.equal(s.crew[role].level,3);
  assert.equal(crewAppearance(role,s.crew[role].level).level,3);
  assert.equal(promoteCrew(s,role),false);
 }
 assert.equal(crewEffects(s).helper.salary,19);
 assert.equal(crewEffects(s).waiter.salary,18);
});
test('v0.12-D renderer routes live frozen crew levels, role portraits and offline art to one painter',()=>{
 const scene=readFileSync(new URL('../src/scenes_v04.js',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const build=readFileSync(new URL('../scripts/build-standalone.py',import.meta.url),'utf8');
 assert.match(scene,/level:crew\.helper\.level\|\|1/);
 assert.match(scene,/level:crew\.waiter\.level\|\|1/);
 assert.match(scene,/level:a\.level\|\|1/);
 assert.match(scene,/level:staff\.helper\.level\|\|1/);
 assert.match(scene,/level:staff\.waiter\.level\|\|1/);
 assert.match(app,/drawCrewPortraits\(app\)/);
 assert.match(app,/data-crew-portrait/);
 assert.match(build,/crew_portraits_v012d\.js/);
 assert.match(build,/crew_appearance_v012d\.css/);
});

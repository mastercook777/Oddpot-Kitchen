import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadoutAccent,portraitIdle} from '../src/three_z2c7_chef_portrait.js';
test('loadout appraisal has smooth endpoints, bounded values and tool-specific expression',()=>{
 for(const type of ['WOK','POT','GRILL','STEAM']){
  for(let i=-60;i<=120;i++){const a=loadoutAccent(i/60,0,type);assert.ok(Object.values(a).every(x=>Number.isFinite(x)&&Math.abs(x)<=.1));}
  for(const t of [-1,0,.9,1.5])assert.ok(Object.values(loadoutAccent(t,0,type)).every(v=>Math.abs(v)<1e-12));
  assert.ok(Math.abs(loadoutAccent(.001,0,type).pitch)<.00001);
 }
 assert.ok(loadoutAccent(.45,0,'WOK').yaw<0);
 assert.ok(loadoutAccent(.45,0,'POT').yaw>0);
 assert.ok(loadoutAccent(.45,0,'STEAM').pitch>loadoutAccent(.45,0,'GRILL').pitch);
 assert.ok(Object.values(portraitIdle(2,1)).every(Number.isFinite));
});
test('departure restores original Y2 chef and keeps rig and version marker',()=>{
 const src=readFileSync(new URL('../src/three_z2c3_departure.js',import.meta.url),'utf8');
 const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(src,/makeChefY2\(T,rounded,true\)/);
 assert.match(src,/hero.update\(t,\{facing:'front',moving:false,working:false,carrying:false\}\);rig.update/);
 assert.match(src,/createWeaponRig\(T,hero,rounded\)/);
 assert.match(src,/dataset.portrait='z2c12'/);
 assert.match(index,/v0\.16-Z\.2e-D2/);
 assert.match(index,/three_z2c3_departure\.js\?v=z2c12/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame,enterField,completeFieldSegment,chooseFieldBranch} from '../src/engine.js';
import {generateBiomeMap} from '../src/field_biomes_v081.js';
import {expandFieldMap} from '../src/field_world_v011b1.js';
import {startActionField,stepActionField,useFieldSkill} from '../src/field_v04.js';
import {fieldArtGroundPlan} from '../src/field_pixel_herb_v011c.js?v=0.13.0-alpha.9';
import {isHybridFieldArt,hybridFieldLandscapePlan,drawHybridFieldGround,drawHybridFieldObstacle,drawHybridFieldHazard,HYBRID_FIELD_STYLES} from '../src/field_hybrid_biomes_v011f.js';
import * as fx from '../src/field_effects_v011e2.js';
import {drawField} from '../src/scenes_v04.js';
const zones=['herb_path','glow_mushroom','old_tree_edge','forest_garden','forest_secret','spore_gate','spore_roots','hot_spring_shallows','steam_crack','ember_edge','steam_lake','spring_market','ember_gate','ember_side'];
const spring=z=>/^(hot_|steam_|ember_|spring_)/.test(z);
function fixture(zone,seed=20261013){
 const s=newGame(seed),route=spring(zone)?'spring_safe':'safe';s.phase='field';enterField(s,route);
 Object.assign(s.field,expandFieldMap(generateBiomeMap({...s,fieldZoneId:zone},route),seed));
 startActionField(s);return s;
}
function context(){
 const calls=[],gradient=()=>({addColorStop(){}});
 return new Proxy({calls,createLinearGradient:gradient,createRadialGradient:gradient,measureText:t=>({width:String(t).length*7})},
 {get(o,k){if(k in o)return o[k];return (...a)=>{for(const n of a)if(typeof n==='number')assert.ok(Number.isFinite(n),k+' finite');calls.push(k);};},set:(o,k,v)=>(o[k]=v,true)});
}
function withPaint(fn){const d=globalThis.document,w=globalThis.window;let created=0;
 globalThis.window={devicePixelRatio:2};globalThis.document={createElement(){created++;return {width:0,height:0,getContext:context};}};
 try{return fn(()=>created);}finally{globalThis.document=d;globalThis.window=w;}}
test('all 14 zones select an authored biome; 8 × 64 seeds retain geometry, plans and interactions',()=>{
 const styles=new Set();
 for(const zone of zones){const f=fixture(zone).field;styles.add(f.biome.style);assert.ok(isHybridFieldArt(f));assert.equal(hybridFieldLandscapePlan(f).style,f.biome.style);}
 assert.deepEqual([...styles].sort(),[...HYBRID_FIELD_STYLES].filter(style=>!style.startsWith('cloud')).sort());
 assert.deepEqual(HYBRID_FIELD_STYLES.filter(style=>style.startsWith('cloud')).sort(),['cloud','cloud_roost']);
 for(const zone of ['herb_path','glow_mushroom','old_tree_edge','forest_garden','hot_spring_shallows','steam_crack','ember_edge','steam_lake'])for(let i=0;i<64;i++){
  const f=fixture(zone,71001+i*103).field,before=JSON.stringify(f),plan=hybridFieldLandscapePlan(f);
  assert.ok(plan.details.groups.length<=22);assert.strictEqual(plan,hybridFieldLandscapePlan(f));
  assert.strictEqual(plan.ground,fieldArtGroundPlan(f));
  for(const key of plan.ground.trail){const [x,y]=key.split(',').map(Number);assert.ok(!f.obstacles.some(o=>o.x===x&&o.y===y));assert.ok(!f.hazards.some(o=>o.x===x&&o.y===y));}
  assert.equal(JSON.stringify(f),before);
 }
});
test('each ecology paints one cached ground, real objects and exact hazard radius without gameplay writes',()=>withPaint(created=>{
 for(const zone of zones){const f=fixture(zone).field,before=JSON.stringify(f),c=context(),start=created();
  for(let frame=0;frame<5;frame++)assert.ok(drawHybridFieldGround(c,f));
  assert.equal(created()-start,1);
  for(const [i,o] of f.obstacles.entries())drawHybridFieldObstacle(c,o,f.biome.style,i);
  drawHybridFieldHazard(c,{x:4,y:4},{radius:.55,active:true},f.biome.style,2.3);
  assert.ok(c.calls.includes('drawImage'));assert.equal(JSON.stringify(f),before);
  assert.equal(isHybridFieldArt({...f,worldVersion:undefined,worldW:9,worldH:11}),false);
  assert.equal(isHybridFieldArt({...f,artPreviewMode:'legacy'}),false);
 }
}));
test('effect painters use continuous geometry, never pixel rectangles/text explosion and never mutate snapshots',()=>{
 const c=context(),p={x:5,y:5,vx:1,vy:0,source:'spore',fromX:4,fromY:5,targetX:6,targetY:5,time:.20,duration:.38},s=fixture('glow_mushroom');
 const f=s.field,e={...f.enemies[0],hp:0,deathFx:.3},pop={x:5,y:5,ttl:.3,text:'💥'},before=JSON.stringify({p,f,e,pop});
 f.attackFx={ttl:.2,duration:.33,dx:1,dy:0};f.skillFx=.25;const original=JSON.stringify(f);
 fx.drawFieldProjectile(c,p);fx.drawFieldProjectile(c,p,'player');fx.drawFieldImpact(c,5,5,.8);fx.drawFieldSwipe(c,f);fx.drawFieldSkillWave(c,f);fx.drawFieldBurst(c,pop);fx.drawFieldCollection(c,pop);fx.drawFieldDeath(c,e);fx.drawFieldActorIndicators(c,{...e,hp:1,warning:.4,windupTotal:.7},40);fx.drawFieldNodeMarkers(c,{x:5,y:5,key:'target'},4);
 assert.ok(c.calls.includes('arc')&&c.calls.includes('quadraticCurveTo'));assert.ok(!c.calls.includes('fillRect')&&!c.calls.includes('fillText')&&!c.calls.includes('drawImage'));
 assert.equal(JSON.stringify(f),original);f.attackFx=null;f.skillFx=0;assert.equal(JSON.stringify({p,f,e,pop}),before);
});
test('all styles, both weapons, hazards, enemy attacks and complete renderer are presentation-only',()=>withPaint(()=>{
 for(const zone of zones)for(const weapon of ['WOK','POT']){
  const s=fixture(zone),f=s.field;f.weapon.type=weapon;
  f.pos={...f.nodes[0]};f.attackFx={ttl:.2,duration:.33,dx:1,dy:0,pot:weapon==='POT'};f.hitFlash=.3;f.hitShake=.1;f.skillFx=.2;f.shieldFlash=.25;
  f.popFx=[{x:f.pos.x,y:f.pos.y,ttl:.25,text:'💥'},{x:f.pos.x,y:f.pos.y,ttl:.4,text:'+2'}];
  f.projectiles=[{x:5,y:5,vx:1,vy:0,source:'spore',life:1}];f.playerProjectiles=[{x:5,y:5,fromX:4,fromY:5,targetX:6,targetY:5,time:.2,duration:.38}];
  for(const e of f.enemies){e.hurtFx=.2;e.warning=.3;e.windupTotal=.7;e.aim={...f.pos};e.attackOrigin={x:e.x,y:e.y};}
  const before=JSON.stringify(s),c=context(),cv={width:0,height:0,getContext:()=>c,getBoundingClientRect:()=>({width:320,height:340})};
  drawField(cv,s,2.5);drawField(cv,s,2.5);assert.equal(JSON.stringify(s),before);assert.ok(c.calls.includes('drawImage'));
 }
}));
test('same input with Hybrid and legacy art has identical combat, harvesting and complete two-region runs',()=>{
 for(const route of ['safe','spring_safe']){
  const games=[newGame(20261013),newGame(20261013)];for(const s of games){s.phase='field';enterField(s,route);startActionField(s);}games[1].field.artPreviewMode='legacy';
  for(let frame=0;frame<120;frame++)for(const s of games)stepActionField(s,0,frame<55?-1:0,.03);
  delete games[1].field.artPreviewMode;assert.deepEqual(games[0],games[1]);
  for(let segment=1;segment<=3;segment++){
   for(const s of games){s.field.nodes.find(n=>n.key==='target').claimed=true;assert.equal(completeFieldSegment(s),true);if(segment<3){const choice=s.field.choices.find(x=>!x.risk)||s.field.choices[0];assert.ok(chooseFieldBranch(s,choice.choiceId));startActionField(s);assert.ok(isHybridFieldArt(s.field));}}
   assert.deepEqual(games[0],games[1]);
  }
 }
});

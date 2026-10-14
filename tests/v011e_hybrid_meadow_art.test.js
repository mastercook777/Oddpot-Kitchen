import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame,enterField} from '../src/engine.js';
import {startActionField} from '../src/field_v04.js';
import {fieldTilePath} from '../src/field_rules_v011a.js';
import {herbPixelGroundPlan,isHerbPixelSlice} from '../src/field_pixel_herb_v011c.js?v=0.12.0-alpha.1';
import {HYBRID_MEADOW_PALETTE,isHybridMeadow,hybridMeadowGroundPlan,
 drawHybridMeadowGround,drawHybridMeadowObstacle,drawHybridMeadowHazard} from '../src/field_hybrid_meadow_v011e.js';
function game(seed=20261014,route='safe'){
 const s=newGame(seed);s.phase='field';assert.equal(enterField(s,route),true);
 assert.ok(startActionField(s));return s;
}
function mockPaint(){
 const calls=[],gradient=()=>({addColorStop(){}});
 const base={calls,
  save(){},restore(){},beginPath(){},closePath(){},rect(){},clip(){},scale(){},translate(){},rotate(){},
  moveTo(){},lineTo(){},arc(){},ellipse(){},bezierCurveTo(){},quadraticCurveTo(){},
  fill(){calls.push('fill')},stroke(){calls.push('stroke')},
  fillRect(){calls.push('fillRect')},drawImage(img){assert.ok(img.width>0&&img.height>0);calls.push('drawImage')},
  createLinearGradient:gradient,createRadialGradient:gradient
 };
 return base;
}
test('hybrid style is gated ONLY to 12x16 herb_path; preview can compare old pixel without changing game rules',()=>{
 const s=game(),f=s.field,save=JSON.stringify(s);
 assert.ok(isHerbPixelSlice(f));
 assert.ok(isHybridMeadow(f));
 assert.strictEqual(hybridMeadowGroundPlan(f),herbPixelGroundPlan(f));
 assert.equal(JSON.stringify(s),save,'view state must not mutate economy or map');
 const pixel={...f,artPreviewMode:'pixel'};
 assert.equal(isHybridMeadow(pixel),false);
 assert.ok(isHerbPixelSlice(pixel));
 assert.equal(hybridMeadowGroundPlan(pixel),null);
 const old={...f,worldVersion:undefined,worldW:9,worldH:11};
 assert.equal(isHybridMeadow(old),false);
 const other={...f,biome:{...f.biome,zoneId:'glow_mushroom'}};
 assert.equal(isHybridMeadow(other),false);
 assert.equal(isHybridMeadow(game(20261014,'spring_safe').field),false);
});
test('hybrid meadow retains existing safe reachable real paths for 96 seeds',()=>{
 for(let seed=0;seed<96;seed++){
  const f=game(20261014+seed).field,original=JSON.stringify(f);
  const plan=hybridMeadowGroundPlan(f);
  assert.ok(plan);
  assert.equal(plan.width,12);assert.equal(plan.height,16);
  const goal=f.nodes.find(n=>n.key==='target');
  const road=fieldTilePath(f,f.spawn,goal,{avoidHazards:true});
  assert.ok(road.length>=3);
  for(const pt of road)assert.ok(plan.trail.has(Math.floor(pt.x)+','+Math.floor(pt.y)));
  for(const o of f.obstacles)assert.ok(!plan.trail.has(o.x+','+o.y));
  for(const hz of f.hazards)assert.ok(!plan.trail.has(hz.x+','+hz.y));
  assert.equal(JSON.stringify(f),original);
 }
});
test('painted meadow ground is one cached large raster; scenery uses smooth paths and gradients without tile scatter',()=>{
 const originalDoc=globalThis.document;let created=0,inner;
 globalThis.document={createElement(kind){
  assert.equal(kind,'canvas');created++;inner=mockPaint();
  return {width:0,height:0,getContext(){return inner;}};
 }};
 try{
  const s=game(),f=s.field,out=mockPaint();
  assert.equal(drawHybridMeadowGround(out,f),true);
  assert.equal(created,1,'a single raster per field, not per tile or each frame');
  assert.equal(out.calls.filter(x=>x==='drawImage').length,1);
  assert.ok(inner.calls.includes('fillRect'));
  assert.ok(inner.calls.filter(x=>x==='fill').length>=5,'layered greenery/trails/details');
  for(let frame=0;frame<6;frame++)drawHybridMeadowGround(out,f);
  assert.equal(created,1,'no per-frame canvas allocation');
  assert.equal(out.calls.filter(x=>x==='drawImage').length,7);
  assert.equal(drawHybridMeadowGround(out,{...f,artPreviewMode:'pixel'}),false);
  assert.equal(drawHybridMeadowGround(out,{...f,biome:{...f.biome,zoneId:'roots'}}),false);
 }finally{globalThis.document=originalDoc;}
});
test('trees, rocks and hazards are bespoke painted Canvas objects and do not alter entities',()=>{
 const ctx=mockPaint(),obj={x:5,y:6},copy=JSON.stringify(obj);
 drawHybridMeadowObstacle(ctx,obj,0);
 drawHybridMeadowObstacle(ctx,obj,2);
 drawHybridMeadowHazard(ctx,obj,{active:true,radius:.55},3.2);
 drawHybridMeadowHazard(ctx,obj,{warning:true,radius:.55},2);
 assert.ok(ctx.calls.filter(x=>x==='fill').length>12);
 assert.ok(ctx.calls.filter(x=>x==='stroke').length>5);
 assert.equal(JSON.stringify(obj),copy);
 assert.ok(HYBRID_MEADOW_PALETTE.trail&&HYBRID_MEADOW_PALETTE.foliage);
});
test('entire branch uses hybrid environment but keeps actual chef, enemy and traveler pixel sprite routes',()=>{
 const scene=readFileSync(new URL('../src/scenes_v04.js',import.meta.url),'utf8');
 const src=readFileSync(new URL('../src/field_hybrid_meadow_v011e.js',import.meta.url),'utf8');
 const bundler=readFileSync(new URL('../scripts/build-standalone.py',import.meta.url),'utf8');
 assert.ok(scene.includes('if(herbHybridArt)drawHybridMeadowGround(c,f)'));
 assert.ok(scene.includes('drawHybridMeadowObstacle(c,o,i)'));
 assert.ok(scene.includes('drawHybridMeadowHazard(c,hz,p,clock)'));
 assert.ok(scene.includes('drawHerbPixelNode(c,n,clock)'), 'forage and travelers remain raster characters');
 assert.ok(scene.includes('drawHerbPixelEnemy(c,actor,e.hitResponse?0:clock,sc,pixelEnemy,!smoothFx)'));
 assert.ok(scene.includes('chef(c,0,Math.sin'), 'player original pixel character preserved');
 assert.ok(!src.includes('Math.random'), 'no unseeded cosmetic random streams');
 assert.ok(bundler.indexOf("'field_hybrid_meadow_v011e.js'")<bundler.indexOf("'scenes_v04.js'"));
});

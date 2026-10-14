import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildHybridMeadowDetailPlan,drawHybridMeadowGround,isHybridMeadow} from '../src/field_hybrid_meadow_v011e.js';
import {herbPixelGroundPlan,isHerbPixelSlice} from '../src/field_pixel_herb_v011c.js?v=0.11.0-alpha.7';
import {createMeadowPreview,setMeadowPreviewMode,meadowPreviewPose,MEADOW_PREVIEW_MODES} from '../src/meadow_preview_state_e1.js';
import {stepActionField} from '../src/field_v04.js';
import {fieldTilePath} from '../src/field_rules_v011a.js';
const simulation=s=>{const copy=JSON.parse(JSON.stringify(s));delete copy.field.artPreviewMode;return copy;};
function paint(){return new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});}
test('E.1 deterministic detail budget, exclusion envelopes and unchanged map in 64 seeds',()=>{
 const signatures=new Set();
 for(let seed=20261013;seed<20261077;seed++){
  const s=createMeadowPreview(seed),f=s.field,before=JSON.stringify(s);
  const plan=buildHybridMeadowDetailPlan(f),other=buildHybridMeadowDetailPlan(createMeadowPreview(seed).field);
  assert.deepEqual(plan,other);assert.strictEqual(plan,buildHybridMeadowDetailPlan(f));
  assert.ok(plan.groups.length<=22&&plan.groups.length>=12);
  signatures.add(JSON.stringify(plan.groups));
  const category={free:0,edge:0,root:0,special:0};
  for(const g of plan.groups){
   category[g.category]++;const extent=g.category==='root'?.32:.25;
   assert.ok(g.x>.5&&g.x<f.worldW-.5&&g.y>.5&&g.y<f.worldH-.5);
   assert.ok(Math.hypot(g.x-f.spawn.x,g.y-f.spawn.y)>=1.5+extent);
   for(const n of f.nodes)assert.ok(Math.hypot(g.x-n.x,g.y-n.y)>=1.15+extent);
   for(const hz of f.hazards)assert.ok(Math.hypot(g.x-hz.x-.5,g.y-hz.y-.5)>=.90+extent);
   for(const e of f.enemies)assert.ok(Math.hypot(g.x-e.x,g.y-e.y)>=1.5+extent);
   if(g.category==='root')assert.ok(f.obstacles[g.obstacleIndex]);
   for(const key of herbPixelGroundPlan(f).trail){const [x,y]=key.split(',').map(Number);
    assert.ok(Math.hypot(g.x-x-.5,g.y-y-.5)>(g.category==='edge'?.36:.62));}
  }
  assert.ok(category.free<=8&&category.edge<=7&&category.root<=6&&category.special<=1);
  const target=f.nodes.find(n=>n.key==='target');assert.ok(fieldTilePath(f,f.spawn,target,{avoidHazards:true}).length);
  assert.equal(JSON.stringify(s),before);
 }
 assert.ok(signatures.size>60);
});
test('same live state survives all four art switches; paused view poses stay in genuinely reachable cells',()=>{
 const s=createMeadowPreview(),original=simulation(s);
 for(const mode of MEADOW_PREVIEW_MODES){
  assert.ok(setMeadowPreviewMode(s,mode));assert.deepEqual(simulation(s),original);
  if(mode==='legacy'){assert.equal(isHybridMeadow(s.field),false);assert.equal(isHerbPixelSlice(s.field),false);}
  for(const name of ['spawn','mid','tree','harvest'])assert.ok(fieldTilePath(s.field,s.field.spawn,meadowPreviewPose(s,name)).length);
 }
 assert.equal(setMeadowPreviewMode(s,'invalid'),false);
});
test('art modes have identical movement, collection, enemy AI and HP across the same input sequence',()=>{
 const states=MEADOW_PREVIEW_MODES.map(mode=>{const s=createMeadowPreview();setMeadowPreviewMode(s,mode);return s;});
 for(let frame=0;frame<220;frame++)for(const s of states)stepActionField(s,frame<145?0:-1,frame<145?-1:0,.03);
 for(const s of states.slice(1))assert.deepEqual(simulation(s),simulation(states[0]));
});
test('E0 and E1 each allocate one cached raster; mode switching never changes a live field',()=>{
 const originalDoc=globalThis.document;let created=0;
 globalThis.document={createElement(){created++;return {width:0,height:0,getContext:paint};}};
 try{
  const s=createMeadowPreview(),before=simulation(s),ctx=paint();
  for(let n=0;n<10;n++){setMeadowPreviewMode(s,n%2?'hybrid-e0':'hybrid-e1');drawHybridMeadowGround(ctx,s.field);}
  assert.equal(created,2);assert.deepEqual(simulation(s),before);
  for(const mode of ['pixel','legacy']){setMeadowPreviewMode(s,mode);assert.equal(drawHybridMeadowGround(ctx,s.field),false);}
  assert.equal(created,2);
 }finally{globalThis.document=originalDoc;}
});
test('E1 remains herb_path-only and preview never writes or loads a formal save',()=>{
 const f=createMeadowPreview().field;
 assert.equal(isHybridMeadow({...f,worldW:9,worldH:11,worldVersion:undefined}),false);
 for(const zoneId of ['glow_mushroom','old_tree_edge','forest_garden','hot_spring_shallows','steam_crack','ember_edge','steam_lake']){
  const other={...f,biome:{...f.biome,zoneId}};
  assert.equal(isHybridMeadow(other),false);assert.equal(buildHybridMeadowDetailPlan(other),null);
 }
 const preview=readFileSync(new URL('../src/meadow_preview_e1.js',import.meta.url),'utf8');
 assert.ok(!preview.includes('localStorage'));assert.ok(preview.includes('pointercancel'));assert.ok(preview.includes('visibilitychange'));
 assert.ok(preview.includes('stepActionField(s'));
});

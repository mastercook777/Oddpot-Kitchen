import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBiomeMap} from '../src/field_biomes_v081.js';
import {expandFieldMap,fieldEnemySpawnCandidates} from '../src/field_world_v011b1.js';
import {fieldCamera} from '../src/field_camera_v011b1.js';
import {fieldTilePath} from '../src/field_rules_v011a.js';
import {makeFieldEncounterPlan,insertPlannedFieldEncounter} from '../src/field_encounter_plan_v011b.js';
import {newGame,enterField,completeFieldSegment,chooseFieldBranch,buildFieldMap} from '../src/engine.js';
import {startActionField} from '../src/field_v04.js';

const ZONES=[
 ['herb_path','safe'],['glow_mushroom','safe'],['old_tree_edge','risk'],
 ['forest_garden','safe'],['hot_spring_shallows','spring_safe'],
 ['steam_crack','spring_risk'],['ember_edge','spring_risk'],
 ['steam_lake','spring_safe']
];
const tile=p=>Math.floor(p.x)+','+Math.floor(p.y);

test('eight biomes × 64 deterministic seeds expand to reachable 12×16 routes',()=>{
 for(const [zone,route] of ZONES){
  const silhouettes=new Set();
  for(let i=1;i<=64;i++){
   const s={seed:20261009+101*i,day:2,cycle:1,fieldZoneId:zone};
   const old=generateBiomeMap(s,route);
   assert.equal(old.worldW,9,'source of old-save coordinates remains unchanged');
   const f=expandFieldMap(old,s.seed);
   assert.equal(f.worldVersion,'0.11-B1');
   assert.equal(f.worldW,12);assert.equal(f.worldH,16);
   assert.equal(f.biome.expanded,true);
   assert.ok(f.obstacles.length>=old.obstacles.length+2,zone+' must gain physical variety');
   assert.ok(f.scenery.length>=9,zone+' needs distinct scene props');
   const solid=new Set(f.obstacles.map(tile)),danger=new Set(f.hazards.map(tile));
   assert.equal(solid.has(tile(f.spawn)),false);assert.equal(danger.has(tile(f.spawn)),false);
   assert.ok(fieldTilePath(f,f.spawn,f.bossSpawn,{avoidHazards:true}).length>0,zone+' boss accessible');
   for(const n of f.nodes){
    assert.equal(solid.has(tile(n)),false,'target not in a solid');
    assert.equal(danger.has(tile(n)),false,'target not on hazards');
    assert.ok(fieldTilePath(f,f.spawn,{x:n.x+.5,y:n.y+.5},{avoidHazards:true}).length,zone+' unreachable harvest');
   }
   // NPC placement must still be feasible after extra physical obstacles.
   const plan=makeFieldEncounterPlan(s,route);
   insertPlannedFieldEncounter(f,plan,plan.segment);
   const events=f.nodes.filter(n=>n.type==='event');
   assert.equal(events.length,1,zone+' requires visible reachable traveler');
   assert.ok(fieldTilePath(f,f.spawn,{x:events[0].x+.5,y:events[0].y+.5},{avoidHazards:true}).length);
   assert.deepEqual(expandFieldMap(generateBiomeMap(s,route),s.seed),expandFieldMap(generateBiomeMap(s,route),s.seed),'seed reproducibility');
   assert.equal(expandFieldMap(f,s.seed),f,'no re-expansion of an existing world');
   silhouettes.add(f.obstacles.map(n=>n.x+','+n.y).join('|'));
  }
  assert.ok(silhouettes.size>=6,zone+' cannot be the same obstacle board on every run');
 }
});

test('camera pans and clamps inside expanded maps without shrinking entity scale',()=>{
 const f={worldVersion:'0.11-B1',worldW:12,worldH:16,pos:{x:6,y:8}};
 for(const [w,h] of [[320,440],[375,530],[390,610],[650,320],[768,1024]]){
  let cam=fieldCamera(f,w,h);
  assert.ok(Number.isFinite(cam.scale)&&cam.scale>0);
  assert.ok(cam.scale>=Math.min(w/12,h/16),'camera may not shrink the world');
  for(const pos of [{x:.2,y:.2},{x:11.8,y:15.8},{x:6,y:8}]){
   f.pos=pos;cam=fieldCamera(f,w,h);
   assert.ok(cam.cameraX>=0&&cam.cameraY>=0);
   assert.ok(cam.cameraX<=Math.max(0,f.worldW-cam.viewW)+1e-8);
   assert.ok(cam.cameraY<=Math.max(0,f.worldH-cam.viewH)+1e-8);
   const left=cam.offsetX,right=cam.offsetX+f.worldW*cam.scale;
   const top=cam.offsetY,bottom=cam.offsetY+f.worldH*cam.scale;
   assert.ok(left<=.001&&right>=w-.001,'canvas covered horizontally');
   assert.ok(top<=.001&&bottom>=h-.001,'canvas covered vertically');
  }
 }
 const legacy=fieldCamera({worldW:9,worldH:11,pos:{x:7,y:2}},320,440);
 assert.equal(legacy.expanded,false);
 assert.equal(legacy.cameraX,0);assert.equal(legacy.cameraY,0);
 assert.equal(legacy.scale,Math.min(320/9,440/11));
});

test('expanded scene picks physically safe, varied enemy spawn points',()=>{
 for(const [zone,route] of ZONES){
  const s={seed:70137,day:2,cycle:1,fieldZoneId:zone};
  const f=expandFieldMap(generateBiomeMap(s,route),s.seed);
  const locations=fieldEnemySpawnCandidates(f,71737,8);
  assert.ok(locations.length>=4,zone+' should have candidate enemies');
  for(const p of locations){
   assert.ok(!f.obstacles.some(o=>o.x===Math.floor(p.x)&&o.y===Math.floor(p.y)));
   assert.ok(!f.hazards.some(o=>o.x===Math.floor(p.x)&&o.y===Math.floor(p.y)));
   assert.ok(Math.hypot(p.x-f.spawn.x,p.y-f.spawn.y)>2.6);
  }
 }
});

test('new expedition and all branch swaps use expanded worlds while keeping encounters',()=>{
 for(const route of ['safe','risk','spring_safe','spring_risk'])for(let seed=31;seed<55;seed++){
  const s=newGame(seed);s.phase='field';
  assert.equal(enterField(s,route),true);
  const plan={...s.field.encounterPlan};
  let total=0;
  for(let segment=1;segment<=3;segment++){
   const f=s.field;
   assert.equal(f.worldVersion,'0.11-B1');
   assert.equal(f.worldW,12);assert.equal(f.worldH,16);
   assert.equal(f.nodes.filter(n=>n.type==='event').length,plan.version==='0.11-C'?plan.encounters.filter(e=>e.segment===segment).length:segment===plan.segment?1:0);
   total+=f.nodes.filter(n=>n.type==='event').length;
   assert.equal(startActionField(s),true);
   assert.ok(f.enemies.filter(e=>!e.isBoss).length>=1,'combat still spawns');
   assert.equal(f.nodes[0].x%1,.5,'normal node converted to world center once');
   if(segment===3)break;
   f.nodes.find(n=>n.key==='target').claimed=true;
   assert.equal(completeFieldSegment(s),true);
   assert.equal(chooseFieldBranch(s,f.choices[0].choiceId),true);
   assert.deepEqual(f.encounterPlan,plan,'persist encounter plan across branches');
  }
  assert.equal(total,plan.version==='0.11-C'?plan.encounters.length:1,'the saved plan owns the complete run budget');
 }
});

test('existing 9×11 in-flight saves retain their coordinates and legacy camera',()=>{
 const s=newGame(3001);s.phase='field';enterField(s,'safe');
 const legacy=generateBiomeMap({seed:s.seed,day:1,cycle:1,fieldZoneId:'herb_path'},'safe');
 s.field={...s.field,...legacy,action:true,pos:{x:4.5,y:9.4},worldVersion:undefined};
 const save=JSON.parse(JSON.stringify(s));
 assert.equal(save.field.worldW,9);
 assert.equal(save.field.pos.y,9.4);
 assert.equal(fieldCamera(save.field,320,470).expanded,false);
});

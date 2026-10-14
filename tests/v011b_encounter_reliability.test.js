import test from 'node:test';
import assert from 'node:assert/strict';
import {makeFieldEncounterPlan,insertPlannedFieldEncounter} from '../src/field_encounter_plan_v011b.js';
import {generateBiomeMap} from '../src/field_biomes_v081.js';
import {fieldTilePath} from '../src/field_rules_v011a.js';
import {newGame,enterField,completeFieldSegment,chooseFieldBranch} from '../src/engine.js';
import {startActionField,stepActionField,resolveFieldEvent} from '../src/field_v04.js';

test('both region plans are deterministic, with one second/third-segment encounter',()=>{
 for(const route of ['safe','risk','spring_safe','spring_risk']){
  const s=newGame(5001),a=makeFieldEncounterPlan(s,route),b=makeFieldEncounterPlan(s,route);
  assert.deepEqual(a,b);
  assert.ok([2,3].includes(a.segment));assert.match(a.eventId,/traveler-1-1-/);
  assert.equal(a.region,route.startsWith('spring')?'spring':'forest');
 }
});

test('each biome finds an accessible event along actual safe route across seeds',()=>{
 const choices=[
  ['herb_path','safe'],['glow_mushroom','safe'],['old_tree_edge','risk'],
  ['forest_garden','safe'],['hot_spring_shallows','spring_safe'],
  ['steam_crack','spring_risk'],['ember_edge','spring_risk'],
  ['steam_lake','spring_safe']
 ];
 for(const [zone,route] of choices)for(let n=1;n<=128;n++){
  const s={seed:20261009+n*97,cycle:1,day:2,fieldZoneId:zone};
  const map=generateBiomeMap(s,route),plan=makeFieldEncounterPlan(s,route);
  assert.equal(map.nodes.filter(x=>x.type==='event').length,0,
   'unscheduled events must not bypass run budget');
  insertPlannedFieldEncounter(map,plan,plan.segment);
  const e=map.nodes.filter(x=>x.type==='event');
  assert.equal(e.length,1,zone+' seed '+n+' needs one event');
  assert.equal(e[0].key,plan.eventId);
  assert.ok(fieldTilePath(map,map.spawn,{x:e[0].x+.5,y:e[0].y+.5},{avoidHazards:true}).length,
   zone+' unreachable event');
  assert.ok(!map.nodes.some(x=>x!==e[0]&&x.x===e[0].x&&x.y===e[0].y),'event overlaps resource');
  assert.ok(!map.obstacles.some(x=>x.x===e[0].x&&x.y===e[0].y),'event overlaps obstacle');
  assert.ok(!map.hazards.some(x=>x.x===e[0].x&&x.y===e[0].y),'event overlaps vent');
  insertPlannedFieldEncounter(map,plan,plan.segment);
  assert.equal(map.nodes.filter(x=>x.type==='event').length,1,'placement must be idempotent');
 }
});

test('saved legacy three-stage exploration keeps its one traveler without upgrading the plan',()=>{
 for(const route of ['safe','risk','spring_safe','spring_risk']){
  for(let seed=50;seed<=74;seed++){
   const s=newGame(seed);s.phase='field';
   assert.ok(enterField(s,route));
   s.field.encounterPlan=makeFieldEncounterPlan(s,route);s.field.nodes=s.field.nodes.filter(n=>n.type!=='event');
   let events=0;
   for(let segment=1;segment<=3;segment++){
    const inMap=s.field.nodes.filter(n=>n.type==='event');
    events+=inMap.length;
    if(inMap.length){
     assert.equal(segment,s.field.encounterPlan.segment);
     assert.ok(startActionField(s));
     const e=inMap[0];
     s.field.pos={x:e.x+.5,y:e.y+.5};
     const r=stepActionField(s,0,0,.016);
     assert.equal(r,'field_event');
     assert.equal(s.field.activeEvent,e.key);
     assert.equal(resolveFieldEvent(s,'leave'),true);
     assert.equal(resolveFieldEvent(s,'leave'),false);
     assert.equal(e.claimed,false,'field nodes were copied into action scene');
     assert.equal(s.field.nodes.find(n=>n.key===e.key).claimed,true);
     assert.equal(s.field.activeEvent,null);
     assert.ok(!s.field.nodes.some(n=>n.type==='event'&&!n.claimed));
    }
    const f=s.field;
    f.nodes.find(n=>n.key==='target').claimed=true;
    if(segment===3)break;
    assert.ok(completeFieldSegment(s));
    const pick=f.choices[0];
    assert.ok(chooseFieldBranch(s,pick.choiceId));
    assert.equal(f.segmentIndex,segment+1);
   }
   assert.equal(events,1,route+' seed '+seed+' should show exactly one encounter in run');
  }
 }
});

test('saves created midrun retain a previously generated encounter without re-rolling',()=>{
 const s=newGame(91239);s.phase='field';enterField(s,'safe');
 const f=s.field;f.nodes.find(n=>n.key==='target').claimed=true;
 completeFieldSegment(s);chooseFieldBranch(s,f.choices[0].choiceId);
 const stored=JSON.parse(JSON.stringify(s));
 assert.deepEqual(stored.field.encounterPlan,f.encounterPlan);
 assert.deepEqual(stored.field.nodes,f.nodes);
 const branchMap=generateBiomeMap({seed:s.seed+223,cycle:s.cycle,day:s.day,fieldZoneId:'glow_mushroom'},'safe');
 assert.equal(branchMap.nodes.filter(n=>n.type==='event').length,0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBiomeMap} from '../src/field_biomes_v081.js';
import {hazardPhase,FIELD_HAZARD_RADIUS,fieldTilePath} from '../src/field_rules_v011a.js';

test('warning and active phases use the precise gameplay window and hit radius',()=>{
 const hz={x:0,y:4};
 const quiet=hazardPhase(hz,2.7,{style:'spring'});
 const warn=hazardPhase(hz,3.2,{style:'spring'});
 const active=hazardPhase(hz,3.46,{style:'spring'});
 assert.equal(quiet.warning,false);
 assert.equal(warn.warning,true);
 assert.equal(warn.active,false);
 assert.equal(active.active,true);
 assert.equal(active.source,'vent');
 assert.equal(active.radius,FIELD_HAZARD_RADIUS);
 assert.equal(FIELD_HAZARD_RADIUS,.55);
 assert.equal(hazardPhase(hz,3.16,{style:'roots'}).active,true);
 assert.equal(hazardPhase(hz,3.16,{style:'spring'}).active,false);
 assert.equal(hazardPhase(hz,3.16,{style:'roots'}).source,'spore');
 // The odd-X vent offset must match the old fixed combat timing.
 assert.equal(hazardPhase({x:1,y:4},1.80,{style:'spring'}).active,true);
});

test('all eight biomes keep reachable target and boss lanes across varied seeds',()=>{
 const zones=[
  ['herb_path','safe'],['glow_mushroom','safe'],['old_tree_edge','risk'],
  ['forest_garden','safe'],['hot_spring_shallows','spring_safe'],
  ['steam_crack','spring_risk'],['ember_edge','spring_risk'],
  ['steam_lake','spring_safe']
 ];
 for(const [zone,route] of zones){
  const arrangements=new Set(),pockets=new Set();
  for(let seed=1;seed<=64;seed++){
   const f=generateBiomeMap({seed:20261009+seed*103,cycle:1,day:2,fieldZoneId:zone},route);
   const target=f.nodes.find(n=>n.key==='target');
   assert.ok(target,'target exists for '+zone);
   const blocked=new Set(f.obstacles.map(o=>o.x+','+o.y));
   const dangerous=new Set(f.hazards.map(o=>o.x+','+o.y));
   for(const n of f.nodes){
    assert.equal(blocked.has(n.x+','+n.y),false,zone+' node trapped by obstacle');
    assert.equal(dangerous.has(n.x+','+n.y),false,zone+' node placed on active hazard');
    assert.ok(fieldTilePath(f,f.spawn,n).length,zone+' unreachable node');
   }
   assert.ok(fieldTilePath(f,f.spawn,f.bossSpawn).length,zone+' blocked boss corridor');
   assert.equal(dangerous.has(Math.floor(f.spawn.x)+','+Math.floor(f.spawn.y)),false,zone+' unsafe spawn');
   arrangements.add(f.obstacles.map(o=>o.x+','+o.y).join('|'));
   pockets.add(f.nodes.map(n=>n.x+','+n.y).join('|'));
  }
  assert.ok(arrangements.size>=2,zone+' must vary real obstacle positions with seed');
  assert.ok(pockets.size>=2,zone+' must vary gathered locations with seed');
 }
});

test('path helper avoids physical obstacles and optional vents',()=>{
 const f={worldW:9,worldH:11,obstacles:[{x:4,y:7},{x:4,y:6}],hazards:[{x:3,y:7}]};
 const normal=fieldTilePath(f,{x:4.5,y:9.4},{x:4.5,y:4.5});
 assert.ok(normal.length>0);
 assert.ok(!normal.some(p=>p.x===4.5&&(p.y===7.5||p.y===6.5)));
 const careful=fieldTilePath(f,{x:4.5,y:9.4},{x:4.5,y:4.5},{avoidHazards:true});
 assert.ok(careful.length>0);
 assert.ok(!careful.some(p=>p.x===3.5&&p.y===7.5));
});

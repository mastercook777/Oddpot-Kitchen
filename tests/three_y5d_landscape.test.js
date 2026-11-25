import test from 'node:test';import assert from 'node:assert/strict';
import {landscapePlan,landscapeSample,pathDistance} from '../src/three_y5d_landscape.js';
import {generateBiomeMap,getFieldBiome} from '../src/field_biomes_v081.js';
import {expandFieldMap} from '../src/field_world_v011b1.js';
import {fieldTilePath} from '../src/field_rules_v011a.js';
const zones=['herb_path','glow_mushroom','old_tree_edge','forest_garden','forest_secret','spore_gate','spore_roots','hot_spring_shallows','steam_crack','ember_edge','steam_lake','spring_market','ember_gate','ember_side'];
test('Y5d all fourteen zones use deterministic render-only landscape and clear route',()=>{
 for(const zoneId of zones)for(let seed=1;seed<=12;seed++){
  const route=getFieldBiome(zoneId).region==='spring'?'spring_safe':'safe',s={seed:seed*1729,day:1,cycle:1,fieldZoneId:zoneId},f=expandFieldMap(generateBiomeMap(s,route),seed);
  f.nodes=f.nodes.map(n=>({...n,x:n.x+.5,y:n.y+.5}));const style=f.biome.style,path=fieldTilePath(f,f.spawn,f.nodes[0],{avoidHazards:true}),before=JSON.stringify(f),p=landscapePlan(f,style,path);
  assert.deepEqual(p,landscapePlan(f,style,path));assert.equal(JSON.stringify(f),before);
  assert.ok(p.rim.length>20&&p.rim.every(q=>q.x<0||q.x>f.worldW||q.y<0||q.y>f.worldH));
  for(const q of p.plants){assert.ok(pathDistance(q.x,q.y,path)>=.72);assert.ok([...f.nodes,...f.obstacles.map(o=>({x:o.x+.5,y:o.y+.5})),...f.hazards.map(o=>({x:o.x+.5,y:o.y+.5}))].every(o=>Math.hypot(q.x-o.x,q.y-o.y)>=.83));}
  for(const q of [...p.springs.filter(q=>q.kind==='obstacle'),...p.outcrops])assert.ok(f.obstacles.some(o=>o.x+.5===q.x&&o.y+.5===q.y));
  for(let x=0;x<=f.worldW;x+=.5)for(let y=0;y<=f.worldH;y+=.5){const q=landscapeSample(f,style,x,y,path);assert.ok(q.height===0&&Object.values(q).every(Number.isFinite)&&q.path>=0&&q.path<=1);}
  for(const y of [-.000001,-.1,-1,-2]){const q=landscapeSample(f,style,4,y,path);assert.ok(Number.isFinite(q.height)&&q.height>=0);if(y===-.000001)assert.ok(q.height<1e-8);}
  for(const q of path)assert.equal(landscapeSample(f,style,q.x,q.y,path).path,1);
 }
});
test('Y5d maps with missing optional scenery or no route are safe, seed changes landscape',()=>{
 const f={worldW:12,worldH:16,biome:{zoneId:'herb_path',encounterSeed:1}};
 assert.ok(landscapePlan(f,'meadow').rim.length>20);assert.equal(landscapeSample(f,'meadow',4,4).path,0);
 const b={...f,biome:{...f.biome,encounterSeed:2}};
 assert.notDeepEqual(landscapePlan(f,'meadow').rim,landscapePlan(b,'meadow').rim);
});

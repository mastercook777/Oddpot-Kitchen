import test from 'node:test';
import assert from 'node:assert/strict';
import {getFieldBiome,generateBiomeMap} from '../src/field_biomes_v081.js';
import {newGame,nextPhase,enterField,completeFieldSegment,chooseFieldBranch} from '../src/engine.js';
import {placeRestaurantSpeech} from '../src/scenes_v04.js';

const zones=['herb_path','glow_mushroom','spore_gate','forest_garden',
 'hot_spring_shallows','steam_crack','ember_gate','steam_lake'];
const region=id=>['hot_spring_shallows','steam_crack','ember_gate','steam_lake'].includes(id)?'spring_safe':'safe';
test('every actual biome has landmark style, ecological source weight and its own obstacle/hazard signature',()=>{
 const ids=new Set(),styles=new Set(),resourceLayouts=new Set();
 for(const zone of zones){
  const b=getFieldBiome(zone,region(zone));
  assert.ok(b.floor&&b.accent&&b.grain&&b.resources?.length>0,zone);
  assert.ok(b.count>=2&&b.count<=5,zone);
  ids.add(b.zoneId);styles.add(b.style);
  const m=generateBiomeMap({seed:31,cycle:1,day:1,fieldZoneId:zone},region(zone),'chili');
  resourceLayouts.add(m.nodes.map(n=>[n.id,n.x,n.y,n.n]).join('|'));
  assert.ok(m.nodes.some(n=>n.key==='target'&&n.n===2),zone);
  assert.ok(m.nodes.every(n=>!['mushroom_heart','ember_pepper'].includes(n.id)),zone);
  assert.ok(m.nodes.length>=2&&m.nodes.length<=7,zone);
 }
 assert.equal(ids.size,zones.length);assert.ok(styles.size>=8);
 assert.equal(resourceLayouts.size,zones.length);
});
test('high abundance garden and spring have more pickups than scarce root and ember boss areas',()=>{
 const base={seed:20261012,cycle:1,day:1};
 const size=z=>generateBiomeMap({...base,fieldZoneId:z},z==='ember_gate'||z==='hot_spring_shallows'?'spring_risk':'risk','chili').nodes.length;
 assert.ok(size('forest_garden')>size('spore_gate'));
 assert.ok(size('hot_spring_shallows')>size('ember_gate'));
 const roots=generateBiomeMap({...base,fieldZoneId:'spore_gate'},'risk','mushroom');
 const mushrooms=roots.nodes.filter(n=>n.id==='mushroom').length;
 assert.ok(mushrooms>=1,'dangerous spore area always guarantees its signature mushroom source');
 assert.ok(getFieldBiome('spore_gate','risk').resources[0][1]>=8,'spore ecology weights mushrooms more heavily');
});
test('all 14 subarea IDs resolve and route choices physically switch scenic biome metadata',()=>{
 const all=['herb_path','glow_mushroom','old_tree_edge','forest_garden','forest_secret','spore_gate','spore_roots',
 'hot_spring_shallows','steam_crack','ember_edge','steam_lake','spring_market','ember_gate','ember_side'];
 assert.equal(new Set(all.map(x=>getFieldBiome(x,x.includes('spring')?'spring_safe':'safe').zoneId)).size,14);
 const s=newGame();nextPhase(s,'field');enterField(s,'safe');
 const old=s.field.biome.style;
 s.field.nodes.find(n=>n.key==='target').claimed=true;
 assert.ok(completeFieldSegment(s));const pick=s.field.choices.find(x=>x.id==='glow_mushroom');
 assert.ok(pick);assert.ok(chooseFieldBranch(s,pick.choiceId));
 assert.notEqual(s.field.biome.style,old);
 assert.equal(s.field.biome.style,'glow');
 assert.ok(s.field.nodes.some(n=>n.id==='mushroom'));
});
const actors=[
 {id:'helper',x:.145,y:.345},{id:'waiter',x:.5,y:.485},
 {id:'guest-left',x:.183,y:.653},{id:'guest-right',x:.817,y:.653},
 {id:'hero',x:.5,y:.365}
];
const guests=[
 {id:'guest-left',text:'哇，开饭喽！',priority:5},
 {id:'guest-right',text:'这道菜太辣啦！',priority:7}
];
const staff={id:'staff-helper-started',staffRole:'helper',text:'火候交给阿火！',priority:3};
test('screenshot regression: customer and employee bubbles attach above correct heads with short tails',()=>{
 for(const [w,h] of [[320,568],[375,667],[390,844]]){
  const ps=placeRestaurantSpeech(guests,staff,actors,w,h);
  for(const cue of [...guests,staff]){
   const p=ps.get(cue.id);
   assert.ok(p,cue.id);
   const a=actors.find(x=>x.id===(cue.staffRole||cue.id));
   const x=a.x*w,y=a.y*h;
   assert.ok(p.y+p.height<y-15,'bubble must be above speaker: '+cue.id);
   assert.ok(Math.abs((p.x+p.width/2)-x)<32,'speech teleported horizontally: '+cue.id);
   assert.ok(Math.hypot(p.tipX-p.baseX,p.tipY-p.baseY)<=40,'detached pointer: '+cue.id);
   assert.ok(Math.abs(p.tipX-x)<.01,'tail must point to actual speaker: '+cue.id);
  }
 }
});

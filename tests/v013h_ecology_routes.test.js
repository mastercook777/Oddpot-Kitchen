import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame,enterField,completeFieldSegment,chooseFieldBranch,
 fieldBranchChoices,buildFieldMap,fieldBagSlotsUsed,addFieldBag,settleField} from '../src/engine.js';
import {getFieldBiome} from '../src/field_biomes_v081.js';
import {fieldDailyTarget,fieldHarvestTargetSuffix} from '../src/field_target_v012f.js';
import {MARKET_ROTATION_STAPLES,ING} from '../src/data.js';

const routes=['safe','risk','spring_safe','spring_risk'];
const startZone={safe:'herb_path',risk:'old_tree_edge',
 spring_safe:'hot_spring_shallows',spring_risk:'ember_edge'};
const base=(route,seed=20261015)=>{
 const s=newGame(seed);s.phase='field';assert.equal(enterField(s,route),true);return s;
};
const clear=f=>{const n=f.nodes.find(n=>n.key==='target');assert.ok(n);n.claimed=true;};
const step=(s,choice)=>{
 clear(s.field);assert.equal(completeFieldSegment(s),true);
 const e=s.field.choices[choice];assert.ok(e);
 assert.equal(chooseFieldBranch(s,e.choiceId),true);
};
test('new explorations ignore any stale selected ingredient; every mandatory pickup comes from actual zone ecology',()=>{
 for(const route of routes)for(const ingredient of MARKET_ROTATION_STAPLES){
  const s=newGame(26001);assert.equal(Object.hasOwn(s,'selectedTarget'),false);
  s.phase='field';s.selectedTarget=ingredient;
  assert.equal(enterField(s,route),true);
  const f=s.field,zone=startZone[route];
  assert.equal(f.targetMode,'ecology');
  assert.equal(f.dailyTarget,null);
  assert.equal(fieldDailyTarget(f),null);
  assert.equal(f.biome.zoneId,zone);
  assert.equal(f.nodes.find(n=>n.key==='target').id,getFieldBiome(zone,route).primary);
  const n=f.nodes.find(n=>n.key==='target');
  assert.match(fieldHarvestTargetSuffix(f,n),/本区采集完成/);
  assert.doesNotMatch(fieldHarvestTargetSuffix(f,n),/今日目标/);
  for(const idx of [0,0]){
   step(s,idx);
   assert.equal(s.field.nodes.find(n=>n.key==='target').id,
    getFieldBiome(s.field.biome.zoneId,s.field.route).primary);
  }
  assert.equal(s.field.segmentIndex,3);
  assert.equal(fieldBranchChoices(s.field).length,0);
 }
});
test('real 3-zone route graph reaches all 14 regions without consecutive copy, repeat or 4th map',()=>{
 const seen=new Set();
 const examples={};
 for(const route of routes)for(const a of [0,1])for(const b of [0,1]){
  const s=base(route,27129+a*17+b);
  const zones=[s.field.biome.zoneId],styles=[s.field.biome.style];
  step(s,a);zones.push(s.field.biome.zoneId);styles.push(s.field.biome.style);
  step(s,b);zones.push(s.field.biome.zoneId);styles.push(s.field.biome.style);
  for(const zone of zones)seen.add(zone);
  assert.equal(zones.length,3);
  assert.notEqual(zones[0],zones[1],route);
  assert.notEqual(zones[1],zones[2],route);
  assert.notEqual(styles[0],styles[1],route+' must change biome between entry and mid-run');
  assert.notEqual(styles[1],styles[2],route+' must change biome before endpoint');
  if(route.includes('risk'))assert.ok(s.field.dangerCommitment);
  examples[route+'-'+a+b]=zones.join(' -> ');
 }
 assert.equal(seen.size,14,JSON.stringify({seen:[...seen].sort(),examples}));
});
test('gather and hunt are distinct food supply paths with real enemy loot and no fake field payout',()=>{
 for(const region of ['forest','spring'])for(let seed=1;seed<=24;seed++){
  const gather=base(region==='forest'?'safe':'spring_safe',seed*137);
  const hunt=base(region==='forest'?'risk':'spring_risk',seed*137);
  assert.notEqual(gather.field.biome.style,hunt.field.biome.style);
  assert.ok(gather.field.nodes.length>=hunt.field.nodes.length,
   'gather should start with at least as many static pickup pockets');
  assert.equal(hunt.field.bagStacks.length,0);
  const ingredient=hunt.field.nodes.find(n=>n.key==='target').id,old=hunt.inventory[ingredient];
  const received=addFieldBag(hunt.field,ingredient,2);
  assert.equal(received,2);
  assert.equal(hunt.inventory[ingredient],old,'nothing enters warehouse before real settlement');
  assert.ok(fieldBagSlotsUsed(hunt.field)<=hunt.field.capacity);
  assert.equal(settleField(hunt),true);
  assert.equal(hunt.inventory[ingredient],old+2);
  assert.equal(settleField(hunt),false);
  assert.ok(!hunt.field.bag.beef||hunt.field.bag.beef<=2,'no forged combat meat rewards');
 }
});
test('active schema4 exploration without ecology flag still gets the historical branch choices',()=>{
 const s=base('safe',90112),f=s.field;
 delete f.targetMode;f.dailyTarget='chili';
 assert.equal(fieldDailyTarget(f),'chili');
 clear(f);assert.equal(completeFieldSegment(s),true);
 assert.equal(f.choices[0].id,'glow_mushroom');
 assert.equal(f.choices[1].id,'old_tree_edge');
 assert.equal(chooseFieldBranch(s,f.choices[0].choiceId),true);
 assert.equal(f.biome.zoneId,'glow_mushroom');
});
test('route selection screen has two strategies and no clickable or forced material target',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const data=readFileSync(new URL('../src/data.js',import.meta.url),'utf8');
 assert.match(app,/经营备料提示/);
 assert.match(app,/stockHint/);
 assert.match(app,/采集路线/);
 assert.match(app,/狩猎路线/);
 assert.doesNotMatch(app,/data-target="/);
 assert.doesNotMatch(app,/closest\('\[data-target\]'\)/);
 assert.doesNotMatch(app,/game\.selectedTarget\s*=/);
 assert.match(data,/id:'safe',name:'采集路线'/);
 assert.match(data,/id:'risk',name:'狩猎路线'/);
});

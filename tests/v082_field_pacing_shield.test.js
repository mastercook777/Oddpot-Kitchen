import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,nextPhase,enterField,completeFieldSegment,chooseFieldBranch} from '../src/engine.js';
import {startActionField,stepActionField,useFieldSkill} from '../src/field_v04.js';
import {generateBiomeMap} from '../src/field_biomes_v081.js';

const field=(seed=42,route='safe')=>{
 const s=newGame(seed);nextPhase(s,'field');assert.ok(enterField(s,route));
 assert.ok(startActionField(s));return s;
};
const incoming=(f,front=true,source='pepper')=>({
 x:f.pos.x,y:f.pos.y+(front?-.05:.05),vx:0,vy:0,life:2,
 ownerX:f.pos.x,ownerY:f.pos.y+(front?-2:2),source
});
test('WOK physical shield automatically blocks one frontal hit and recharges after eight simulation seconds',()=>{
 const s=field(),f=s.field;f.enemies=[];f.hazards=[];f.facing={x:0,y:-1};
 assert.equal(f.shieldCharge,true);
 f.projectiles=[incoming(f)];
 stepActionField(s,0,0,.05);
 assert.equal(f.hp,3);
 assert.equal(f.shieldCharge,false);
 assert.ok(f.shieldCooldown>=7.95);
 assert.ok(f.shieldFlash>0);
 f.damageCd=0;f.projectiles=[incoming(f,false)];stepActionField(s,0,0,.05);
 assert.equal(f.hp,2,'rear hit must not be defended');
 f.projectiles=[];f.damageCd=100;
 for(let i=0;i<140;i++)stepActionField(s,0,0,.06);
 assert.equal(f.shieldCharge,true);
 assert.equal(f.shieldCooldown,0);
});
test('the manually activated lid parry blocks one attack without consuming the passive charge',()=>{
 const s=field(),f=s.field;f.enemies=[];f.hazards=[];f.facing={x:0,y:-1};
 assert.equal(useFieldSkill(s),true);
 assert.ok(f.guardTime>=.45);
 f.projectiles=[incoming(f)];
 stepActionField(s,0,0,.05);
 assert.equal(f.hp,3);
 assert.equal(f.shieldCharge,true);
 assert.equal(f.guardTime,0);
 assert.equal(useFieldSkill(s),false,'active skill still uses its cooldown');
});
test('a wok shield does not protect against ground steam or lava-like environmental hazards',()=>{
 const s=field(23,'spring_safe'),f=s.field;f.enemies=[];f.facing={x:0,y:-1};
 f.hazards=[{x:2,y:10}];f.elapsed=3.58;
 stepActionField(s,0,0,.05);
 assert.equal(f.hp,2);
 assert.equal(f.shieldCharge,true);
});
test('same biome can spawn different deterministic group sizes and enemy species',()=>{
 const signatures=new Set(),types=new Set(),counts=new Set();
 for(let seed=1;seed<=36;seed++){
  const s=newGame(seed);nextPhase(s,'field');enterField(s,'risk');
  const map=generateBiomeMap({...s,fieldZoneId:'old_tree_edge'},'risk','mushroom');
  s.field.biome=map.biome;s.field.obstacles=map.obstacles;
  startActionField(s);
  const signature=s.field.enemies.map(e=>[e.kind,e.x.toFixed(2),e.y.toFixed(2)]).join('|');
  signatures.add(signature);counts.add(s.field.enemies.length);
  s.field.enemies.forEach(e=>types.add(e.kind));
 }
 assert.ok(signatures.size>=10,'positions/types should not be identical between runs');
 assert.ok(counts.size>=2,'each zone should not always have the same enemy count');
 assert.ok(types.has('sporeling')&&types.has('boar'),'fungal boss approach uses distinct enemy archetypes');
});
test('a 3-segment exploration offers room for the boss reward and never auto-generates rare harvest',()=>{
 const s=field(42,'risk');const total=[];
 for(let i=0;i<3;i++){
  const f=s.field;
  total.push(f.nodes.filter(n=>n.type!=='event').length);
  assert.ok(f.nodes.every(n=>n.id!=='mushroom_heart'&&n.id!=='ember_pepper'),
   'rare ingredients must come from defeated boss, not normal harvest');
  if(i===2)break;
  f.nodes.find(n=>n.key==='target').claimed=true;
  assert.equal(completeFieldSegment(s),true);
  assert.equal(f.choices.length,2);
  assert.equal(chooseFieldBranch(s,f.choices[0].choiceId),true);
  startActionField(s);
 }
 assert.ok(total.every(n=>n>=2&&n<=6),'each field segment should have sparse resources');
 assert.ok(s.field.enemies.some(e=>e.isBoss),'third danger segment still offers boss reward');
});

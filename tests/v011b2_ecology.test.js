import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,enterField,completeFieldSegment,chooseFieldBranch,addFieldBag,discardFieldStack,settleField} from '../src/engine.js';
import {startActionField,stepActionField,useFieldSkill} from '../src/field_v04.js';
import {ECOLOGY_ENCOUNTERS,createEcologyEnemies,ecologyEngagedEnemies,ecologyHasSight,ecologyChargeEnd,moveEcologyEnemy,stepEcologyEnemy,drawEcologyWarning} from '../src/field_ecology_v011b2.js';
import {fieldTilePath} from '../src/field_rules_v011a.js';
const zones=['herb_path','glow_mushroom','old_tree_edge','forest_garden','hot_spring_shallows','steam_crack','ember_edge','steam_lake'];
function game(zone='herb_path',risk=false,seed=20261014){const s=newGame(seed);s.phase='field';s.fieldZoneId=zone;enterField(s,/^(hot_|steam_|ember_)/.test(zone)?(risk?'spring_risk':'spring_safe'):(risk?'risk':'safe'));startActionField(s);return s;}
const blocked=(f,p,r=.18)=>p.x<r||p.y<r||p.x>f.worldW-r||p.y>f.worldH-r||f.obstacles.some(o=>Math.abs(p.x-o.x-.5)<.4+r&&Math.abs(p.y-o.y-.5)<.4+r);
const plain=()=>({worldW:12,worldH:16,pos:{x:5.5,y:7.5},obstacles:[],projectiles:[],enemies:[],elapsed:0,finished:false});
const actor=(kind='chicken',x=5.5,y=5.5)=>({id:kind,kind,x,y,hp:kind==='boar'?4:3,maxHp:4,home:{x,y},brainVersion:'0.11-B2',groupId:0,cooldown:0});
const callbacks={blocked,hurt(){}};
test('eight ecologies × sixteen seeds × both risks spawn deterministic safe, reachable groups',()=>{
 const signatures=new Set();
 for(const zone of zones)for(let seed=1;seed<=16;seed++)for(const risk of [false,true]){
  const s=game(zone,risk,seed),f=s.field,enemies=f.enemies;
  assert.equal(f.encounterVersion,'0.11-B2');assert.ok(enemies.length>=(risk?4:2)&&enemies.length<=(risk?7:4));
  const config=ECOLOGY_ENCOUNTERS[f.biome.style];assert.ok(new Set(enemies.map(e=>e.kind)).size>=2);
  for(const e of enemies){assert.ok(config.mix.includes(e.kind));assert.ok(!blocked(f,e));assert.ok(Math.hypot(e.x-f.spawn.x,e.y-f.spawn.y)>=2.7);assert.ok(fieldTilePath(f,f.spawn,e,{avoidHazards:true}).length>0);
   for(const n of f.nodes.filter(n=>n.type==='event'||n.key==='target'))assert.ok(Math.hypot(e.x-n.x,e.y-n.y)>=1.2);
   assert.equal(e.maxHp,e.kind==='boar'?4:['chicken','steam_crab'].includes(e.kind)?3:2);
  }
  const other=game(zone,risk,seed);assert.deepEqual(enemies,other.field.enemies);
  const before=JSON.stringify(f);createEcologyEnemies({...f,nodes:f.nodes.map(n=>({...n,x:n.x-.5,y:n.y-.5}))},seed);assert.equal(JSON.stringify(f),before);
  signatures.add(enemies.map(e=>[e.kind,e.x,e.y]).join('|'));
 }
 assert.ok(signatures.size>100);
});
test('active ordinary threats cap at three, or two during boss fight; walls prevent discovery',()=>{
 const f=plain();f.enemies=Array.from({length:7},(_,i)=>({...actor('chicken',4.5+i*.2,7.5),id:'c'+i}));
 assert.equal(ecologyEngagedEnemies(f).size,3);
 f.enemies.push({id:'boss',isBoss:true,hp:10,x:5,y:6});assert.equal(ecologyEngagedEnemies(f).size,2);
 f.enemies=[actor('pepper',7.5,7.5)];f.obstacles=[{x:6,y:7}];assert.equal(ecologyHasSight(f,f.pos,f.enemies[0]),false);assert.equal(ecologyEngagedEnemies(f).size,0);
});
test('obstacle routing reaches the actual target through a corridor and uses simulated cache time',()=>{
 const f=plain(),e=actor('chicken',3.5,7.5),target={x:7.5,y:7.5};f.obstacles=[{x:5,y:6},{x:5,y:7},{x:5,y:8}];
 assert.equal(ecologyHasSight(f,e,target),false);
 for(let i=0;i<400;i++){moveEcologyEnemy(f,e,target,1.1,.04,blocked);assert.ok(!blocked(f,e));}
 assert.ok(Math.hypot(e.x-target.x,e.y-target.y)<.2);assert.ok(e.pathWait<=.4);
});
test('boar locks a short charge, can be sidestepped and stops at new walls',()=>{
 const f=plain(),e=actor('boar',5.5,5.5);f.enemies=[e];let hit=0;
 stepEcologyEnemy(f,e,0,true,{blocked,hurt:()=>hit++});assert.equal(e.warning,1);const aim={...e.aim},end={...e.ecologyAttack.end};
 f.pos.x+=2;stepEcologyEnemy(f,e,.99,true,callbacks);assert.deepEqual(e.aim,aim);stepEcologyEnemy(f,e,.02,true,callbacks);
 for(let i=0;i<30&&e.ecologyRush;i++)stepEcologyEnemy(f,e,.04,true,{blocked,hurt:()=>hit++});assert.equal(hit,0);assert.equal(e.ecologyRush,null);assert.ok(Math.hypot(e.x-5.5,e.y-5.5)<=1.8+.001);
 const wall=plain();wall.obstacles=[{x:5,y:6}];const short=ecologyChargeEnd(wall,actor('boar',5.5,5.5),{x:5.5,y:9.5},blocked);assert.ok(short.y<6);
 e.ecologyRush={end:{x:e.x,y:12}};e.ecologyAttack={origin:{x:e.x,y:e.y},end:{x:e.x,y:12}};f.obstacles=[{x:5,y:8}];for(let i=0;i<50;i++)stepEcologyEnemy(f,e,.04,true,callbacks);assert.ok(!blocked(f,e));
 assert.ok(Number.isFinite(end.y));
});
test('ranged enemies retreat, lock shots, and never fire through changed line of sight',()=>{
 for(const kind of ['sporeling','pepper']){
  const f=plain(),e=actor(kind,5.5,6.6);f.enemies=[e];const y=e.y;stepEcologyEnemy(f,e,.04,true,callbacks);assert.ok(e.y<y);const locked={...e.aim};f.pos={x:8.5,y:7.5};
  stepEcologyEnemy(f,e,1,true,callbacks);assert.equal(f.projectiles.length,1);const p=f.projectiles[0];assert.ok(p.vy>0);assert.equal(p.source,kind==='sporeling'?'spore':'pepper');assert.ok(locked.x===5.5);
  e.warning=.01;e.aim={x:5.5,y:9.5};e.attackOrigin={x:e.x,y:e.y};f.obstacles=[{x:5,y:7}];stepEcologyEnemy(f,e,.03,true,callbacks);assert.equal(f.projectiles.length,1);
 }
});
test('crab returns to home when player leaves its guard range; chicken retreats after peck',()=>{
 const f=plain(),crab=actor('steam_crab');f.enemies=[crab];f.pos={x:10,y:12};crab.x+=3;
 assert.equal(ecologyEngagedEnemies(f).size,0);const distance=Math.hypot(crab.x-crab.home.x,crab.y-crab.home.y);stepEcologyEnemy(f,crab,.05,false,callbacks);assert.ok(Math.hypot(crab.x-crab.home.x,crab.y-crab.home.y)<distance);
 const chicken=actor('chicken',5.5,7);f.pos={x:5.5,y:7.8};chicken.aim={...f.pos};chicken.attackOrigin={x:chicken.x,y:chicken.y};chicken.warning=.01;stepEcologyEnemy(f,chicken,.03,true,callbacks);assert.equal(chicken.retreatTime,.65);
});
test('death or excluded threat cancels pending normal charge without a hit',()=>{
 const f=plain(),e=actor('boar');e.warning=.3;e.ecologyAttack={end:{x:5,y:8},origin:{x:5,y:5}};e.ecologyRush={end:{x:5,y:8}};
 stepEcologyEnemy(f,e,.03,false,{blocked,hurt:()=>assert.fail('inactive hit')});assert.equal(e.warning,0);assert.equal(e.ecologyRush,null);
 e.hp=0;e.ecologyAttack={};stepEcologyEnemy(f,e,.03,true,callbacks);assert.equal(e.ecologyAttack,null);
});
test('charge warning matches real width and endpoint, stays smooth and read-only',()=>{
 const e=actor('boar');e.ecologyAttack={origin:{x:5,y:5},end:{x:5,y:6}};const before=JSON.stringify(e),calls=[];
 const c=new Proxy({},{get:(o,k)=>(...a)=>calls.push([k,...a]),set:(o,k,v)=>(calls.push([k,v]),true)});drawEcologyWarning(c,e);
 assert.ok(calls.some(x=>x[0]==='lineWidth'&&x[1]===.96));assert.ok(calls.some(x=>x[0]==='arc'&&x[3]===.48));assert.ok(!calls.some(x=>x[0]==='fillRect'));assert.equal(JSON.stringify(e),before);
});
test('saved active alpha.5 segment is not respawned or assigned a new brain',()=>{
 const s=game(),f=s.field;delete f.encounterVersion;delete f.ecologyStats;f.enemies=f.enemies.map(({brainVersion,home,groupId,...e})=>e);const before=JSON.stringify(s);
 assert.equal(startActionField(s),false);assert.equal(JSON.stringify(s),before);
 const old=game();old.field.action=false;old.field.legacyField=true;startActionField(old);assert.ok(old.field.enemies.every(e=>!e.brainVersion));
});
test('WOK interrupts B2 warnings and rushes without pushing a surviving boar through a wall',()=>{
 const s=game(),f=s.field,e=actor('boar',5.9,7.5);f.pos={x:5.3,y:7.5};f.enemies=[e];f.obstacles=[{x:6,y:7}];
 e.warning=.8;e.ecologyAttack={origin:{x:e.x,y:e.y},end:{x:4,y:7.5}};e.ecologyRush={end:{x:4,y:7.5}};
 assert.ok(useFieldSkill(s));assert.equal(e.hp,2);assert.equal(e.warning,0);assert.equal(e.ecologyRush,null);assert.equal(e.ecologyAttack,null);assert.ok(!blocked(f,e));assert.ok(e.x<6);
});
test('serialized B2 combat resumes deterministically, including movement paths and warnings',()=>{
 const s=game('old_tree_edge',true,47);s.field.damageCd=999;s.field.pos={...s.field.enemies[0]};for(let i=0;i<20;i++)stepActionField(s,.2,-1,.03);
 const loaded=JSON.parse(JSON.stringify(s));for(let i=0;i<70;i++){stepActionField(s,1,0,.03);stepActionField(loaded,1,0,.03);}assert.deepEqual(s,loaded);
});
test('actual pack loot still drops once and only enters inventory at unique retreat settlement',()=>{
 const s=game('forest_garden'),f=s.field;const e=f.enemies[0];e.kind='chicken';e.home={...f.pos};e.x=f.pos.x+.5;e.y=f.pos.y;e.hp=2;f.enemies=[e];f.obstacles=[];f.nodes=[];f.damageCd=999;f.attackCd=0;
 useFieldSkill(s);assert.equal(e.hp,0);useFieldSkill(s);assert.equal(f.nodes.length,1);f.pos={x:e.x,y:e.y};const old=s.inventory.chicken;
 for(let i=0;i<32;i++)stepActionField(s,0,0,.03);assert.equal(f.bag.chicken,1);assert.equal(s.inventory.chicken,old);
 assert.ok(settleField(s));assert.equal(s.inventory.chicken,old+1);assert.equal(settleField(s),false);
});
test('per-segment real metrics count absorption, movement, carried material discards and unique summaries',()=>{
 const s=game(),f=s.field;f.enemies=[];f.hazards=[];f.obstacles=[];stepActionField(s,1,0,.04);assert.ok(f.ecologyStats.movingSeconds>0);
 f.projectiles=[{x:f.pos.x,y:f.pos.y,vx:0,vy:0,life:1,source:'spore',ownerX:f.pos.x,ownerY:f.pos.y-1}];f.facing={x:0,y:-1};stepActionField(s,0,0,.03);assert.equal(f.hp,3);assert.equal(f.ecologyStats.damageTaken,0);
 f.damageCd=0;f.projectiles=[{x:f.pos.x,y:f.pos.y,vx:0,vy:0,life:1,source:'spore'}];stepActionField(s,0,0,.03);assert.equal(f.hp,2);assert.equal(f.ecologyStats.damageTaken,1);
 addFieldBag(f,'mushroom',5);assert.equal(f.ecologyStats.collected,5);discardFieldStack(s,'mushroom-1');assert.equal(f.ecologyStats.discarded,3);
 f.nodes.find(n=>n.key==='target').claimed=true;completeFieldSegment(s);completeFieldSegment(s);assert.equal(f.encounterHistory.length,1);assert.equal(f.encounterHistory[0].discardRate,.6);
 chooseFieldBranch(s,f.choices[0].choiceId);startActionField(s);assert.equal(f.ecologyStats.carriedIn,2);discardFieldStack(s,'mushroom-1');settleField(s);assert.equal(f.encounterHistory.length,2);assert.equal(f.encounterHistory[1].discardRate,1);
 assert.equal(s.ledger.filter(x=>x.type==='exploration').length,1);
});

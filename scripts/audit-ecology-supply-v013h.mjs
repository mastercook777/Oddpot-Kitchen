#!/usr/bin/env node
// Quantitative ecology supply audit using real map generation + bag + enemy spawn.
// Enemy death items are *potential* only; NOT a claim to have killed enemies.
import assert from 'node:assert/strict';
import {newGame,enterField,chooseFieldBranch,completeFieldSegment,addFieldBag,
 fieldBagSlotsUsed} from '../src/engine.js';
import {startActionField} from '../src/field_v04.js';
const N=+(process.argv[process.argv.indexOf('--seeds')+1]||80);
assert.ok(Number.isInteger(N)&&N>=8&&N<=256);
const routes=['safe','risk','spring_safe','spring_risk'];
const items=['beef','chicken','chili','garlic','mushroom','cabbage','onion','potato'];
const MEAT=new Set(['beef','chicken']),PLANT=new Set(['garlic','cabbage','onion','potato','mushroom']);
const enemyToItem={pepper:'chili',sporeling:'mushroom',boar:'beef',steam_crab:'potato',chicken:'chicken'};
const records=[],pathExamples={},regions={},zones={},branchCounts={};
function zero(){return Object.fromEntries(items.map(id=>[id,0]));}
function add(dest,src){for(const [id,n] of Object.entries(src))dest[id]=(dest[id]||0)+n;}
function summary(recs){
 const fields=['harvest','combatPotential','bagHarvest','bagWithCombat','plantHarvest',
  'meatHarvest','plantCombatPotential','meatCombatPotential','enemyCount','zoneRepeats','totalHarvest'];
 const res={n:recs.length};
 for(const key of fields)res[key]=+(recs.reduce((n,r)=>n+r[key],0)/recs.length).toFixed(2);
 for(const label of ['resource','combat']){const out=zero();for(const r of recs)add(out,r[label]);res[label]=Object.fromEntries(Object.entries(out).map(([id,n])=>[id,+(n/recs.length).toFixed(2)]));}
 return res;
}
for(let k=0;k<N;k++){
 for(const route of routes){
  for(const a of [0,1])for(const b of [0,1]){
   const s=newGame(720013+k*7919);s.phase='field';
   assert.equal(enterField(s,route),true);
   const path=[],gather=zero(),potential=zero(),bag=zero(),finalBag=zero();
   let enemies=0,bagHarvest=0,bagWithCombat=0,zoneRepeats=0;
   for(let segment=1;segment<=3;segment++){
    assert.equal(startActionField(s),true);
    const f=s.field,style=f.biome.style,zone=f.biome.zoneId;
    const nodeCounts=zero(),enemyCounts=zero();
    for(const n of f.nodes){if(n.type==='event'||n.key.startsWith('boss-reward'))continue;
      if(items.includes(n.id)&&n.n>0){nodeCounts[n.id]+=n.n;gather[n.id]+=n.n;}}
    for(const enemy of f.enemies){if(enemy.isBoss||!enemyToItem[enemy.kind])continue;
     enemyCounts[enemyToItem[enemy.kind]]++;potential[enemyToItem[enemy.kind]]++;enemies++;}
    for(const id of items){
     addFieldBag(f,id,nodeCounts[id]); 
    }
    const withHarvest=Object.values(f.bag).reduce((n,x)=>n+x,0);
    bagHarvest=withHarvest;
    for(const id of items)addFieldBag(f,id,enemyCounts[id]);
    bagWithCombat=Object.values(f.bag).reduce((n,x)=>n+x,0);
    path.push({zone,style,forage:Object.fromEntries(Object.entries(nodeCounts).filter(([,n])=>n)),enemies:Object.fromEntries(Object.entries(enemyCounts).filter(([,n])=>n))});
    zones[zone]??=[];zones[zone].push({resource:nodeCounts,combat:enemyCounts,bagUsed:fieldBagSlotsUsed(f)});
    if(segment>1&&path[segment-2].style===style)zoneRepeats++;
    f.nodes.find(n=>n.key==='target').claimed=true;
    if(segment<3){assert.equal(completeFieldSegment(s),true);
      const pick=s.field.choices[segment===1?a:b];
      assert.ok(pick);branchCounts[pick.id]=(branchCounts[pick.id]||0)+1;
      assert.equal(chooseFieldBranch(s,pick.choiceId),true);
    }
   }
   const count=Object.values(gather).reduce((n,x)=>n+x,0),potentialTotal=Object.values(potential).reduce((n,x)=>n+x,0);
   const key=route+'-'+a+b;pathExamples[key]??=path.map(p=>p.zone+'('+p.style+')').join(' → ');
   records.push({route,choice:a+''+b,resource:gather,combat:potential,harvest:count,
    totalHarvest:count,combatPotential:potentialTotal,bagHarvest,bagWithCombat,
    plantHarvest:Object.entries(gather).filter(([id])=>PLANT.has(id)).reduce((n,[,v])=>n+v,0),
    meatHarvest:Object.entries(gather).filter(([id])=>MEAT.has(id)).reduce((n,[,v])=>n+v,0),
    plantCombatPotential:Object.entries(potential).filter(([id])=>PLANT.has(id)).reduce((n,[,v])=>n+v,0),
    meatCombatPotential:Object.entries(potential).filter(([id])=>MEAT.has(id)).reduce((n,[,v])=>n+v,0),
    enemyCount:enemies,zoneRepeats,path});
  }
 }
}
for(const r of routes)regions[r]=summary(records.filter(x=>x.route===r));
const allZones={};for(const [id,v] of Object.entries(zones))allZones[id]=summary(v.map(x=>({...x,harvest:Object.values(x.resource).reduce((a,b)=>a+b,0),
 combatPotential:Object.values(x.combat).reduce((a,b)=>a+b,0),bagHarvest:0,bagWithCombat:0,
 plantHarvest:Object.entries(x.resource).filter(([id])=>PLANT.has(id)).reduce((n,[,v])=>n+v,0),
 meatHarvest:Object.entries(x.resource).filter(([id])=>MEAT.has(id)).reduce((n,[,v])=>n+v,0),
 plantCombatPotential:Object.entries(x.combat).filter(([id])=>PLANT.has(id)).reduce((n,[,v])=>n+v,0),
 meatCombatPotential:Object.entries(x.combat).filter(([id])=>MEAT.has(id)).reduce((n,[,v])=>n+v,0),
 enemyCount:Object.values(x.combat).reduce((a,b)=>a+b,0),zoneRepeats:0,totalHarvest:Object.values(x.resource).reduce((a,b)=>a+b,0)
 })));
console.log('ECOLOGY_SUPPLY_JSON_BEGIN');
console.log(JSON.stringify({n:N,assumptions:'Actual generation, all static pickup amounts incl guarded nodes; all spawned enemy kills only theoretical potential; bag test harvest-first then imagined kills; no HP/actual fight or real explorations. Avoid interpreting kill potentials as guaranteed rewards.',regions,zones:allZones,branchCounts,pathExamples},null,2));
console.log('ECOLOGY_SUPPLY_JSON_END');

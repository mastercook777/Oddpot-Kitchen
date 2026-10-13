// v0.11-B0: give each three-segment expedition one *discoverable* old traveler
// until v0.11-C delivers the rare merchants and dedicated ingredients.
// The fixed plan is persisted inside the current field state. No rewards here.
import {fieldTilePath} from './field_rules_v011a.js';

const mix=n=>(Math.imul(1664525,n>>>0)+1013904223)>>>0;
export function makeFieldEncounterPlan(s,route){
 const hot=String(route).startsWith('spring'),region=hot?'spring':'forest';
 const entropy=mix((s.seed||20261009)+s.cycle*1009+s.day*139+(hot?104729:0));
 return {segment:2+(entropy%2),eventId:'traveler-'+s.cycle+'-'+s.day+'-'+region,
  kind:'legacy_traveler',region};
}

const key=(x,y)=>x+','+y;
export function insertPlannedFieldEncounter(map,plan,segment){
 if(!plan||plan.segment!==segment||!map||!Array.isArray(map.nodes))return map;
 if(map.nodes.some(n=>n.key===plan.eventId))return map; // idempotent reload
 const target=map.nodes.find(n=>n.key==='target');
 if(!target)return map;
 const path=fieldTilePath(map,map.spawn,{x:target.x+.5,y:target.y+.5},{avoidHazards:true});
 if(path.length<3)return map;
 const excluded=new Set([
   ...map.nodes.map(n=>key(n.x,n.y)),
   ...map.obstacles.map(n=>key(n.x,n.y)),
   ...map.hazards.map(n=>key(n.x,n.y)),
   key(Math.floor(map.spawn.x),Math.floor(map.spawn.y)),
   key(Math.floor(map.bossSpawn.x),Math.floor(map.bossSpawn.y))
 ]);
 // Prefer a middle step *on the visible real route* to the mandatory target.
 // Keep the NPC spatially separate from pickup collision and hazard effects.
 const candidates=path.slice(1,-1).map((p,i)=>({x:Math.floor(p.x),y:Math.floor(p.y),i}))
  .filter(p=>!excluded.has(key(p.x,p.y)));
 if(!candidates.length)return map;
 const middle=(path.length-1)/2;
 candidates.sort((a,b)=>Math.abs(a.i+1-middle)-Math.abs(b.i+1-middle));
 const where=candidates[0];
 map.nodes.push({key:plan.eventId,eventId:plan.eventId,kind:plan.kind,
  id:plan.region==='spring'?'potato':'mushroom',type:'event',
  x:where.x,y:where.y,n:1,claimed:false});
 return map;
}

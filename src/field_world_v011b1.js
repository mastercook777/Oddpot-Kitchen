// v0.11-B1: expand freshly generated 9x11 ecology maps without migrating
// already-running 0.11-A/B0 saves. All simulation entities share tile space.
import {fieldTilePath} from './field_rules_v011a.js';
const seedNext=n=>(Math.imul(1664525,n>>>0)+1013904223)>>>0;
const worldKey=(x,y)=>x+','+y;
const worldTileX=x=>Math.max(1,Math.min(10,Math.round(x*1.29+.2)));
const worldTileY=y=>Math.max(1,Math.min(14,Math.round(y*1.42+.15)));
const worldTilePoint=p=>({x:worldTileX(p.x),y:worldTileY(p.y)});
const worldSpawnPos=p=>({x:Math.min(11.4,worldTileX(Math.floor(p.x))+.5),y:Math.min(15.4,worldTileY(Math.floor(p.y))+.5)});

export function expandFieldMap(source,seed=0){
 if(!source||source.worldVersion==='0.11-B1'||source.worldW!==9||source.worldH!==11)return source;
 const map={...source,worldVersion:'0.11-B1',worldW:12,worldH:16,
  nodes:source.nodes.map(n=>({...n,...worldTilePoint(n)})),
  obstacles:source.obstacles.map(point),hazards:source.hazards.map(point),
  spawn:worldSpawnPos(source.spawn),bossSpawn:worldSpawnPos(source.bossSpawn),
  biome:{...source.biome}};
 map.x=Math.floor(map.spawn.x);map.y=Math.floor(map.spawn.y);
 // Layout variants are not just decoration. Add physical rock/tree clumps while
 // retaining a safe lane from spawn to *each* harvest and boss location.
 const occupied=new Set([...map.nodes,...map.obstacles,...map.hazards,
  {x:Math.floor(map.spawn.x),y:Math.floor(map.spawn.y)},
  {x:Math.floor(map.bossSpawn.x),y:Math.floor(map.bossSpawn.y)}]
  .map(p=>worldKey(p.x,p.y)));
 const entropy=seedNext(seedNext(seed)+seedNext(map.biome.encounterSeed||1));
 const layout=entropy%3;
 const candidates=[];
 for(let y=2;y<=13;y++)for(let x=1;x<=10;x++){
  const k=worldKey(x,y);
  if(occupied.has(k)||Math.hypot(x+.5-map.spawn.x,y+.5-map.spawn.y)<2.1)continue;
  // Two bands/lanes create distinct silhouette and detours; keep central
  // thoroughfare mostly clear so an expanded map does not become a maze.
  const band=layout===0?(x<=4||x>=8):layout===1?(y%4<=1):(x<=3||y<=5);
  if(!band)continue;
  candidates.push({x,y,score:seedNext(entropy+x*383+y*1301)});
 }
 candidates.sort((a,b)=>a.score-b.score);
 const checkpoints=[...map.nodes.map(n=>({x:n.x+.5,y:n.y+.5})),map.bossSpawn];
 let added=0;
 for(const candidate of candidates){
  if(added>=6+layout)break;
  if(map.obstacles.some(o=>Math.hypot(o.x-candidate.x,o.y-candidate.y)<1.15))continue;
  const trial={...map,obstacles:[...map.obstacles,{x:candidate.x,y:candidate.y}]};
  if(checkpoints.some(p=>fieldTilePath(trial,map.spawn,p).length===0))continue;
  // Every checkpoint must stay safely accessible around *static* hazard cells.
  if(checkpoints.some(p=>fieldTilePath(trial,map.spawn,p,{avoidHazards:true}).length===0))continue;
  map.obstacles=trial.obstacles;added++;
 }
 map.biome.layoutVariant=layout;
 map.biome.expanded=true;
 map.scenery=buildFieldScenery(map,entropy);
 return map;
}

export function buildFieldScenery(map,entropy=0){
 const occupied=new Set([...map.obstacles,...map.hazards,...map.nodes].map(p=>worldKey(p.x,p.y)));
 const props=[];
 for(let y=1;y<map.worldH-1;y++)for(let x=0;x<map.worldW;x++){
  const h=seedNext(entropy+x*7357+y*4817);
  if(h%7>2||occupied.has(worldKey(x,y)))continue;
  props.push({x:x+.24+(h%5)*.12,y:y+.25+((h>>>5)%5)*.11,
   kind:(h>>>10)%5,scale:.65+(h%4)*.14});
 }
 return props;
}

export function fieldEnemySpawnCandidates(f,seed,count=4){
 if(!f?.worldVersion||!f.nodes?.length)return [];
 const target=f.nodes.find(n=>n.key==='target')||f.nodes[0];
 const path=fieldTilePath(f,f.spawn,{x:target.x+.5,y:target.y+.5},{avoidHazards:true});
 const blocked=new Set([...f.obstacles,...f.hazards].map(p=>worldKey(p.x,p.y)));
 const chosen=[];
 const random=n=>seedNext(seed+n*7919);
 for(let i=0;i<count;i++){
  const along=path.length?path[Math.min(path.length-1,Math.floor(path.length*(.25+.57*(i+.5)/count)))]:f.bossSpawn;
  const origin={x:Math.floor(along.x),y:Math.floor(along.y)};
  const offsets=[[2,0],[-2,0],[0,2],[0,-2],[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0]];
  const shift=random(i+11)%offsets.length;
  let found=null;
  for(let k=0;k<offsets.length;k++){
   const [dx,dy]=offsets[(shift+k)%offsets.length],x=origin.x+dx,y=origin.y+dy;
   const p={x:x+.5,y:y+.5};
   if(x<1||x>=f.worldW-1||y<1||y>=f.worldH-1||blocked.has(worldKey(x,y)))continue;
   if(Math.hypot(p.x-f.spawn.x,p.y-f.spawn.y)<2.7)continue;
   if(chosen.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<1.7))continue;
   found=p;break;
  }
  if(!found){
   // Never fall back onto a blocked tile: a distant enemy in a wall can be
   // impossible to fight and break a Boss / nearby guarded pickup encounter.
   for(let y=2;y<f.worldH-2&&!found;y++)for(let x=1;x<f.worldW-1;x++){
    const p={x:x+.5,y:y+.5};
    if(!blocked.has(worldKey(x,y))&&Math.hypot(p.x-f.spawn.x,p.y-f.spawn.y)>2.7
       &&chosen.every(q=>Math.hypot(q.x-p.x,q.y-p.y)>1.7)){found=p;break}
   }
  }
  if(found)chosen.push(found);
 }
 return chosen;
}

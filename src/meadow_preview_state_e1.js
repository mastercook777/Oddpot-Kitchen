// All preview state is in memory. Never load/save the player's localStorage.
import {newGame,enterField} from './engine.js';
import {startActionField} from './field_v04.js';
import {fieldTilePath} from './field_rules_v011a.js';
export const MEADOW_PREVIEW_MODES=['hybrid-e1','hybrid-e0','pixel','legacy'];
export const HYBRID_PREVIEW_ZONES=['herb_path','glow_mushroom','old_tree_edge','forest_garden','hot_spring_shallows','steam_crack','ember_edge','steam_lake'];
export function createMeadowPreview(seed=20261013,zoneId='herb_path'){
 const s=newGame(seed);s.phase='field';
 s.fieldZoneId=HYBRID_PREVIEW_ZONES.includes(zoneId)?zoneId:'herb_path';
 enterField(s,/^(hot_|steam_|ember_)/.test(s.fieldZoneId)?'spring_safe':'safe');startActionField(s);
 s.field.artPreviewMode='hybrid-e1';return s;
}
export function setMeadowPreviewMode(s,mode){
 if(!MEADOW_PREVIEW_MODES.includes(mode))return false;
 s.field.artPreviewMode=mode;return true;
}
export function meadowPreviewPose(s,name){
 const f=s.field,node=f.nodes.find(n=>n.key==='target');
 const path=fieldTilePath(f,f.spawn,node,{avoidHazards:true});
 if(name==='spawn')return {...f.spawn};
 if(name==='mid')return path[Math.floor(path.length*.5)]||{...f.spawn};
 if(name==='harvest')return path[Math.max(0,path.length-2)]||{...f.spawn};
 if(name==='tree'){
  const o=f.obstacles.find((o,i)=>i%5!==2)||f.obstacles[0];
  if(o){const candidates=[{x:o.x+.5,y:o.y+1.5},{x:o.x+1.5,y:o.y+.5},{x:o.x-.5,y:o.y+.5}];
   return candidates.find(p=>fieldTilePath(f,f.spawn,p,{avoidHazards:true}).length)||{...f.spawn};
  }
 }
 return {...f.spawn};
}

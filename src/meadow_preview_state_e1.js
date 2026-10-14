import {specialEncounterOffer} from './field_encounters_v011c.js';
// All preview state is in memory. Never load/save the player's localStorage.
import {newGame,enterField,syncFieldBagStacks} from './engine.js?v=0.11.0-alpha.7';
import {startActionField,stepActionField} from './field_v04.js?v=0.11.0-alpha.7';
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

// Focus fixtures use the formal renderer/controller, and never touch real saves.
export function prepareGPreview(s,name){
 if(!['boss_spore','boss_ember','merchant'].includes(name))return false;
 const f=s.field;f.pos={x:6,y:9};f.x=6;f.y=9;
 f.obstacles=f.obstacles.filter(o=>Math.hypot(o.x+.5-6,o.y+.5-8)>3.8);
 f.hazards=f.hazards.filter(o=>Math.hypot(o.x-6,o.y-8)>3.8);
 f.nodes=f.nodes.filter(n=>Math.hypot(n.x-6,n.y-8)>3.8);f.enemies=[];
 f.activeEvent=null;f.projectiles=[];f.playerProjectiles=[];f.bossZones=[];f.harvestNode=null;f.harvestProgress=0;
 f.hp=3;f.finished=false;f.damageCd=0;f.attackCd=1;f.moving=false;
 if(name==='merchant')f.nodes.push({key:'g-traveler',type:'event',eventId:'legacy_traveler',x:7.2,y:8.5,claimed:false});
 else f.enemies.push({id:'g-'+name,kind:name,isBoss:true,x:6,y:6.7,hp:10,maxHp:10,cooldown:1.2,warning:0,slowTime:0});
 return true;
}

export function prepareEcologyPreview(s,risk=false){
 const zone=s.field.biome.zoneId,seed=s.seed,route=/^(hot_|steam_|ember_)/.test(zone)?(risk?'spring_risk':'spring_safe'):(risk?'risk':'safe');
 const game=newGame(seed);game.phase='field';game.fieldZoneId=zone;enterField(game,route);startActionField(game);
 s.field=game.field;s.field.artPreviewMode='hybrid-e1';
 const e=s.field.enemies.find(x=>x.kind==='boar')||s.field.enemies[0];
 if(!e)return false;
 const tiles=fieldTilePath(s.field,s.field.spawn,e,{avoidHazards:true});
 const p=tiles.slice(0,Math.max(1,tiles.length-2)).reverse().find(p=>s.field.nodes.filter(n=>n.type==='event').every(n=>Math.hypot(p.x-n.x,p.y-n.y)>1.1))||s.field.spawn;s.field.pos={...p};s.field.x=p.x;s.field.y=p.y;
 return true;
}

export function prepareSpecialPreview(s,view,scenario='ready'){
 const kind=view==='merchant_trade'?'merchant':view==='traveler_trade'?'traveler':view==='ecology_event'?'ecology':null;if(!kind)return false;
 prepareGPreview(s,'merchant');const f=s.field,n=f.nodes.find(n=>n.key==='g-traveler'),region=f.region;
 Object.assign(n,{kind,region,eventId:'preview-'+kind,status:'available',offer:specialEncounterOffer(kind,region)});
 s.ledger=[];s.coins=scenario==='no-money'?0:120;f.capacity=scenario==='full-bag'?1:8;
 f.bag=kind==='traveler'&&scenario!=='no-material'?{[region==='spring'?'potato':'mushroom']:scenario==='full-bag'?3:2}:{};
 if(scenario==='full-bag'&&kind!=='traveler')f.bag={garlic:3};
 if(scenario==='low-hp')f.hp=1;
 syncFieldBagStacks(f);if(f.ecologyStats){f.ecologyStats.collected=0;f.ecologyStats.carriedIn=Object.values(f.bag).reduce((a,b)=>a+b,0);}
 f.pos={x:n.x-.65,y:n.y+.1};f.x=f.pos.x;f.y=f.pos.y;f.activeEvent=null;
 stepActionField(s,0,0,0);return true;
}

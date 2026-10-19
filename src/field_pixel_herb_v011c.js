// Herb Path art vertical slice: all paint is snapped to a 16px virtual tile.
// Original reproducible raster sprites, not antialiased geometric decorations.
// No gameplay mutations or DOM work until the first in-game draw.
import {fieldTilePath} from './field_rules_v011a.js';

export const HERB_PIXEL_TILE=16;
export const HERB_PIXEL_PALETTE=Object.freeze({
 outline:'#29352f',deep:'#485e4c',grass:'#63775d',grassLight:'#74886c',
 leaf:'#899b78',sun:'#abb793',dirt:'#96734d',dirtLight:'#c49a67',
 bark:'#75523d',barkLight:'#a47a50',rock:'#697871',rockLight:'#acb5a0',
 shine:'#f7dfa1',cream:'#f0e5c7',chili:'#d96142',mushroom:'#bd654c'
});
const PH=HERB_PIXEL_PALETTE;
const herbHash=n=>(Math.imul(1664525,n>>>0)+1013904223)>>>0;
const herbSprites=new Map();
// One weakly-cached authored layout per real field object: never BFS every frame.
const herbGroundPlans=new WeakMap();
const herbTileKey=(x,y)=>x+','+y;
const herbPaintRect=(ctx,x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h)};
const herbPaintDot=(ctx,x,y,color)=>herbPaintRect(ctx,x,y,1,1,color);

export function isHerbPixelSlice(f){
 return !!(f?.worldVersion==='0.11-B1' && f?.biome?.zoneId==='herb_path' && f?.artPreviewMode!=='legacy');
}

export function herbPixelSpriteNames(){
 return ['grass0','grass1','grass2','grass3','tree0','tree1','rock',
  'garlic','cabbage','onion','potato','mushroom','chili','beef','chicken',
  'traveler','merchant','nectar_traveler','encounter_bloom','encounter_crystal','vent','flower','tuft','spark','ember_pepper','mushroom_heart','tide_sour_pulp','starlit_nectar','cloud_rice','sky_moss','storm_egg','sour_bell','gale_core'];
}
export function herbPixelSpriteSize(name){
 if(!herbPixelSpriteNames().includes(name)&&!/^trail:[0-9]+:[0-3]$/.test(name))return null;
 return name.startsWith('tree')?{width:24,height:30}:
  ['traveler','merchant','nectar_traveler'].includes(name)?{width:20,height:28}:{width:16,height:16};
}
function herbPaintGrass(ctx,variant=0){
 herbPaintRect(ctx,0,0,16,16,PH.grass);
 // Six or fewer CLUSTERED marks per tile, down from 18 ungrouped specks.
 // Variant zero is nearly calm; remaining patches use two-pixel group shapes.
 const groups=[[[11,10]],[[2,10],[10,4]],[[5,5],[10,11]],[[2,2],[10,12],[6,8]]][variant]||[];
 for(const [i,[x,y]] of groups.entries()){
  const shade=i===0?PH.deep:i%2?PH.grassLight:PH.leaf;
  herbPaintRect(ctx,x,y,i%3===0?3:2,i%2===0?2:1,shade);
 }
 if(variant===3)herbPaintRect(ctx,7,8,2,1,PH.sun);
}
function herbPaintTrail(ctx,mask,variant){
 herbPaintGrass(ctx,variant);
 const d=PH.dirt,d2=PH.dirtLight;
 // Connected trail arms are drawn only toward real adjacent walkable trail cells.
 herbPaintRect(ctx,4,4,8,8,d);herbPaintRect(ctx,5,4,6,2,d2);
 if(mask&1){herbPaintRect(ctx,4,0,8,6,d);herbPaintRect(ctx,5,0,6,2,d2);}
 if(mask&2){herbPaintRect(ctx,10,4,6,8,d);herbPaintRect(ctx,11,5,5,2,d2);}
 if(mask&4){herbPaintRect(ctx,4,10,8,6,d);herbPaintRect(ctx,5,11,6,2,d2);}
 if(mask&8){herbPaintRect(ctx,0,4,6,8,d);herbPaintRect(ctx,0,5,5,2,d2);}
 // Sparse path texture: a single pebble/footprint per connected tile.
 if(variant===2)herbPaintRect(ctx,6,8,2,1,PH.bark);
 if(variant===3)herbPaintRect(ctx,10,11,2,1,PH.dirtLight);
}
function herbPaintTree(ctx,variant){
 // 24x30: stout, blocky canopy; trunk remains visibly anchored inside solid tile.
 herbPaintRect(ctx,8,18,9,11,PH.outline);herbPaintRect(ctx,10,18,5,9,PH.bark);
 herbPaintRect(ctx,11,21,2,5,PH.barkLight);
 herbPaintRect(ctx,5,10,16,13,PH.outline);herbPaintRect(ctx,3,12,20,7,PH.outline);
 herbPaintRect(ctx,7,5,12,17,PH.deep);herbPaintRect(ctx,4,11,17,8,PH.deep);
 herbPaintRect(ctx,6,7,15,12,PH.grass);herbPaintRect(ctx,4,13,17,4,PH.grass);
 herbPaintRect(ctx,8,3,10,12,PH.deep);herbPaintRect(ctx,9,4,8,12,PH.grass);
 herbPaintRect(ctx,3,13,7,4,PH.grassLight);herbPaintRect(ctx,7,7,10,4,PH.grassLight);
 herbPaintRect(ctx,10,4,6,3,PH.leaf);herbPaintRect(ctx,6,11,5,3,PH.leaf);
 herbPaintRect(ctx,15,10,4,5,PH.grassLight);herbPaintRect(ctx,16,11,2,2,PH.sun);
 if(variant){herbPaintRect(ctx,11,6,5,3,PH.sun);herbPaintRect(ctx,4,15,4,2,PH.leaf);}
 else {herbPaintRect(ctx,6,8,3,2,PH.sun);herbPaintRect(ctx,14,6,2,2,PH.leaf);}
 herbPaintRect(ctx,4,17,4,2,PH.outline);herbPaintRect(ctx,18,18,3,2,PH.outline);
}
function herbPaintRock(ctx){
 herbPaintRect(ctx,3,11,12,4,PH.outline);herbPaintRect(ctx,1,8,15,5,PH.outline);
 herbPaintRect(ctx,3,5,12,7,PH.rock);herbPaintRect(ctx,5,3,7,2,PH.rock);
 herbPaintRect(ctx,5,4,5,4,PH.rockLight);herbPaintRect(ctx,10,6,3,4,PH.grassLight);
 herbPaintRect(ctx,4,10,9,2,'#52615b');herbPaintRect(ctx,8,5,1,2,PH.cream);
 herbPaintRect(ctx,2,14,5,1,PH.deep);
}
function herbPaintFood(ctx,id){
 const rare=id==='ember_pepper'||id==='mushroom_heart';
 if(id==='ember_pepper')id='chili';if(id==='mushroom_heart')id='mushroom';
 // All pickups occupy the same 16px silhouette frame, distinct at ~25px on phone.
 // Shared dark outline, single warm highlight, and a colored upper leaf/stem.
 if(id==='gale_core'){
  herbPaintRect(ctx,4,4,9,10,PH.outline);herbPaintRect(ctx,6,2,6,11,'#87c7df');
  herbPaintRect(ctx,8,3,2,10,'#f6e6aa');herbPaintRect(ctx,5,9,4,2,PH.shine);
 }else if(id==='cloud_rice'){
  herbPaintRect(ctx,4,3,9,11,PH.outline);herbPaintRect(ctx,5,4,7,9,'#e5c781');
  herbPaintRect(ctx,7,1,2,10,'#f5e8b5');herbPaintRect(ctx,5,5,2,2,PH.shine);herbPaintRect(ctx,10,8,2,2,PH.shine);
 }else if(id==='sky_moss'){
  herbPaintRect(ctx,3,7,11,6,PH.outline);herbPaintRect(ctx,5,4,8,9,'#72bbac');
  herbPaintRect(ctx,8,1,3,8,'#b6e1c8');herbPaintRect(ctx,3,7,4,3,PH.shine);
 }else if(id==='storm_egg'){
  herbPaintRect(ctx,4,4,9,10,PH.outline);herbPaintRect(ctx,5,3,7,10,'#c7d0e4');
  herbPaintRect(ctx,7,5,3,6,'#f5dc87');herbPaintRect(ctx,10,9,2,2,'#6b83b0');
 }else if(id==='sour_bell'){
  herbPaintRect(ctx,3,6,11,8,PH.outline);herbPaintRect(ctx,5,6,7,7,'#9274b7');
  herbPaintRect(ctx,7,2,2,5,PH.deep);herbPaintRect(ctx,9,3,4,2,PH.leaf);herbPaintRect(ctx,5,8,3,2,PH.shine);
 }else if(id==='tide_sour_pulp'){
  herbPaintRect(ctx,4,4,9,10,PH.outline);herbPaintRect(ctx,3,7,11,5,PH.outline);
  herbPaintRect(ctx,5,5,7,8,'#4caaa5');herbPaintRect(ctx,4,8,9,3,'#72c7bc');
  herbPaintRect(ctx,6,6,2,5,'#d5ead1');herbPaintRect(ctx,9,8,2,3,'#f4e8b8');
  herbPaintRect(ctx,7,1,2,4,PH.deep);herbPaintRect(ctx,9,2,4,2,PH.leaf);
 }else if(id==='starlit_nectar'){
  herbPaintRect(ctx,5,4,7,3,PH.outline);herbPaintRect(ctx,4,7,9,8,PH.outline);
  herbPaintRect(ctx,5,8,7,6,'#d69a49');herbPaintRect(ctx,6,8,5,4,'#f1ca72');
  herbPaintRect(ctx,6,9,2,3,PH.shine);herbPaintRect(ctx,5,4,7,2,'#aa7b54');
  herbPaintRect(ctx,8,0,2,5,PH.leaf);herbPaintRect(ctx,6,1,6,2,'#d6bad1');herbPaintRect(ctx,8,1,2,2,PH.shine);
 }else if(id==='garlic'){
  herbPaintRect(ctx,7,1,3,4,PH.deep);herbPaintRect(ctx,6,2,2,4,PH.leaf);herbPaintRect(ctx,9,2,2,4,PH.leaf);
  herbPaintRect(ctx,4,7,9,7,PH.outline);herbPaintRect(ctx,5,6,7,8,PH.cream);
  herbPaintRect(ctx,6,8,2,4,PH.shine);herbPaintRect(ctx,9,9,2,4,'#d6b98b');herbPaintRect(ctx,7,13,3,1,PH.outline);
 }else if(id==='cabbage'){
  herbPaintRect(ctx,3,5,11,9,PH.outline);herbPaintRect(ctx,5,3,7,11,PH.deep);
  herbPaintRect(ctx,4,7,9,6,PH.grassLight);herbPaintRect(ctx,6,4,5,8,PH.leaf);
  herbPaintRect(ctx,7,6,4,3,PH.sun);herbPaintRect(ctx,5,10,3,2,PH.leaf);
  herbPaintRect(ctx,9,10,3,2,PH.grass);herbPaintRect(ctx,8,12,1,2,PH.cream);
 }else if(id==='onion'){
  herbPaintRect(ctx,7,1,2,5,PH.deep);herbPaintRect(ctx,6,3,2,3,PH.leaf);herbPaintRect(ctx,9,2,2,4,PH.leaf);
  herbPaintRect(ctx,5,5,7,8,PH.outline);herbPaintRect(ctx,3,8,11,5,PH.outline);
  herbPaintRect(ctx,4,8,9,4,'#d6a764');herbPaintRect(ctx,6,6,5,7,'#e7bc78');
  herbPaintRect(ctx,6,7,2,3,PH.shine);herbPaintRect(ctx,8,13,2,2,PH.bark);
 }else if(id==='potato'){
  herbPaintRect(ctx,3,8,11,5,PH.outline);herbPaintRect(ctx,4,5,9,9,PH.bark);
  herbPaintRect(ctx,6,5,6,7,PH.dirtLight);herbPaintRect(ctx,5,8,2,2,PH.shine);
  herbPaintDot(ctx,10,9,PH.bark);herbPaintDot(ctx,8,12,PH.bark);
 }else if(id==='mushroom'){
  herbPaintRect(ctx,7,8,4,6,PH.outline);herbPaintRect(ctx,8,8,2,5,PH.cream);
  herbPaintRect(ctx,2,7,13,3,PH.outline);herbPaintRect(ctx,4,3,9,6,PH.mushroom);
  herbPaintRect(ctx,5,4,6,4,'#de8864');herbPaintRect(ctx,5,5,2,2,PH.cream);
  herbPaintRect(ctx,10,6,2,2,PH.cream);herbPaintRect(ctx,3,9,11,1,PH.shine);
 }else if(id==='chili'){
  herbPaintRect(ctx,9,2,4,2,PH.deep);herbPaintRect(ctx,10,3,1,3,PH.leaf);
  herbPaintRect(ctx,5,5,7,4,PH.outline);herbPaintRect(ctx,5,7,5,5,PH.outline);
  herbPaintRect(ctx,3,11,5,3,PH.outline);herbPaintRect(ctx,6,6,5,4,PH.chili);
  herbPaintRect(ctx,5,9,4,3,'#e88b51');herbPaintRect(ctx,4,12,3,1,PH.shine);
 }else{
  herbPaintRect(ctx,3,6,11,8,PH.outline);herbPaintRect(ctx,4,5,9,8,id==='beef'?'#9e584a':'#e0bd84');
  herbPaintRect(ctx,6,6,6,4,id==='beef'?'#d98a71':'#f0dfad');
  herbPaintRect(ctx,5,9,3,2,PH.cream);herbPaintRect(ctx,11,11,2,2,PH.bark);
 }
 if(rare){herbPaintRect(ctx,7,7,3,3,'#f8d68d');herbPaintRect(ctx,8,8,1,1,'#fff5c7');}
}
function herbPaintTraveler(ctx){
 // Same readable 20x28 proportions as pixelActor's 18x24 character.
 herbPaintRect(ctx,5,23,5,4,PH.outline);herbPaintRect(ctx,13,23,4,4,PH.outline);
 herbPaintRect(ctx,4,13,14,12,PH.outline);herbPaintRect(ctx,5,14,12,10,'#648377');
 herbPaintRect(ctx,2,15,4,8,PH.outline);herbPaintRect(ctx,3,16,2,6,'#648377');
 herbPaintRect(ctx,17,15,3,8,PH.outline);herbPaintRect(ctx,17,17,2,4,PH.barkLight);
 herbPaintRect(ctx,5,7,12,8,PH.outline);herbPaintRect(ctx,6,7,10,7,'#e7b58d');
 herbPaintRect(ctx,8,9,2,2,PH.outline);herbPaintRect(ctx,13,9,2,2,PH.outline);
 herbPaintRect(ctx,3,5,16,3,PH.outline);herbPaintRect(ctx,6,1,10,6,PH.bark);
 herbPaintRect(ctx,7,2,8,3,PH.barkLight);herbPaintRect(ctx,4,5,14,2,PH.rockLight);
 herbPaintRect(ctx,15,15,3,8,'#c99955');herbPaintRect(ctx,15,17,3,2,PH.shine);
 herbPaintRect(ctx,8,15,4,4,PH.cream);herbPaintRect(ctx,10,16,1,3,PH.chili);
}
function herbPaintGroundObject(ctx,id){
 if(id==='flower'){
  herbPaintRect(ctx,7,7,2,8,PH.deep);herbPaintRect(ctx,4,10,4,2,PH.leaf);
  herbPaintRect(ctx,9,11,3,2,PH.leaf);herbPaintRect(ctx,5,4,6,6,PH.outline);
  herbPaintRect(ctx,7,3,2,8,PH.shine);herbPaintRect(ctx,4,6,8,2,PH.shine);
  herbPaintRect(ctx,7,6,2,2,PH.chili);
 }else if(id==='tuft'){
  herbPaintRect(ctx,3,11,11,2,PH.deep);herbPaintRect(ctx,5,7,2,6,PH.leaf);
  herbPaintRect(ctx,8,5,2,8,PH.grassLight);herbPaintRect(ctx,11,8,2,5,PH.leaf);
 }else if(id==='spark'){
  herbPaintRect(ctx,7,1,2,13,PH.shine);herbPaintRect(ctx,2,6,12,2,PH.shine);
  herbPaintRect(ctx,6,5,4,4,PH.cream);
 }else{
  herbPaintRect(ctx,3,7,11,6,PH.outline);
  herbPaintRect(ctx,6,4,6,9,PH.bark);herbPaintRect(ctx,8,2,2,8,PH.chili);
  herbPaintRect(ctx,5,8,5,2,PH.shine);herbPaintRect(ctx,9,12,4,2,PH.deep);
 }
}
function herbGetSprite(name){
 let sprite=herbSprites.get(name);
 if(sprite)return sprite;
 const spec=herbPixelSpriteSize(name);
 if(!spec)throw new Error('Unrecognized herb pixel asset: '+name);
 const cv=document.createElement('canvas');
 cv.width=spec.width;cv.height=spec.height;
 const ctx=cv.getContext('2d',{alpha:true});ctx.imageSmoothingEnabled=false;
 if(name.startsWith('grass'))herbPaintGrass(ctx,Number(name.slice(-1)));
 else if(name.startsWith('trail:')){
  const [,mask,variant]=name.split(':');herbPaintTrail(ctx,Number(mask),Number(variant));
 }else if(name.startsWith('tree'))herbPaintTree(ctx,Number(name.slice(-1)));
 else if(name==='rock')herbPaintRock(ctx);
 else if(['traveler','merchant','nectar_traveler'].includes(name)){
  herbPaintTraveler(ctx);
  if(name==='merchant'){herbPaintRect(ctx,5,1,12,7,PH.outline);herbPaintRect(ctx,6,2,10,5,'#817395');herbPaintRect(ctx,8,0,7,3,'#aa94ad');herbPaintRect(ctx,1,13,5,11,PH.bark);herbPaintRect(ctx,2,15,3,4,'#d8ba79');herbPaintRect(ctx,6,15,10,8,'#756480');herbPaintRect(ctx,9,15,2,8,PH.cream);}
  if(name==='nectar_traveler'){herbPaintRect(ctx,2,5,18,3,'#c9ab76');herbPaintRect(ctx,6,1,10,5,'#dfc38b');herbPaintRect(ctx,7,4,8,1,PH.leaf);herbPaintRect(ctx,15,16,5,8,PH.outline);herbPaintRect(ctx,16,17,3,6,'#d6a54e');herbPaintRect(ctx,17,18,1,3,PH.shine);}
 }
 else if(['encounter_bloom','encounter_crystal'].includes(name)){
  if(name==='encounter_bloom'){herbPaintRect(ctx,7,5,2,10,PH.deep);herbPaintRect(ctx,3,10,5,3,PH.leaf);herbPaintRect(ctx,9,11,5,2,PH.leaf);herbPaintRect(ctx,4,2,8,7,PH.outline);herbPaintRect(ctx,5,3,6,5,'#b99dc1');herbPaintRect(ctx,7,3,2,5,PH.shine);herbPaintRect(ctx,5,5,6,1,PH.shine);}
  else{herbPaintRect(ctx,2,12,12,3,PH.rock);herbPaintRect(ctx,6,1,5,12,PH.outline);herbPaintRect(ctx,7,2,3,10,'#9fc9c0');herbPaintRect(ctx,8,3,1,7,PH.shine);herbPaintRect(ctx,2,6,4,7,'#73a99e');herbPaintRect(ctx,11,7,3,6,'#c9d9ba');}
 }
 else if(['flower','tuft','spark','vent'].includes(name))herbPaintGroundObject(ctx,name);
 else herbPaintFood(ctx,name);
 herbSprites.set(name,cv);
 return cv;
}
function herbRealTrail(f){
 const main=f.nodes?.find(n=>n.key==='target')||f.nodes?.[0];
 const trail=new Set(),add=path=>path.forEach(pt=>trail.add(herbTileKey(Math.floor(pt.x),Math.floor(pt.y))));
 if(!main)return trail;
 add(fieldTilePath(f,f.spawn,{x:Math.floor(main.x)+.5,y:Math.floor(main.y)+.5},{avoidHazards:true}));
 // Secondary paths branch from the shortest already-paved connection,
 // rather than repainting the whole map into a brown checkerboard.
 const candidates=(f.nodes||[]).filter(n=>n!==main&&!n.claimed&&(n.type==='event'||n.type==='gather'))
  .sort((a,b)=>Number(b.type==='event')-Number(a.type==='event')||a.key.localeCompare(b.key));
 let branches=0;
 for(const n of candidates){
  if(branches>=2||trail.has(herbTileKey(Math.floor(n.x),Math.floor(n.y))))continue;
  let best=null;
  for(const key of trail){
   const [x,y]=key.split(',').map(Number);
   const path=fieldTilePath(f,{x:x+.5,y:y+.5},{x:Math.floor(n.x)+.5,y:Math.floor(n.y)+.5},{avoidHazards:true});
   if(path.length>1&&(!best||path.length<best.length))best=path;
  }
  if(best&&best.length<=7){add(best);branches++;}
 }
 return trail;
}
export function herbPixelGroundPlan(f){
 return isHerbPixelSlice(f)?fieldArtGroundPlan(f):null;
}
export function fieldArtGroundPlan(f){
 if(f?.worldVersion!=='0.11-B1')return null;
 const cached=herbGroundPlans.get(f);
 if(cached)return cached;
 const trail=herbRealTrail(f),blocked=new Set([...f.obstacles,...f.hazards,...f.nodes]
  .map(n=>herbTileKey(Math.floor(n.x),Math.floor(n.y))));
 const props=[];
 const seed=f.biome?.encounterSeed||1;
 // Real B1 scenery is intentionally thinned to avoid grass noise.
 for(const a of f.scenery||[]){
  // Cap total foliage decoration density even on unusually lush seeds.
  if(props.length>=16)break;
  const x=Math.floor(a.x),y=Math.floor(a.y),k=herbTileKey(x,y);
  if(herbHash(seed+x*71+y*107)%5!==0||blocked.has(k)||trail.has(k))continue;
  if(Math.hypot(a.x-f.spawn.x,a.y-f.spawn.y)<1.7)continue;
  if((f.nodes||[]).some(n=>Math.hypot(a.x-n.x,a.y-n.y)<1.35))continue;
  props.push({...a,name:(a.kind%5===0?'flower':'tuft')});
 }
 const plan={width:f.worldW,height:f.worldH,trail,blocked,props};
 herbGroundPlans.set(f,plan);
 return plan;
}
export function drawHerbPixelGround(c,f){
 const plan=herbPixelGroundPlan(f);
 if(!plan)return false;
 const seed=f.biome.encounterSeed||1;
 c.imageSmoothingEnabled=false;
 for(let y=0;y<plan.height;y++)for(let x=0;x<plan.width;x++){
  const variant=(herbHash(seed+x*431+y*179)>>>16)&3;
  const key=herbTileKey(x,y);
  let sprite='grass'+variant;
  if(plan.trail.has(key)){
   let mask=0;
   if(plan.trail.has(herbTileKey(x,y-1)))mask|=1;
   if(plan.trail.has(herbTileKey(x+1,y)))mask|=2;
   if(plan.trail.has(herbTileKey(x,y+1)))mask|=4;
   if(plan.trail.has(herbTileKey(x-1,y)))mask|=8;
   sprite='trail:'+mask+':'+variant;
  }
  c.drawImage(herbGetSprite(sprite),x,y,1.001,1.001);
 }
 for(const a of plan.props){
  const size=a.name==='flower'?.34:.31;
  c.drawImage(herbGetSprite(a.name),a.x-size/2,a.y-size/2,size,size);
 }
 return true;
}
export function drawHerbPixelObstacle(c,o,index=0){
 const isRock=(index%5===2);const name=isRock?'rock':(index%2?'tree1':'tree0');
 c.imageSmoothingEnabled=false;
 if(isRock)c.drawImage(herbGetSprite(name),o.x+.1,o.y+.10,.82,.87);
 else c.drawImage(herbGetSprite(name),o.x-.12,o.y-.52,1.24,1.46);
}
export function drawHerbPixelNode(c,n,time=0,markers=true,screenScale=null){
 if(n.claimed)return;
 const name=n.type==='event'?(n.kind==='merchant'?'merchant':n.kind==='traveler'?'nectar_traveler':n.kind==='ecology'?(n.region==='spring'?'encounter_crystal':'encounter_bloom'):'traveler'):herbPixelSpriteNames().includes(n.id)?n.id:'mushroom';
 const bob=n.type==='event'?0:Math.sin(time*3+n.x)*.028;
 c.imageSmoothingEnabled=false;
 c.fillStyle='#26352e88';c.fillRect(n.x-.26,n.y+.22,.52,.10);
 if(n.type==='event'){
  if(screenScale){c.save();c.translate(n.x,n.y);c.scale(1/screenScale,1/screenScale);if(n.kind==='ecology')c.drawImage(herbGetSprite(name),-13,-17,26,26);else c.drawImage(herbGetSprite(name),-14,-23.8,28,39.2);c.restore();}
  else c.drawImage(herbGetSprite(name),n.x-.41,n.y-.80,.82,1.10);
  if(markers)c.drawImage(herbGetSprite('spark'),n.x+.28,n.y-.90,.27,.27);
 }else{
  // v0.13-I Android hardening: material pickups use the SAME authoritative
  // 16x16 pixel painter directly on the visible field context. Some Android
  // GPU/compositor paths can silently miss the canvas -> canvas drawImage
  // upload despite drawing direct shapes correctly. No offscreen texture,
  // PNG decode or external asset is needed for actual gameplay food nodes.
  // This also keeps the harvested icon source identical to the DOM sprite.
  c.save();
  c.translate(n.x-.38,n.y-.49+bob);
  c.scale(.76/16,.76/16);
  herbPaintFood(c,name);
  c.restore();
  if(markers&&n.key==='target'){
   // A clear 4-corner pixel target bracket replaces the old antialiased ellipse.
   c.fillStyle='#ffe4a0';
   const left=n.x-.45,right=n.x+.35,top=n.y-.57+bob,bottom=n.y+.24+bob;
   for(const [x,y,h] of [[left,top,1],[right,top,-1],[left,bottom,1],[right,bottom,-1]]){
    c.fillRect(x,y,.10,.09);c.fillRect(x,y,h*.11,.08);
   }
  }
 }
}
export function drawHerbPixelHazard(c,hz,phase,time=0){
 const x=hz.x+.5,y=hz.y+.5;
 c.imageSmoothingEnabled=false;
 c.drawImage(herbGetSprite('vent'),x-.46,y-.46,.92,.92);
 if(phase?.warning||phase?.active){
  const alpha=phase.active?.85:.54;
  c.save();c.globalAlpha=alpha;
  c.fillStyle=phase.active?'#ed784d':'#f7cf77';
  for(let i=0;i<4;i++){
   const sx=x-.53+(i%2)*1.02,sy=y-.52+Math.floor(i/2)*1.02;
   c.fillRect(sx,sy,.18,.10);c.fillRect(sx,sy,.09,.19);
  }
  if(phase.active){
   c.fillStyle='#ffe7a7';c.fillRect(x-.12,y-.38-.06*Math.sin(time*10),.09,.30);
   c.fillRect(x+.18,y-.22,.08,.20);
  }
  c.restore();
 }
}

// Actual battlefield uses existing actor pixels, replacing meadow-only circles
// with sharp angular health / wind-up marks. Bosses in other biomes stay original.
export function drawHerbPixelEnemy(c,e,t,sc,pixelEnemyFn,indicators=true){
 const alive=e.hp>0;
 c.save();c.translate(e.x,e.y);c.scale(1/sc,1/sc);
 if(alive||e.deathFx>0){
  c.save();
  if(!alive)c.globalAlpha=Math.min(1,(e.deathFx||0)/.27);
  const crouch=e.warning>0&&!e.isBoss;
  c.translate(0,crouch?Math.min(2,e.warning*1.1):0);
  pixelEnemyFn(c,e.kind,0,0,1.8,{face:e.face||1,walk:crouch||e.brainVersion==='0.11-B2'&&(!e.moving||e.ecologyRush)?0:t,hurt:e.hurtFx||0});
  c.restore();
 }
 if(indicators&&e.warning>0){
  const col='#ffe0a2';
  herbPaintRect(c,-11,-31,22,2,PH.outline);
  herbPaintRect(c,-9,-31,18*Math.min(1,e.warning/1.25),2,'#f5ad70');
  herbPaintRect(c,-2,-37,4,4,col);
 }
 if(indicators&&alive){
  const ratio=Math.max(0,Math.min(1,e.hp/Math.max(1,e.maxHp)));
  herbPaintRect(c,-12,-25,24,5,PH.outline);
  herbPaintRect(c,-11,-24,22*ratio,3,'#edc581');
 }
 c.restore();
}
export function drawHerbPixelProjectile(c,projectile,type='enemy'){
 c.fillStyle=type==='enemy'?'#e99053':PH.dirtLight;
 c.fillRect(projectile.x-.115,projectile.y-.115,.23,.23);
 c.fillStyle=PH.shine;
 c.fillRect(projectile.x-.055,projectile.y-.055,.11,.11);
}

// Shared identity for field and DOM ingredient art: the very same raster cache.
export function ingredientSpriteCanvas(id){
 if(!['beef','chicken','chili','garlic','mushroom','cabbage','onion','potato','mushroom_heart','ember_pepper','tide_sour_pulp','starlit_nectar','cloud_rice','sky_moss','storm_egg','sour_bell','gale_core'].includes(id))return null;
 return herbGetSprite(id);
}

// Herb Path art vertical slice: all paint is snapped to a 16px virtual tile.
// Original reproducible raster sprites, not antialiased geometric decorations.
// No gameplay mutations or DOM work until the first in-game draw.
import {fieldTilePath} from './field_rules_v011a.js';

export const HERB_PIXEL_TILE=16;
export const HERB_PIXEL_PALETTE=Object.freeze({
 outline:'#26352e',deep:'#304932',grass:'#527546',grassLight:'#688c52',
 leaf:'#80a75d',sun:'#a5b96b',dirt:'#96734d',dirtLight:'#c49a67',
 bark:'#75523d',barkLight:'#a47a50',rock:'#697871',rockLight:'#acb5a0',
 shine:'#f7dfa1',cream:'#f0e5c7',chili:'#d96142',mushroom:'#bd654c'
});
const PH=HERB_PIXEL_PALETTE;
const herbHash=n=>(Math.imul(1664525,n>>>0)+1013904223)>>>0;
const herbSprites=new Map();
const herbTileKey=(x,y)=>x+','+y;
const herbPaintRect=(ctx,x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h)};
const herbPaintDot=(ctx,x,y,color)=>herbPaintRect(ctx,x,y,1,1,color);

export function isHerbPixelSlice(f){
 return !!(f?.worldVersion==='0.11-B1' && f?.biome?.zoneId==='herb_path');
}

export function herbPixelSpriteNames(){
 return ['grass0','grass1','grass2','grass3','tree0','tree1','rock',
  'garlic','cabbage','onion','potato','mushroom','chili','beef','chicken',
  'traveler','vent','flower','tuft','spark'];
}
export function herbPixelSpriteSize(name){
 if(!herbPixelSpriteNames().includes(name)&&!/^trail:[0-9]+:[0-3]$/.test(name))return null;
 return name.startsWith('tree')?{width:24,height:30}:
  name==='traveler'?{width:20,height:28}:{width:16,height:16};
}
function herbPaintGrass(ctx,variant=0){
 herbPaintRect(ctx,0,0,16,16,PH.grass);
 const seed=herbHash(variant*1817+739);
 // Small intentional clusters; colors are shared with chef and monster art.
 for(let i=0;i<18;i++){
  const z=herbHash(seed+i*173),x=z%15,y=(z>>>8)%15;
  herbPaintRect(ctx,x,y,i%4===0?2:1,1,i%3===0?PH.deep:i%3===1?PH.grassLight:PH.leaf);
 }
 if(variant===2){herbPaintRect(ctx,2,9,4,2,PH.deep);herbPaintRect(ctx,3,8,2,1,PH.grassLight);}
 if(variant===3){herbPaintRect(ctx,10,4,3,2,PH.grassLight);herbPaintRect(ctx,11,3,1,1,PH.sun);}
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
 herbPaintRect(ctx,6,8,2,1,PH.bark);herbPaintRect(ctx,10,11,1,1,PH.rockLight);
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
 // All pickups occupy the same 16px silhouette frame, distinct at ~25px on phone.
 // Shared dark outline, single warm highlight, and a colored upper leaf/stem.
 if(id==='garlic'){
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
 else if(name==='traveler')herbPaintTraveler(ctx);
 else if(['flower','tuft','spark','vent'].includes(name))herbPaintGroundObject(ctx,name);
 else herbPaintFood(ctx,name);
 herbSprites.set(name,cv);
 return cv;
}
function herbRealTrail(f){
 const goal=f.nodes?.find(n=>n.key==='target'&&!n.claimed)||
  f.nodes?.find(n=>n.key==='target');
 if(!goal)return new Set();
 const path=fieldTilePath(f,f.spawn,{x:Math.floor(goal.x)+.5,y:Math.floor(goal.y)+.5},{avoidHazards:true});
 return new Set(path.map(point=>herbTileKey(Math.floor(point.x),Math.floor(point.y))));
}
export function herbPixelGroundPlan(f){
 if(!isHerbPixelSlice(f))return null;
 return {width:f.worldW,height:f.worldH,trail:herbRealTrail(f)};
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
 const blocked=new Set([...f.obstacles,...f.hazards,...f.nodes]
  .map(n=>herbTileKey(Math.floor(n.x),Math.floor(n.y))));
 for(const a of f.scenery||[]){
  const x=Math.floor(a.x),y=Math.floor(a.y);
  if(blocked.has(herbTileKey(x,y))||plan.trail.has(herbTileKey(x,y)))continue;
  const name=a.kind%4===0?'flower':'tuft';
  const s=.22+(a.scale||1)*.13;
  c.drawImage(herbGetSprite(name),a.x-s/2,a.y-s/2,s,s);
 }
 return true;
}
export function drawHerbPixelObstacle(c,o,index=0){
 const isRock=(index%5===2);const name=isRock?'rock':(index%2?'tree1':'tree0');
 c.imageSmoothingEnabled=false;
 if(isRock)c.drawImage(herbGetSprite(name),o.x+.1,o.y+.10,.82,.87);
 else c.drawImage(herbGetSprite(name),o.x-.12,o.y-.52,1.24,1.46);
}
export function drawHerbPixelNode(c,n,time=0){
 if(n.claimed)return;
 const name=n.type==='event'?'traveler':herbPixelSpriteNames().includes(n.id)?n.id:'mushroom';
 const bob=n.type==='event'?0:Math.sin(time*3+n.x)*.028;
 c.imageSmoothingEnabled=false;
 c.fillStyle='#26352e88';c.fillRect(n.x-.26,n.y+.22,.52,.10);
 if(n.type==='event'){
  c.drawImage(herbGetSprite(name),n.x-.41,n.y-.80,.82,1.10);
  c.drawImage(herbGetSprite('spark'),n.x+.28,n.y-.90,.27,.27);
 }else{
  c.drawImage(herbGetSprite(name),n.x-.38,n.y-.49+bob,.76,.76);
  if(n.key==='target'){
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

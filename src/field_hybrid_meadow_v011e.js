// v0.11-E: restaurant-inspired painted Canvas scenery; player/NPC/enemies remain pixel sprites.
// This module deliberately does not alter any simulation entities, roads or saved data.
import {isHerbPixelSlice,herbPixelGroundPlan} from './field_pixel_herb_v011c.js';

export const HYBRID_MEADOW_PALETTE=Object.freeze({
 grass:'#75896f',grassShade:'#607763',grassLight:'#9baa8d',
 grassGlaze:'#b8c3a3',trailRim:'#7b795e',trail:'#b6a181',
 trailLight:'#cbb99a',trunk:'#755840',trunkLight:'#a17b54',
 foliageDark:'#355d4c',foliage:'#59806a',foliageLight:'#86a587',
 highlight:'#bad0a3',rockDark:'#626e69',rock:'#85928b',
 rockLight:'#b5bdb1',moss:'#789374'
});
const HM=HYBRID_MEADOW_PALETTE;
const hybridMeadowGroundCache=new WeakMap();
const hybridMeadowHash=n=>(Math.imul(1664525,n>>>0)+1013904223)>>>0;
const hybridMeadowKey=(x,y)=>x+','+y;

export function isHybridMeadow(f){
 return isHerbPixelSlice(f)&&f?.artPreviewMode!=='pixel';
}
function hybridMeadowEllipse(c,x,y,rx,ry,color){
 c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);
 c.fillStyle=color;c.fill();
}
function hybridMeadowLeaf(c,x,y,sx,sy,fill){
 c.beginPath();c.moveTo(x-sx,y);
 c.bezierCurveTo(x-sx*.85,y-sy*.8,x-sx*.12,y-sy*1.2,x+sx*.24,y-sy);
 c.bezierCurveTo(x+sx*1.25,y-sy*.73,x+sx*1.3,y+sy*.5,x+sx*.45,y+sy*.87);
 c.bezierCurveTo(x-sx*.22,y+sy*1.16,x-sx*1.12,y+sy*.63,x-sx,y);
 c.closePath();c.fillStyle=fill;c.fill();
}
function hybridMeadowTrail(c,plan){
 const trail=plan.trail;
 if(!trail?.size)return;
 const segs=[];
 for(const key of trail){
  const [x,y]=key.split(',').map(Number);
  if(trail.has(hybridMeadowKey(x+1,y)))segs.push([x+.5,y+.5,x+1.5,y+.5]);
  if(trail.has(hybridMeadowKey(x,y+1)))segs.push([x+.5,y+.5,x+.5,y+1.5]);
 }
 // Stacked continuous rounded ribbons: never paint isolated square tiles.
 for(const [width,col] of [[.94,'#6b755c55'],[.82,HM.trailRim],[.73,HM.trail],[.55,HM.trailLight]]){
  c.strokeStyle=col;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';
  c.beginPath();
  for(const [x1,y1,x2,y2] of segs){c.moveTo(x1,y1);c.lineTo(x2,y2);}
  c.stroke();
  // Road dots fill junctions and each endpoint, without checkerboard borders.
  for(const key of trail){
   const [x,y]=key.split(',').map(Number);
   hybridMeadowEllipse(c,x+.5,y+.5,width*.5,width*.5,col);
  }
 }
}
function hybridMeadowGroundInto(c,f,plan){
 const w=plan.width,h=plan.height;
 c.save();c.beginPath();c.rect(0,0,w,h);c.clip();
 const floor=c.createLinearGradient(0,0,w,h);
 floor.addColorStop(0,HM.grassLight);
 floor.addColorStop(.45,HM.grass);
 floor.addColorStop(1,HM.grassShade);
 c.fillStyle=floor;c.fillRect(0,0,w,h);
 const seed=f.biome?.encounterSeed||1;
 // Six broad soft pools of light/shade make depth; there is ZERO per-tile speckle.
 for(let i=0;i<11;i++){
  const k=hybridMeadowHash(seed+i*1079);
  const x=.4+(k%114)/10,y=.3+((k>>>9)%150)/10,r=1.8+((k>>>21)%23)/10;
  const glaze=c.createRadialGradient(x,y,.08,x,y,r);
  if(i%3===0){glaze.addColorStop(0,'#c5cba322');glaze.addColorStop(1,'#c5cba300');}
  else{glaze.addColorStop(0,'#244e4822');glaze.addColorStop(1,'#244e4800');}
  c.fillStyle=glaze;c.fillRect(x-r,y-r,r*2,r*2);
 }
 hybridMeadowTrail(c,plan);
 // A handful of purposeful details at actual scenery coordinates. These
 // are flowers and tufts, not edible pickup icons or collider silhouettes.
 for(const [i,p] of plan.props.entries()){
  c.save();c.translate(p.x,p.y);
  if(p.name==='flower'&&i%3===0){
   c.strokeStyle='#54765b';c.lineWidth=.038;
   c.beginPath();c.moveTo(0,.13);c.quadraticCurveTo(-.04,-.05,0,-.15);c.stroke();
   hybridMeadowEllipse(c,-.065,-.11,.09,.052,HM.foliage);
   hybridMeadowEllipse(c,.054,-.18,.083,.071,'#f0ddab');
   hybridMeadowEllipse(c,.054,-.18,.032,.027,'#c18c62');
  }else{
   c.strokeStyle='#5e825e';c.lineWidth=.038;c.lineCap='round';
   for(const [dx,ey] of [[-.08,-.09],[.01,-.16],[.10,-.07]]){
    c.beginPath();c.moveTo(0,.07);c.quadraticCurveTo(dx*.5,ey*.35,dx,ey);c.stroke();
   }
  }
  c.restore();
 }
 c.restore();
}
export function hybridMeadowGroundPlan(f){
 return isHybridMeadow(f)?herbPixelGroundPlan(f):null;
}
export function drawHybridMeadowGround(c,f){
 const plan=hybridMeadowGroundPlan(f);
 if(!plan)return false;
 let image=hybridMeadowGroundCache.get(f);
 if(!image){
  image=document.createElement('canvas');
  // 64 virtual pixels per world tile: smooth restaurant-style scenery on DPR2.
  image.width=plan.width*64;image.height=plan.height*64;
  const g=image.getContext('2d',{alpha:false});
  g.scale(64,64);g.imageSmoothingEnabled=true;
  hybridMeadowGroundInto(g,f,plan);
  hybridMeadowGroundCache.set(f,image);
 }
 c.save();c.imageSmoothingEnabled=true;
 c.drawImage(image,0,0,plan.width,plan.height);
 c.restore();
 return true;
}
function hybridMeadowTree(c,o,index){
 const alt=index%3,ox=o.x+.5,oy=o.y+.5;
 c.save();c.translate(ox,oy);
 hybridMeadowEllipse(c,.03,.27,.70,.27,'#354d3e55');
 hybridMeadowEllipse(c,-.04,.33,.46,.15,'#293e3355');
 // Trunk with soft tapered outline and warm bark-facing edge.
 c.beginPath();c.moveTo(-.20,.32);c.bezierCurveTo(-.12,-.04,-.16,-.60,-.18,-.88);
 c.lineTo(.19,-.88);c.bezierCurveTo(.15,-.42,.13,-.08,.24,.32);c.closePath();
 c.fillStyle=HM.trunk;c.fill();
 c.beginPath();c.moveTo(.025,.20);c.quadraticCurveTo(.07,-.25,.015,-.70);
 c.lineWidth=.08;c.strokeStyle=HM.trunkLight;c.stroke();
 c.beginPath();c.moveTo(-.15,-.32);c.lineTo(-.30,-.60);
 c.moveTo(.15,-.43);c.lineTo(.34,-.68);
 c.lineWidth=.065;c.strokeStyle=HM.trunk;c.stroke();
 // Layered, hand-shaped crown. Lobes share one set of key light values, not
 // many randomly colored procedural circles.
 const sway=alt===1?-.12:alt===2?.10:0;
 hybridMeadowLeaf(c,-.54+sway,-.79,.63,.54,HM.foliageDark);
 hybridMeadowLeaf(c,.40+sway,-.95,.72,.56,'#426b55');
 hybridMeadowLeaf(c,-.07+sway,-1.23,.69,.55,HM.foliage);
 hybridMeadowLeaf(c,-.49+sway,-.94,.44,.35,HM.foliage);
 hybridMeadowLeaf(c,.31+sway,-1.10,.49,.40,HM.foliageLight);
 hybridMeadowLeaf(c,-.09+sway,-1.40,.47,.31,'#719678');
 hybridMeadowLeaf(c,-.48+sway,-1.13,.28,.16,'#9dbb98');
 hybridMeadowLeaf(c,.31+sway,-1.35,.28,.15,HM.highlight);
 // Curated leaf vein/light accents. No dense confetti texture.
 c.strokeStyle='#c4d1ab88';c.lineWidth=.036;c.lineCap='round';
 for(const [x,y] of [[-.29,-1.23],[.36,-1.42],[-.03,-1.56]]){
  c.beginPath();c.moveTo(x-.14,y+.08);c.quadraticCurveTo(x,y-.05,x+.11,y-.04);c.stroke();
 }
 c.restore();
}
function hybridMeadowRock(c,o,index){
 c.save();c.translate(o.x+.5,o.y+.5);
 hybridMeadowEllipse(c,.02,.26,.57,.20,'#344d4455');
 const w=index%2===0?1:.87;
 c.scale(w,1);
 c.beginPath();c.moveTo(-.52,.12);c.lineTo(-.42,-.25);
 c.quadraticCurveTo(-.27,-.48,-.08,-.52);
 c.lineTo(.29,-.44);c.lineTo(.51,-.17);c.lineTo(.48,.19);c.closePath();
 c.fillStyle=HM.rockDark;c.fill();
 c.beginPath();c.moveTo(-.43,-.21);c.lineTo(-.10,-.50);c.lineTo(.23,-.37);
 c.lineTo(.13,-.07);c.lineTo(-.40,.02);c.closePath();
 c.fillStyle=HM.rockLight;c.fill();
 c.beginPath();c.moveTo(.23,-.37);c.lineTo(.50,-.16);c.lineTo(.48,.15);
 c.lineTo(.13,-.07);c.closePath();c.fillStyle=HM.rock;c.fill();
 c.beginPath();c.moveTo(-.43,-.21);c.lineTo(-.40,.02);c.lineTo(.13,-.07);
 c.lineTo(.48,.15);c.lineTo(-.33,.14);c.closePath();c.fillStyle='#718079';c.fill();
 c.beginPath();c.moveTo(-.36,-.13);c.quadraticCurveTo(-.19,-.23,-.04,-.12);
 c.strokeStyle='#d8dac5';c.lineWidth=.038;c.stroke();
 c.beginPath();c.moveTo(.01,-.45);c.quadraticCurveTo(.22,-.43,.30,-.30);
 c.strokeStyle=HM.moss;c.lineWidth=.11;c.stroke();
 c.restore();
}
export function drawHybridMeadowObstacle(c,o,index=0){
 if(!o)return;
 if(index%5===2)hybridMeadowRock(c,o,index);
 else hybridMeadowTree(c,o,index);
}
export function drawHybridMeadowHazard(c,hz,phase,time=0){
 const x=hz.x+.5,y=hz.y+.5;
 c.save();c.translate(x,y);
 hybridMeadowEllipse(c,0,.10,.47,.34,'#49594f99');
 // Cracked, pale stone around a dark active vent. The *same* phase drives
 // the visuals and simulation radius; art never changes physical safety.
 c.beginPath();c.moveTo(-.46,-.11);c.lineTo(-.15,-.38);c.lineTo(.25,-.35);
 c.lineTo(.49,-.04);c.lineTo(.31,.32);c.lineTo(-.28,.32);c.closePath();
 c.fillStyle='#b2b5a4';c.fill();
 hybridMeadowEllipse(c,0,-.015,.33,.23,'#4e625b');
 hybridMeadowEllipse(c,0,-.035,.24,.15,'#354a44');
 c.strokeStyle='#818e7b';c.lineWidth=.045;
 c.beginPath();c.moveTo(-.40,.08);c.lineTo(-.55,.22);
 c.moveTo(.28,-.16);c.lineTo(.42,-.30);c.stroke();
 if(phase?.warning||phase?.active){
  c.beginPath();c.arc(0,0,phase.radius,0,Math.PI*2);
  c.lineWidth=.065;c.strokeStyle=phase.active?'#f4b27e':'#f4d6a2';
  c.stroke();
  hybridMeadowEllipse(c,0,-.02,.25,.17,phase.active?'#ed815caa':'#eebc8277');
  if(phase.active){
   c.strokeStyle='#f9dea0';c.lineWidth=.09;c.lineCap='round';
   for(const dx of [-.12,.04,.16]){
    c.beginPath();c.moveTo(dx,.01);c.quadraticCurveTo(dx-.15,-.19,dx+.02,-.38-.04*Math.sin(time*8));c.stroke();
   }
  }
 }
 c.restore();
}

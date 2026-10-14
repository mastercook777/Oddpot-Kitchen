// v0.11-E: restaurant-inspired painted Canvas scenery; player/NPC/enemies remain pixel sprites.
// This module deliberately does not alter any simulation entities, roads or saved data.
import {isHerbPixelSlice,herbPixelGroundPlan} from './field_pixel_herb_v011c.js';

export const HYBRID_MEADOW_PALETTE=Object.freeze({
 grass:'#75896f',grassShade:'#607763',grassLight:'#9baa8d',
 grassGlaze:'#b8c3a3',trailRim:'#7b795e',trail:'#b09d82',
 trailLight:'#c6b699',trunk:'#755840',trunkLight:'#a17b54',
 foliageDark:'#355d4c',foliage:'#59806a',foliageLight:'#86a587',
 highlight:'#bad0a3',rockDark:'#626e69',rock:'#85928b',
 rockLight:'#b5bdb1',moss:'#789374'
});
const HM=HYBRID_MEADOW_PALETTE;
const hybridMeadowGroundCache=new WeakMap();
const hybridMeadowDetailCache=new WeakMap();
const hybridMeadowHash=n=>(Math.imul(1664525,n>>>0)+1013904223)>>>0;
const hybridMeadowKey=(x,y)=>x+','+y;

export function isHybridMeadow(f){
 return isHerbPixelSlice(f)&&!['pixel','legacy'].includes(f?.artPreviewMode);
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
function hybridMeadowTrail(c,plan,polished=false){
 const trail=plan.trail;
 if(!trail?.size)return;
 const segs=[];
 for(const key of trail){
  const [x,y]=key.split(',').map(Number);
  if(trail.has(hybridMeadowKey(x+1,y)))segs.push([x+.5,y+.5,x+1.5,y+.5]);
  if(trail.has(hybridMeadowKey(x,y+1)))segs.push([x+.5,y+.5,x+.5,y+1.5]);
 }
 // Stacked continuous rounded ribbons: never paint isolated square tiles.
 for(const [width,col] of [[.82,'#6b755c55'],[.75,HM.trailRim],[.68,HM.trail],[.49,HM.trailLight]]){
  c.strokeStyle=col;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';
  if(polished){
   // One smooth center line through each genuine cell, including rounded
   // corners; no stamped junction discs or new walkability topology.
   for(const key of trail){
    const [x,y]=key.split(',').map(Number),cx=x+.5,cy=y+.5;
    const near=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>trail.has(hybridMeadowKey(x+dx,y+dy)));
    c.lineWidth=width*(.96+((hybridMeadowHash(x*129+y*337)>>>16)%9)*.01);
    c.beginPath();
    if(near.length===2){const [a,b]=near;
     c.moveTo(cx+a[0]*.5,cy+a[1]*.5);
     if(a[0]===-b[0]&&a[1]===-b[1])c.lineTo(cx+b[0]*.5,cy+b[1]*.5);
     else c.quadraticCurveTo(cx,cy,cx+b[0]*.5,cy+b[1]*.5);
    }else for(const [dx,dy] of near){c.moveTo(cx,cy);c.lineTo(cx+dx*.5,cy+dy*.5);}
    c.stroke();
   }
   continue;
  }
  c.beginPath();
  for(const [x1,y1,x2,y2] of segs){
   // Subtle local bend breaks up ruler-straight grid corridors without
   // drifting away from their genuinely walkable tiles.
   const sway=((hybridMeadowHash(Math.floor(x1*31+y1*97))>>>16)%5-2)*.023;
   const dx=x2-x1,dy=y2-y1;
   c.moveTo(x1,y1);c.quadraticCurveTo((x1+x2)/2-dy*sway,(y1+y2)/2+dx*sway,x2,y2);
  }
  c.stroke();
  // Road dots fill junctions and each endpoint, without checkerboard borders.
  for(const key of trail){
   const [x,y]=key.split(',').map(Number);
   hybridMeadowEllipse(c,x+.5,y+.5,width*.5,width*.5,col);
  }
 }
}
function hybridMeadowGroundE0Into(c,f,plan){
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
// E.1 is a read-only, seeded and bounded ground plan. Node positions are
// already centered after startActionField; pre-action maps use tile coordinates.
export const HYBRID_MEADOW_DETAIL_BUDGET=Object.freeze({free:8,edge:7,root:6,special:1,total:22});
export function buildHybridMeadowDetailPlan(f,groundPlan=herbPixelGroundPlan(f)){
 if(!isHerbPixelSlice(f)||!groundPlan)return null;
 const cached=hybridMeadowDetailCache.get(f);if(cached)return cached;
 const seed=f.biome?.encounterSeed||1,groups=[];
 const trail=[...groundPlan.trail].map(k=>{const [x,y]=k.split(',').map(Number);return {x:x+.5,y:y+.5};});
 const center=n=>({x:n.x+(f.action?0:.5),y:n.y+(f.action?0:.5)});
 const nodes=(f.nodes||[]).map(center),hazards=(f.hazards||[]).map(h=>({x:h.x+.5,y:h.y+.5}));
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const roadDistance=p=>trail.reduce((m,t)=>Math.min(m,distance(p,t)),Infinity);
 const allowed=(p,category)=>{
  const extent=category==='root'?.32:.25;
  if(p.x<.55||p.y<.55||p.x>f.worldW-.55||p.y>f.worldH-.55)return false;
  if(distance(p,f.spawn)<1.5+extent||nodes.some(n=>distance(p,n)<1.15+extent))return false;
  if(hazards.some(h=>distance(p,h)<.55+.35+extent))return false;
  if((f.enemies||[]).some(e=>distance(p,e)<1.5+extent))return false;
  if(groups.some(g=>distance(p,g)<.62))return false;
  if(f.obstacles.some(o=>Math.abs(p.x-o.x-.5)<.50&&Math.abs(p.y-o.y-.5)<.50))return false;
  return roadDistance(p)>(category==='edge'?.36:.62);
 };
 const rank=(p,i)=>hybridMeadowHash(seed+Math.floor(p.x*193)*911+Math.floor(p.y*181)*353+i*7919);
 const select=(items,category,budget)=>{
  const ordered=items.map((p,i)=>({...p,rank:rank(p,i)})).sort((a,b)=>a.rank-b.rank);
  let count=0;
  for(const p of ordered){if(count>=budget)break;if(!allowed(p,category))continue;
   const h=hybridMeadowHash(p.rank+seed);
   groups.push(Object.freeze({x:p.x,y:p.y,category,kind:category==='special'?2:(h>>>16)%2,
    scale:.82+((h>>>12)%7)*.05,angle:((h>>>8)%13-6)*.11,
    alpha:.22+((h>>>22)%5)*.018,obstacleIndex:p.obstacleIndex??null}));count++;
  }
 };
 // Roots belong to actual colliders only; their ground stain is drawn BELOW
 // moving actors, separately from the existing y-sorted tree/rock silhouettes.
 const roots=[];
 f.obstacles.forEach((o,index)=>{for(const side of [-1,1])roots.push({x:o.x+.5+side*.66,y:o.y+.80,obstacleIndex:index});});
 select(roots,'root',6);
 const edges=[];
 for(const t of trail)for(const [dx,dy] of [[-.57,0],[.57,0],[0,-.57],[0,.57]]){
  const p={x:t.x+dx,y:t.y+dy};
  if(roadDistance(p)<.36)continue;
  edges.push(p);
 }
 select(edges,'edge',7);
 const free=[];
 for(let y=1;y<f.worldH-1;y++)for(let x=1;x<f.worldW-1;x++){
  const h=hybridMeadowHash(seed+x*811+y*1201);
  free.push({x:x+.20+((h>>>16)%6)*.10,y:y+.20+((h>>>20)%6)*.10});
 }
 select(free,'free',8);select(free,'special',1);
 const result=Object.freeze({groups:Object.freeze(groups),budget:22,seed});
 hybridMeadowDetailCache.set(f,result);return result;
}
function paintGroundCluster(c,g){
 c.save();c.translate(g.x,g.y);c.rotate(g.angle);c.scale(g.scale,g.scale);
 c.globalAlpha=g.alpha;c.lineCap='round';
 if(g.category==='root'){
  // A small soil saddle, two roots, then a restrained grass/leaf gathering.
  hybridMeadowEllipse(c,0,.015,.31,.11,HM.trailRim);
  c.strokeStyle=HM.trunk;c.lineWidth=.045;c.beginPath();
  c.moveTo(-.24,.0);c.quadraticCurveTo(-.06,-.07,.19,.02);
  c.moveTo(-.16,.05);c.quadraticCurveTo(-.05,.01,.17,.09);c.stroke();
  c.globalAlpha=.28;hybridMeadowLeaf(c,.10,.06,.07,.027,HM.moss);
  hybridMeadowLeaf(c,-.14,.08,.052,.024,HM.trunkLight);
 }else if(g.kind===1){
  // Two long curved brush strokes form ONE coherent ground gesture.
  c.strokeStyle=HM.grassShade;c.lineWidth=.065;c.beginPath();
  c.moveTo(-.20,.035);c.quadraticCurveTo(0,-.04,.21,.015);c.stroke();
  c.strokeStyle=HM.grassGlaze;c.lineWidth=.042;c.beginPath();
  c.moveTo(-.16,.08);c.quadraticCurveTo(.02,.015,.16,.06);c.stroke();
 }
 if(g.kind!==1||g.category==='edge'||g.category==='root'){
  c.lineWidth=.034;c.strokeStyle=HM.grassShade;
  for(const [x,tip,height] of [[-.13,-.22,.17],[0,-.02,.24],[.12,.22,.15],[.04,.14,.20]]){
   c.beginPath();c.moveTo(x,.075);c.quadraticCurveTo(x-.02,-height*.22,tip,-height);c.stroke();
  }
  c.strokeStyle=HM.grassGlaze;c.lineWidth=.023;c.beginPath();
  c.moveTo(-.02,.055);c.quadraticCurveTo(-.06,-.02,-.08,-.13);c.stroke();
 }
 if(g.category==='special'){
  // One muted two-leaf accent per map; never a yellow pickup-like flower.
  c.globalAlpha=.27;hybridMeadowLeaf(c,-.09,.03,.062,.028,HM.trunkLight);
  hybridMeadowLeaf(c,.06,.06,.073,.026,HM.moss);
 }
 c.restore();
}
function hybridMeadowGroundE1Into(c,f,plan){
 const w=plan.width,h=plan.height,seed=f.biome?.encounterSeed||1;
 c.save();c.beginPath();c.rect(0,0,w,h);c.clip();
 const floor=c.createLinearGradient(0,0,w,h);
 floor.addColorStop(0,HM.grassLight);floor.addColorStop(.45,HM.grass);floor.addColorStop(1,HM.grassShade);
 c.fillStyle=floor;c.fillRect(0,0,w,h);
 // Eleven broad light pools are grouped by terrain purpose rather than tile.
 for(let i=0;i<11;i++){
  const k=hybridMeadowHash(seed+i*1079),o=f.obstacles[i%Math.max(1,f.obstacles.length)];
  const shade=i%3!==0,x=shade&&o?o.x+.75:.4+(k%114)/10,
   y=shade&&o?o.y+.9:.3+((k>>>9)%150)/10,r=shade?1.45+((k>>>21)%12)/10:2.8+((k>>>21)%13)/10;
  const glaze=c.createRadialGradient(x,y,.08,x,y,r);
  glaze.addColorStop(0,shade?'#244e4826':'#d1d3a92b');
  glaze.addColorStop(1,shade?'#244e4800':'#d1d3a900');
  c.fillStyle=glaze;c.fillRect(x-r,y-r,r*2,r*2);
 }
 hybridMeadowTrail(c,plan,true);
 const detail=buildHybridMeadowDetailPlan(f,plan);
 for(const g of detail.groups){
  if(g.category==='edge'){
   // Soil and grass touch the outer rim; the center line stays uninterrupted.
   const nearest=[...plan.trail].map(key=>{const [x,y]=key.split(',').map(Number);return {x:x+.5,y:y+.5};})
    .sort((a,b)=>Math.hypot(a.x-g.x,a.y-g.y)-Math.hypot(b.x-g.x,b.y-g.y))[0];
   if(nearest){
    const dx=nearest.x-g.x,dy=nearest.y-g.y,n=Math.hypot(dx,dy)||1;
    c.save();c.globalAlpha=.24;c.lineCap='round';c.lineWidth=.11;c.strokeStyle=HM.grass;
    c.beginPath();c.moveTo(g.x,g.y);c.quadraticCurveTo(g.x+dx/n*.16,g.y+dy/n*.16,g.x+dx/n*.25,g.y+dy/n*.25);c.stroke();
    c.globalAlpha=.19;c.lineWidth=.035;c.strokeStyle=HM.trailRim;c.beginPath();
    c.moveTo(g.x-dy/n*.17,g.y+dx/n*.17);c.quadraticCurveTo(g.x+dx/n*.18,g.y+dy/n*.18,g.x+dy/n*.13,g.y-dx/n*.13);c.stroke();c.restore();
   }
  }
  paintGroundCluster(c,g);
 }
 c.restore();
}
export function hybridMeadowGroundPlan(f){
 return isHybridMeadow(f)?herbPixelGroundPlan(f):null;
}
export function drawHybridMeadowGround(c,f){
 const plan=hybridMeadowGroundPlan(f);
 if(!plan)return false;
 const mode=f.artPreviewMode==='hybrid-e0'?'hybrid-e0':'hybrid-e1';
 let images=hybridMeadowGroundCache.get(f);
 if(!images){images=new Map();hybridMeadowGroundCache.set(f,images);}
 let image=images.get(mode);
 if(!image){
  image=document.createElement('canvas');
  image.width=plan.width*64;image.height=plan.height*64;
  const g=image.getContext('2d',{alpha:false});
  g.scale(64,64);g.imageSmoothingEnabled=true;
  if(mode==='hybrid-e0')hybridMeadowGroundE0Into(g,f,plan);
  else hybridMeadowGroundE1Into(g,f,plan);
  images.set(mode,image);
 }
 c.save();c.imageSmoothingEnabled=true;
 c.drawImage(image,0,0,plan.width,plan.height);
 c.restore();
 return true;
}
function hybridMeadowTree(c,o,index){
 const alt=index%3,ox=o.x+.5,oy=o.y+.5;
 c.save();c.translate(ox,oy);
 c.scale(alt===1?.94:alt===2?1.07:1,alt===1?1.04:alt===2?.94:1);
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
 hybridMeadowLeaf(c,-.07+sway,-1.23,.69,.55,alt===2?'#648873':HM.foliage);
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

// F1/F2/F3: quiet painted habitats around the SAME physical maps. Static
// ground plans/textures are cached; ecology motion reads the simulation clock.
import {fieldArtGroundPlan} from './field_pixel_herb_v011c.js?v=0.11.0-alpha.7';
import {buildHybridFieldDetailPlan,drawHybridFieldTrail,drawHybridMeadowGround,drawHybridMeadowObstacle} from './field_hybrid_meadow_v011e.js?v=0.11.0-alpha.7';
export const HYBRID_FIELD_STYLES=Object.freeze(['meadow','glow','roots','garden','spring','oasis','steam','ember']);
export const HYBRID_FIELD_PALETTES=Object.freeze({
 glow:{base:'#5d817d',light:'#85a39a',shade:'#365c62',soil:'#829987',rim:'#617d70',water:'#557e88',spark:'#b4d6bc',dark:'#355c5d',object:'#80a695',high:'#c6d5b3'},
 roots:{base:'#767568',light:'#95927b',shade:'#4d5e55',soil:'#a48b73',rim:'#746e5c',water:'#606f6c',spark:'#b7baa1',dark:'#484c43',object:'#786b55',high:'#b1a17d'},
 garden:{base:'#8c9874',light:'#b4ba91',shade:'#718666',soil:'#b6a17d',rim:'#89916b',water:'#739984',spark:'#d5d6ae',dark:'#576b48',object:'#739365',high:'#b7c796'},
 spring:{base:'#a9aa8b',light:'#c7c9a8',shade:'#899c8a',soil:'#d1c29b',rim:'#a9ae89',water:'#83aaa7',spark:'#dfecce',dark:'#748b7c',object:'#9cac94',high:'#dad8b7'},
 oasis:{base:'#99ac9a',light:'#bdc8ad',shade:'#74948a',soil:'#c6c8a5',rim:'#91a894',water:'#73a7a5',spark:'#c9e8d4',dark:'#61827c',object:'#96bfaf',high:'#d3e4ce'},
 steam:{base:'#84948b',light:'#b0b9a3',shade:'#647f79',soil:'#b5b39a',rim:'#829b8e',water:'#88b4ae',spark:'#dbdfc8',dark:'#526d69',object:'#84988d',high:'#c4c8b1'},
 ember:{base:'#958573',light:'#b4a286',shade:'#716f65',soil:'#bdac8c',rim:'#8d8c75',water:'#bd916b',spark:'#e6c39a',dark:'#635c57',object:'#867966',high:'#b7a689'}
});
const fieldHybridGroundCache=new WeakMap(),fieldHybridPlans=new WeakMap();
const hfHash=n=>(Math.imul(1664525,n>>>0)+1013904223)>>>0;
const hfEllipse=(c,x,y,rx,ry,col)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=col;c.fill();};
const hfLine=(c,pts,col,w=.04)=>{c.beginPath();c.moveTo(...pts[0]);for(const p of pts.slice(1))c.lineTo(...p);c.lineCap='round';c.lineJoin='round';c.lineWidth=w;c.strokeStyle=col;c.stroke();};
const hfLeaf=(c,x,y,w,h,col)=>{c.beginPath();c.moveTo(x-w,y);c.bezierCurveTo(x-w*.8,y-h,x+w*.6,y-h,x+w,y);c.bezierCurveTo(x+w*.5,y+h*.75,x-w*.65,y+h*.7,x-w,y);c.fillStyle=col;c.fill();};
const hfPoly=(c,pts,fill)=>{c.beginPath();c.moveTo(...pts[0]);for(const p of pts.slice(1))c.lineTo(...p);c.closePath();c.fillStyle=fill;c.fill();};
export function isHybridFieldArt(f){return !!(f?.worldVersion==='0.11-B1'&&HYBRID_FIELD_STYLES.includes(f.biome?.style)&&!['pixel','legacy'].includes(f.artPreviewMode));}
export function hybridFieldLandscapePlan(f){
 if(!isHybridFieldArt(f))return null;
 let plan=fieldHybridPlans.get(f);if(plan)return plan;
 const ground=fieldArtGroundPlan(f),details=buildHybridFieldDetailPlan(f,ground),style=f.biome.style;
 const pools=[];
 if(['glow','spring','oasis'].includes(style)){
  for(const g of details.groups.filter(g=>g.category==='free')){
   if(pools.length>=3)break;
   const clear=(f.nodes||[]).every(n=>Math.hypot(g.x-n.x,g.y-n.y)>2)&&
    f.obstacles.every(o=>Math.hypot(g.x-o.x-.5,g.y-o.y-.5)>1.2)&&
    f.hazards.every(o=>Math.hypot(g.x-o.x-.5,g.y-o.y-.5)>1.6)&&
    [...ground.trail].every(k=>{const [x,y]=k.split(',').map(Number);return Math.hypot(g.x-x-.5,g.y-y-.5)>1.1;});
   if(clear)pools.push({x:g.x,y:g.y,w:.65+(hfHash(Math.floor(g.x*93+g.y*317))%4)*.09,h:.38});
  }
 }
 plan={ground,details,pools,style,seed:f.biome.encounterSeed};fieldHybridPlans.set(f,plan);return plan;
}
function hfWetPatch(c,a,p){
 c.save();c.translate(a.x,a.y);
 // A shallow, open-edged basin. It is a ground material, never a new wall.
 c.beginPath();c.moveTo(-a.w,-.04);c.bezierCurveTo(-a.w*1.08,-a.h*.8,-a.w*.35,-a.h*1.2,0,-a.h);
 c.bezierCurveTo(a.w*.55,-a.h*.8,a.w*1.15,-a.h*.2,a.w,.08);
 c.bezierCurveTo(a.w*.85,a.h*.95,-a.w*.68,a.h*1.1,-a.w,-.04);c.closePath();
 c.fillStyle=p.rim;c.fill();c.lineWidth=.08;c.strokeStyle=p.soil;c.stroke();
 c.save();c.scale(.88,.81);c.fillStyle=p.water;c.fill();c.restore();
 hfLine(c,[[-a.w*.5,-a.h*.32],[-a.w*.16,-a.h*.48],[a.w*.19,-a.h*.4]],p.high+'66',.045);
 c.restore();
}
function hfGroundDetail(c,g,style,p){
 c.save();c.translate(g.x,g.y);c.rotate(g.angle);c.scale(g.scale,g.scale);c.globalAlpha=.24;c.lineCap='round';
 if(g.category==='root'){
  hfEllipse(c,0,.05,.28,.095,p.rim);
  hfLine(c,[[-.24,.06],[-.05,-.03],[.21,.03]],p.dark,.045);
  hfLeaf(c,.08,.07,.10,.03,p.high);
 }else if(style==='garden'){
  // Low decorative furrows, not new harvest plants or collider objects.
  for(const y of [-.14,.02,.18]){c.beginPath();c.moveTo(-.30,y);c.quadraticCurveTo(0,y+.045,.28,y);c.lineWidth=.065;c.strokeStyle=p.rim;c.stroke();}
  hfLeaf(c,-.12,-.13,.09,.03,p.dark);hfLeaf(c,.11,.03,.075,.034,p.high);
 }else if(style==='roots'){
  c.beginPath();c.moveTo(-.32,.04);c.bezierCurveTo(-.13,-.11,.13,.10,.30,-.16);c.strokeStyle=p.dark;c.lineWidth=.075;c.stroke();
  c.beginPath();c.moveTo(-.10,-.025);c.quadraticCurveTo(-.08,.12,.04,.19);c.lineWidth=.04;c.stroke();
  hfLeaf(c,.16,-.05,.10,.035,p.high);
 }else if(style==='steam'||style==='ember'){
  hfPoly(c,[[-.24,.0],[-.12,-.12],[.17,-.06],[.26,.06],[.08,.12]],p.high);
  hfLine(c,[[-.16,.04],[-.04,-.035],[.14,.07]],p.dark,.04);
 }else if(style==='glow'){
  hfLeaf(c,-.10,0,.17,.055,p.dark);hfLeaf(c,.13,.07,.12,.05,p.high);
  hfLine(c,[[-.04,.03],[-.09,-.12]],p.high,.026);
 }else{
  for(const [x,y] of [[-.12,-.17],[.02,-.23],[.16,-.12]]){
   c.beginPath();c.moveTo(0,.07);c.quadraticCurveTo(x*.2,y*.3,x,y);c.strokeStyle=p.dark;c.lineWidth=.035;c.stroke();}
  hfLeaf(c,.10,.045,.13,.035,p.high);
 }
 c.restore();
}
function hfGroundInto(c,f,plan){
 const p=HYBRID_FIELD_PALETTES[plan.style],w=f.worldW,h=f.worldH;
 c.save();c.beginPath();c.rect(0,0,w,h);c.clip();
 const base=c.createLinearGradient(0,0,w,h);base.addColorStop(0,p.light);base.addColorStop(.45,p.base);base.addColorStop(1,p.shade);c.fillStyle=base;c.fillRect(0,0,w,h);
 for(let i=0;i<9;i++){
  const o=f.obstacles[i%f.obstacles.length],n=hfHash(plan.seed+i*1291),x=o?o.x+.7:(n%100)/10,y=o?o.y+.85:((n>>>8)%140)/10,r=1.6+(n%7)*.12;
  const glaze=c.createRadialGradient(x,y,.05,x,y,r);glaze.addColorStop(0,p.dark+'24');glaze.addColorStop(1,p.dark+'00');c.fillStyle=glaze;c.fillRect(x-r,y-r,r*2,r*2);
 }
 // Large authored material regions give water/soil/rock their own topology.
 // These are shallow/flat substrates; the authoritative collision map is unchanged.
 if(plan.style==='spring'||plan.style==='oasis'){
  const sign=(plan.seed>>>9)%2?1:-1;
  for(const [x,y,w,h] of [[6+sign*2.1,4.1,3.1,1.12],[6-sign*2.2,11.9,3.0,1.26]]){
   c.save();c.globalAlpha=.62;hfWetPatch(c,{x,y,w,h},p);c.restore();
  }
  // Keep actual pickup/collider/hazard bases visibly dry rather than floating.
  for(const n of [...f.nodes,...f.obstacles.map(o=>({x:o.x+.5,y:o.y+.5})),...f.hazards.map(o=>({x:o.x+.5,y:o.y+.5}))]){
   const dry=c.createRadialGradient(n.x,n.y,.27,n.x,n.y,.95);dry.addColorStop(0,p.base+'ee');dry.addColorStop(1,p.base+'00');c.fillStyle=dry;c.fillRect(n.x-.95,n.y-.95,1.9,1.9);
  }
 }else if(plan.style==='garden'){
  for(const [i,g] of plan.details.groups.filter(g=>g.category==='free').slice(0,3).entries()){
   c.save();c.translate(g.x,g.y);c.rotate(i%2?.07:-.04);c.globalAlpha=.20;
   c.beginPath();c.roundRect(-.90,-.62,1.80,1.24,.19);c.fillStyle=p.soil;c.fill();
   for(let y=-.42;y<.55;y+=.28){c.beginPath();c.moveTo(-.76,y);c.quadraticCurveTo(-.1,y+.05,.74,y-.025);c.strokeStyle=p.dark;c.lineWidth=.068;c.stroke();}
   c.restore();
  }
 }else if(plan.style==='steam'||plan.style==='ember'){
  for(const hz of f.hazards){
   const x=hz.x+.5,y=hz.y+.5;c.save();c.globalAlpha=.24;
   hfPoly(c,[[x-.72,y-.25],[x-.14,y-.54],[x+.64,y-.27],[x+.81,y+.26],[x+.07,y+.52],[x-.64,y+.37]],p.dark);
   hfLine(c,[[x-.60,y+.13],[x-.12,y-.10],[x+.42,y+.22]],p.soil,.075);c.restore();
  }
 }
 for(const a of plan.pools)hfWetPatch(c,a,p);
 drawHybridFieldTrail(c,plan.ground,{trailRim:p.rim,trail:p.soil,trailLight:plan.style==='glow'?p.high:p.light});
 for(const g of plan.details.groups)hfGroundDetail(c,g,plan.style,p);
 c.restore();
}
export function drawHybridFieldGround(c,f){
 if(!isHybridFieldArt(f))return false;
 if(f.biome.style==='meadow')return drawHybridMeadowGround(c,f);
 const plan=hybridFieldLandscapePlan(f);let image=fieldHybridGroundCache.get(f);
 if(!image){image=document.createElement('canvas');image.width=f.worldW*64;image.height=f.worldH*64;
  const g=image.getContext('2d',{alpha:false});g.scale(64,64);hfGroundInto(g,f,plan);fieldHybridGroundCache.set(f,image);}
 c.save();c.imageSmoothingEnabled=true;c.drawImage(image,0,0,f.worldW,f.worldH);c.restore();return true;
}
function hfRock(c,p,index,ember=false){
 const skew=index%3*.06;
 hfPoly(c,[[-.47,.19],[-.46,-.12],[-.28,-.46],[.04,-.58],[.38,-.29],[.48,.17],[.12,.28]],p.dark);
 hfPoly(c,[[-.44,-.13],[-.27,-.44],[.035,-.54],[.32,-.29],[.09,-.11]],p.high);
 hfPoly(c,[[.09,-.11],[.32,-.29],[.46,.16],[.10,.24]],p.object);
 hfLine(c,[[-.28,-.11],[-.05,-.18],[.12,-.12]],p.soil,.035);
 hfLeaf(c,-.23,.13,.14,.055,p.rim);
 if(ember)hfLine(c,[[-.02,-.38],[.04,-.20],[skew,.07]],'#c69872',.055);
}
export function drawHybridFieldObstacle(c,o,style,index=0){
 if(style==='meadow'){drawHybridMeadowObstacle(c,o,index);return;}
 const p=HYBRID_FIELD_PALETTES[style];if(!p)return;
 c.save();c.translate(o.x+.5,o.y+.5);hfEllipse(c,.03,.27,.54,.18,p.dark+'55');
 if(style==='glow'){
  // Fluted trunk + curved umbrella, pale gills and one restrained lit ridge.
  c.beginPath();c.moveTo(-.12,.21);c.bezierCurveTo(-.03,-.02,-.16,-.30,-.13,-.58);c.lineTo(.15,-.58);c.bezierCurveTo(.10,-.24,.04,.05,.18,.21);c.closePath();c.fillStyle=p.soil;c.fill();
  hfLeaf(c,0,-.56,.68,.30,p.dark);hfLeaf(c,-.03,-.72,.63,.28,p.object);hfLeaf(c,-.17,-.80,.30,.105,p.high);
  for(const x of [-.3,-.1,.15,.35])hfLine(c,[[x,-.54],[x*.40,-.36]],p.soil+'aa',.022);
  hfLine(c,[[-.52,-.56],[-.22,-.50],[.12,-.51],[.52,-.61]],p.spark,.033);
 }else if(style==='roots'){
  // Actual solid stump/tree with flared roots; no new roots as hidden walls.
  c.beginPath();c.moveTo(-.39,.24);c.bezierCurveTo(-.21,.05,-.20,-.78,-.26,-1.18);c.lineTo(.22,-1.18);c.bezierCurveTo(.17,-.57,.12,.06,.39,.24);c.closePath();c.fillStyle=p.dark;c.fill();
  hfLine(c,[[-.12,.17],[-.09,-.50],[-.14,-1.08]],p.object,.11);hfLine(c,[[.13,-.42],[.28,-.73],[.48,-.78]],p.dark,.09);
  hfLeaf(c,-.30,-1.02,.50,.31,p.shade);hfLeaf(c,.30,-1.22,.52,.32,p.dark);hfLeaf(c,-.06,-1.36,.45,.24,p.object);hfLeaf(c,.17,-1.40,.24,.10,p.high);
  hfLine(c,[[-.18,.1],[-.46,.27]],p.object,.07);hfLine(c,[[.16,.09],[.46,.28]],p.object,.07);
 }else if(style==='garden'){
  // Hedge silhouette grounded on the existing solid tile; furrows are ground.
  hfEllipse(c,0,.14,.42,.14,p.dark);hfLeaf(c,-.22,-.16,.38,.30,p.dark);hfLeaf(c,.22,-.30,.40,.32,p.object);
  hfLeaf(c,-.13,-.42,.34,.24,p.object);hfLeaf(c,.11,-.52,.23,.15,p.high);
  hfLine(c,[[-.10,-.24],[.05,-.35],[.16,-.31]],p.high,.034);
 }else if(style==='oasis'){
  hfPoly(c,[[-.38,.20],[-.26,-.43],[-.02,-.81],[.16,-.70],[.37,.16]],p.dark);
  hfPoly(c,[[-.25,-.40],[-.02,-.78],[.08,.13],[-.24,.15]],p.object);
  hfPoly(c,[[-.02,-.78],[.15,-.67],[.34,.16],[.08,.13]],p.high);
  hfPoly(c,[[-.35,.18],[-.20,-.22],[-.06,-.15],[.01,.19]],p.rim);
  hfLine(c,[[-.025,-.60],[.01,-.31],[.04,-.10]],p.spark,.035);
 }else hfRock(c,p,index,style==='ember');
 c.restore();
}
export function drawHybridFieldAtmosphere(c,f,time){
 if(!isHybridFieldArt(f)||f.biome.style==='meadow')return;
 const plan=hybridFieldLandscapePlan(f),p=HYBRID_FIELD_PALETTES[plan.style];
 c.save();c.lineCap='round';
 if(['spring','oasis','glow'].includes(plan.style))for(const a of plan.pools){
  c.globalAlpha=.17+.05*Math.sin(time*1.1+a.x);c.beginPath();c.ellipse(a.x,a.y,.26+.03*Math.sin(time+a.y),.055,0,.2,Math.PI*.9);c.lineWidth=.026;c.strokeStyle=p.spark;c.stroke();
 }
 const marks=plan.details.groups.filter(g=>g.category==='free').slice(0,4);
 for(const [i,g] of marks.entries()){
  if(['spring','steam'].includes(plan.style)){
   c.globalAlpha=.11+.03*Math.sin(time*.9+i);c.beginPath();c.moveTo(g.x-.08,g.y+.08);c.bezierCurveTo(g.x-.21,g.y-.10,g.x+.18,g.y-.27,g.x+.04+Math.sin(time*.7+i)*.045,g.y-.42);c.strokeStyle=p.spark;c.lineWidth=.11;c.stroke();
  }else if(plan.style==='glow'){
   c.globalAlpha=.28+.08*Math.sin(time+i);hfEllipse(c,g.x+Math.sin(time*.4+i)*.08,g.y-.20+Math.sin(time*.6+i)*.05,.022,.033,p.spark);
  }else if(plan.style==='ember'){
   c.globalAlpha=.11;c.beginPath();c.moveTo(g.x-.13,g.y);c.quadraticCurveTo(g.x+Math.sin(time*.8+i)*.04,g.y-.18,g.x+.11,g.y-.30);c.lineWidth=.036;c.strokeStyle=p.spark;c.stroke();
  }
 }
 c.restore();
}
export function drawHybridFieldHazard(c,hz,phase,style,time){
 const p=HYBRID_FIELD_PALETTES[style]||HYBRID_FIELD_PALETTES.spring,x=hz.x+.5,y=hz.y+.5;
 c.save();c.translate(x,y);hfEllipse(c,0,.09,.43,.24,p.dark+'99');
 hfPoly(c,[[-.39,-.05],[-.22,-.29],[.15,-.31],[.41,-.10],[.28,.21],[-.22,.20]],p.high);
 hfEllipse(c,0,-.01,.29,.16,p.dark);
 const accent=style==='roots'?'#c2abc9':style==='ember'?'#e5ad80':'#e4d6ae';
 if(phase.warning||phase.active){
  c.beginPath();c.arc(0,0,phase.radius,0,Math.PI*2);c.strokeStyle=accent;c.lineWidth=.065;
  if(phase.warning)c.setLineDash([.16,.10]);c.stroke();c.setLineDash([]);
  hfEllipse(c,0,-.025,.22,.13,phase.active?'#d3937266':accent+'44');
  if(phase.active)for(const dx of [-.12,.06,.18]){
   c.beginPath();c.moveTo(dx,.02);c.bezierCurveTo(dx-.1,-.12,dx+.11,-.27,dx+Math.sin(time*7+dx)*.045,-.43);c.lineWidth=.055;c.strokeStyle=accent;c.stroke();
  }
 }
 c.restore();
}

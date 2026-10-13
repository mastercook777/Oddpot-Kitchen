// v0.11-B1: original procedural world art. World-space objects have a grounded
// relationship to real collision tiles and are drawn beneath usable pickups.
const PALETTE={
 meadow:['#436944','#628252','#9ba769','#cfbf86','#d1e5a2'],
 glow:['#203c47','#315b63','#558a80','#99dfbe','#d6ffd3'],
 roots:['#2b3038','#514453','#846778','#c39aba','#edc7e6'],
 garden:['#536a45','#718451','#a6ae65','#d9bd80','#e3eeb4'],
 spring:['#93785b','#b19b74','#8da89d','#d6ca9d','#bdf3e8'],
 steam:['#505c5c','#738280','#9eaca1','#d8d0b5','#d6fff4'],
 ember:['#3c3639','#60423c','#9a5944','#ef9d61','#ffd590'],
 oasis:['#788775','#a3ac96','#6eaba7','#c3e6d7','#d8fbf4']
};
const worldArtHash=n=>(Math.imul(1664525,n>>>0)+1013904223)>>>0;
const worldArtPoly=(c,points,fill,stroke=null,width=.04)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.lineWidth=width;c.strokeStyle=stroke;c.worldArtStroke()}};
const worldArtEllipse=(c,x,y,rx,ry,fill)=>{c.beginPath();c.worldArtEllipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill()};
const worldArtStroke=(c,points,col,w=.06)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.worldArtStroke()};
export function drawExpandedLandscape(c,f,t){
 const style=f.biome?.style||'meadow',p=PALETTE[style]||PALETTE.meadow,
  seed=f.biome?.encounterSeed||1;
 c.fillStyle=p[0];c.fillRect(0,0,f.worldW,f.worldH);
 // Orthogonal pixel dither patches make the substrate look authored, not flat.
 // Tiny patches remain non-colliding. The larger trees/crystals use obstacles.
 for(let y=0;y<f.worldH;y++)for(let x=0;x<f.worldW;x++){
  const h=worldArtHash(seed+y*1019+x*1999);
  if(h%5===0){c.fillStyle=p[1];c.globalAlpha=.28;c.fillRect(x+.12,y+.2,.50,.22);c.globalAlpha=1;}
  if(h%9===0){c.fillStyle=p[2];c.globalAlpha=.24;c.fillRect(x+.5,y+.58,.29,.12);c.globalAlpha=1;}
 }
 // Trails are painted using the same physical BFS as pickups. They never lead
 // the player straight into an invented wall or inactive fake passage.
 const goal=f.nodes.find(n=>n.key==='target'&&!n.claimed)||f.nodes.find(n=>n.key==='target');
 if(goal){ // use actual map path; no fixed decorative ribbon as in old 9x11.
  // Imported lazily in the calling module? No - geometry isn't required here:
  // draw short worn ground tiles around existing passable, nonhazard cells.
  const blocked=new Set([...f.obstacles,...f.hazards].map(n=>n.x+','+n.y));
  const mid=Math.floor(f.worldW/2);
  for(let y=2;y<f.worldH-1;y++){const x=Math.max(1,Math.min(f.worldW-2,mid+Math.round(Math.sin(y*.69+seed%4))));
   if(blocked.has(x+','+y))continue;
   c.globalAlpha=.20;worldArtEllipse(c,x+.5,y+.5,.54,.31,p[3]);c.globalAlpha=1;
  }
 }
 if(style==='garden'){
  for(let y=2;y<14;y+=3){for(let x=1;x<11;x+=3){
   for(let k=0;k<4;k++){const xx=x+k*.43;
    worldArtStroke(c,[[xx,y],[xx+.1,y+1.65]],'#394e36',.12);
    worldArtEllipse(c,xx+.10,y+.35,.17,.12,k%2?p[2]:p[3]);
    worldArtEllipse(c,xx+.05,y+.78,.18,.14,p[2]);
   }
  }}
 }else if(style==='glow'){
  for(let i=0;i<9;i++){const h=worldArtHash(seed+i*3611),x=.8+(h%102)/10,y=1.1+((h>>>7)%135)/10;
   worldArtEllipse(c,x,y,.7+(i%3)*.22,.38,p[1]);worldArtEllipse(c,x,y,.38,.17,p[2]);
   worldArtEllipse(c,x-.18,y-.09,.08,.06,p[4]);
  }
 }else if(style==='roots'){
  for(let i=0;i<7;i++){const h=worldArtHash(seed+i*7919),x=.3+(h%108)/10,y=.6+((h>>>8)%150)/10;
   worldArtStroke(c,[[x,y],[x+.35,y+.55],[x-.12,y+1.1]],'#29242d',.34);
   worldArtStroke(c,[[x+.05,y],[x+.36,y+.55],[x-.06,y+1.07]],p[2],.09);
  }
 }else if(style==='spring'||style==='oasis'){
  for(let i=0;i<8;i++){const h=worldArtHash(seed+i*2309),x=1+(h%96)/10,y=1+((h>>>9)%138)/10;
   worldArtEllipse(c,x,y,.82,.51,p[3]);worldArtEllipse(c,x,y,.63,.39,style==='oasis'?'#72aba9':'#75b4a7');
   worldArtEllipse(c,x-.2,y-.12,.35,.10,p[4]);
  }
 }else if(style==='steam'){
  for(let i=0;i<8;i++){const h=worldArtHash(seed+i*3067),x=(h%115)/10,y=((h>>>8)%156)/10;
   worldArtStroke(c,[[x,y],[x+.4,y+.65],[x-.1,y+1.4]],'#334849',.26);
   worldArtStroke(c,[[x+.02,y],[x+.41,y+.63],[x-.04,y+1.36]],p[2],.09);
  }
 }else if(style==='ember'){
  for(let i=0;i<9;i++){const h=worldArtHash(seed+i*1871),x=(h%116)/10,y=((h>>>7)%158)/10;
   worldArtStroke(c,[[x,y],[x+.28,y+.4],[x-.2,y+.74]],'#292a30',.33);
   worldArtStroke(c,[[x,y],[x+.28,y+.4],[x-.2,y+.74]],i%2?p[3]:p[2],.11);
  }
 }else{
  for(let i=0;i<8;i++){const h=worldArtHash(seed+i*1793),x=.6+(h%104)/10,y=.4+((h>>>8)%151)/10;
   worldArtEllipse(c,x,y,.62,.35,p[1]);worldArtEllipse(c,x+.15,y+.10,.36,.17,p[2]);
  }
 }
 for(const a of f.scenery||[]){
  const h=worldArtHash(seed+Math.floor(a.x*73)+Math.floor(a.y*917));
  c.save();c.translate(a.x,a.y);c.scale(a.scale,a.scale);
  if(style==='glow'){worldArtEllipse(c,0,0,.18,.07,'#1d3944');
   worldArtEllipse(c,0,-.12,.16,.11,p[3]);worldArtEllipse(c,-.06,-.19,.08,.04,p[4]);
  }else if(style==='ember'){worldArtEllipse(c,0,0,.19,.08,'#2b292e');worldArtStroke(c,[[-.10,-.03],[.06,-.07],[.14,-.02]],p[3],.035);
  }else if(style==='roots'){worldArtStroke(c,[[-.20,.10],[-.01,-.14],[.12,-.26]],p[2],.065);worldArtEllipse(c,.08,-.18,.06,.06,p[4]);
  }else if(style==='spring'||style==='steam'||style==='oasis'){
   worldArtEllipse(c,0,0,.19,.09,p[2]);worldArtEllipse(c,-.05,-.08,.08,.04,p[4]);
   if(h%3===0){c.globalAlpha=.25+.12*Math.sin(t*2+a.x);worldArtEllipse(c,0,-.25,.12,.21,p[4]);}
  }else if(style==='garden'){worldArtEllipse(c,0,0,.21,.13,p[2]);worldArtStroke(c,[[0,.04],[0,-.2]],p[1],.06);worldArtEllipse(c,-.10,-.18,.12,.055,p[4]);
  }else{worldArtStroke(c,[[0,.08],[-.08,-.20]],p[2],.08);worldArtStroke(c,[[0,.07],[.12,-.25]],p[2],.09);
   if(h%4===0)worldArtEllipse(c,.11,-.22,.07,.06,p[3]);
  }
  c.restore();
 }
 // Rim is drawn from world extents, never from an invented internal wall.
 c.strokeStyle=p[2];c.lineWidth=.13;c.strokeRect(.08,.08,f.worldW-.16,f.worldH-.16);
}
export function drawExpandedObstacle(c,o,style='meadow',t=0){
 const p=PALETTE[style]||PALETTE.meadow,x=o.x+.5,y=o.y+.5;
 c.save();c.translate(x,y);
 worldArtEllipse(c,0,.33,.43,.16,'#1a292b77');
 if(['meadow','garden','roots'].includes(style)){
  // Trunk and broad two-lobed crown fit the actual blocked unit tile.
  worldArtPoly(c,[[-.15,.2],[-.12,-.36],[.11,-.36],[.19,.26]],'#614b38','#342f30',.05);
  worldArtPoly(c,[[-.44,-.26],[-.26,-.72],[.13,-.87],[.44,-.47],[.39,-.12],[-.22,-.04]],p[1],p[0],.07);
  worldArtEllipse(c,-.13,-.47,.20,.16,p[2]);worldArtEllipse(c,.14,-.68,.17,.12,p[3]);
  if(style==='roots'){worldArtStroke(c,[[-.15,.14],[-.4,.33]],p[2],.09);worldArtStroke(c,[[.12,.14],[.4,.35]],p[2],.09);}
 }else if(style==='glow'){
  worldArtPoly(c,[[-.10,.24],[-.18,-.31],[.16,-.31],[.08,.24]],'#96a79c',p[0],.05);
  worldArtEllipse(c,0,-.40,.43,.32,p[2]);worldArtEllipse(c,-.09,-.53,.24,.12,p[4]);
  for(const px of [-.24,0,.21])worldArtEllipse(c,px,-.42,.04,.025,p[4]);
 }else if(style==='ember'||style==='steam'){
  worldArtPoly(c,[[-.48,.24],[-.30,-.31],[-.05,-.72],[.18,-.58],[.48,.17],[.18,.30]],p[1],p[0],.075);
  worldArtStroke(c,[[-.06,-.52],[.08,-.23],[.13,.19]],style==='ember'?p[3]:p[3],.09);
  if(style==='ember')worldArtEllipse(c,.10,-.31,.08,.06,p[4]);
  else {worldArtEllipse(c,.12,-.28,.10,.08,p[2]);}
 }else if(style==='oasis'){
  worldArtPoly(c,[[-.36,.22],[-.16,-.52],[.04,-.75],[.23,-.30],[.38,.20]],p[2],p[0],.065);
  worldArtPoly(c,[[-.16,.07],[-.02,-.54],[.12,.02]],p[4]);
 }else{
  worldArtPoly(c,[[-.46,.20],[-.35,-.23],[-.07,-.59],[.34,-.35],[.44,.11]],p[1],p[0],.075);
  worldArtEllipse(c,-.13,-.22,.21,.13,p[2]);worldArtStroke(c,[[-.30,.07],[.2,.18]],p[3],.065);
 }
 c.restore();
}

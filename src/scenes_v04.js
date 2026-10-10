import {pixelActor,pixelEnemy,pixelImpact} from './pixels_v041.js?v=0.4.5';
// Lightweight procedural game graphics: original Canvas shapes, no art pack.
import {ING,RECIPES,CUSTOMERS} from './data.js?v=0.4.5';
const color={ink:'#24382a',leaf:'#386b43',soil:'#806044',stone:'#a6b392',cream:'#f4dfb0',gold:'#dfb873'};
function rect(c,x,y,w,h,fill){c.fillStyle=fill;c.fillRect(x,y,w,h)}
function circle(c,x,y,r,fill){c.fillStyle=fill;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill()}
function line(c,x1,y1,x2,y2,stroke,width=1){c.strokeStyle=stroke;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()}
function text(c,string,x,y,fill='#fff1d0',size=12,align='center'){c.textAlign=align;c.textBaseline='middle';c.fillStyle=fill;c.font=`bold ${size}px system-ui`;c.fillText(string,x,y)}
function capsule(c,x,y,w,h,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,h/2);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke()}}
export function setCanvas(canvas){if(!canvas)return null;const {width,height}=canvas.getBoundingClientRect();if(width<10||height<10)return null;const dpr=Math.min(window.devicePixelRatio||1,2);const W=Math.floor(width*dpr),H=Math.floor(height*dpr);if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H}const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.imageSmoothingEnabled=false;c.clearRect(0,0,width,height);return {c,w:width,h:height};}
function tree(c,x,y,t=0){rect(c,x-4,y+2,8,16,'#6d4930');circle(c,x,y-8,16,'#214d34');circle(c,x-6,y-12,12,'#3e7850');circle(c,x+7,y-13,10,'#4e8a50');circle(c,x-6,y-16,2,'#92b66d')}
function chef(c,x,y,t=0,options={}){
 pixelActor(c,'chef',x,y,options.scale||1.7,{face:options.face||1,walk:options.walk?t:0,attack:options.attack||false,hurt:options.hurt||0});
}
function monster(c,e,t){
 const x=e.x,y=e.y;
 if(e.hp>0||e.deathFx>0){c.save();if(e.hp<=0)c.globalAlpha=Math.min(1,(e.deathFx||0)/.27);pixelEnemy(c,e.kind,x,y,1.8,{face:e.face||1,walk:t,hurt:e.hurtFx||0});c.restore();}
 if(e.warning>0){circle(c,x,y,19+Math.sin(t*14)*3,'#e9c26445');text(c,'!',x,y-29,'#ffdf83',16)}
 if(e.hp>0){capsule(c,x-12,y-27,24,4,'#28352f');capsule(c,x-12,y-27,24*e.hp/e.maxHp,4,'#e3b65d')}
}
function plant(c,n,t){const x=n.x,y=n.y;if(n.claimed)return;
 circle(c,x,y+6,13,'#274a3677');circle(c,x,y,11,n.key==='target'?'#f3d27d':'#8ba87a');
 if(n.id==='mushroom'){rect(c,x-2,y-2,4,13,'#e8d3ad');circle(c,x,y-4,9,'#a75f56');circle(c,x-3,y-6,2,'#f7e4b7')}
 else if(n.id==='chili'){line(c,x-2,y+8,x+3,y-8,'#d85e37',7);line(c,x+3,y-8,x+7,y-11,'#376b38',3)}
 else if(n.id==='beef'||n.id==='chicken'){circle(c,x,y,9,'#b36656');circle(c,x-2,y-1,5,'#d99171')}
 else {circle(c,x-4,y,6,'#6c9862');circle(c,x+4,y-3,5,'#c3ba68');rect(c,x-1,y+1,3,9,'#6f553e')}
 if(n.key==='target'){c.strokeStyle='#ffe09c';c.lineWidth=2;c.beginPath();c.arc(x,y,16+Math.sin(t*3)*2,0,Math.PI*2);c.stroke()}
}
export function drawField(canvas,s,clock){const size=setCanvas(canvas);if(!size||!s.field?.action)return;const {c,w,h}=size,f=s.field;const springs=f.region==='spring';const sc=Math.min(w/f.worldW,h/f.worldH),left=(w-sc*f.worldW)/2,top=(h-sc*f.worldH)/2;
 c.fillStyle=springs?'#9c674c':'#305a40';c.fillRect(0,0,w,h);c.save();c.translate(left,top);c.scale(sc,sc);
 rect(c,0,0,f.worldW,f.worldH,springs?'#ae8158':'#528659');for(let i=0;i<f.worldH;i++){rect(c,0,i,f.worldW,1,springs?(i%2?'#ae805a':'#b68762'):(i%2?'#548459':'#4c7f56'));}
 for(let k=0;k<45;k++){const x=((k*13+4)%87)/10,y=((k*17+3)%103)/10;circle(c,x,y,.04,springs?'#edc18a66':'#98b67a66')}
 c.fillStyle=springs?'#e0c49055':'#bbac7855';c.beginPath();c.ellipse(springs?3.7:4.4,6.4,2.2,4.9,.05,0,Math.PI*2);c.fill();
 if(springs){for(const hz of f.hazards){const x=hz.x+.5,y=hz.y+.5;circle(c,x,y,.39,'#775958');circle(c,x,y,.30,'#66949b');circle(c,x,y,.21,'#c1e1d9');if(((f.elapsed+(hz.x%2)*1.7)%4.2)>2.8){circle(c,x,y,.41,'#f7dcb355');circle(c,x,y,.32,'#efb86888')}}}
 for(const o of f.obstacles){c.save();c.translate(o.x+.5,o.y+.5);c.scale(1/sc,1/sc);if(springs){circle(c,0,3,15,'#8c5940');circle(c,-5,-4,14,'#625d59');circle(c,5,-6,9,'#817875');rect(c,-4,-18,8,3,'#be9a78')}else tree(c,0,0);c.restore()}
 for(const n of f.nodes){if(n.type==='event'&&!n.claimed){circle(c,n.x,n.y,.23,'#ecd597');rect(c,n.x-.11,n.y-.17,.23,.32,'#916b4b');text(c,'?',n.x,n.y-.04,'#4d3d28',.27)}else {c.save();c.translate(n.x,n.y);c.scale(1/sc,1/sc);plant(c,{...n,x:0,y:0},clock);c.restore()}}
 for(const p of f.projectiles||[]){circle(c,p.x,p.y,.12,'#ef9c4e');circle(c,p.x,p.y,.05,'#ffe5a3')}
 for(const e of f.enemies||[]){if(e.hp>0||e.deathFx>0){c.save();c.translate(e.x,e.y);c.scale(1/sc,1/sc);monster(c,{...e,x:0,y:0},clock);c.restore()}}
 // Attack swipe uses the *same* direction and trigger as combat hit detection.
 if(f.attackFx?.ttl>0){
  const fx=f.attackFx,progress=1-fx.ttl/fx.duration,angle=Math.atan2(fx.dy,fx.dx);
  c.save();c.translate(f.pos.x,f.pos.y);c.rotate(angle);c.globalAlpha=Math.min(1,fx.ttl*4);
  c.strokeStyle='#ffe6a1';c.lineWidth=.15;c.beginPath();c.arc(0,0,.79,-.93+progress*.7,.52+progress*.7);c.stroke();
  c.strokeStyle='#fff9e0';c.lineWidth=.07;c.beginPath();c.arc(0,0,1.05,-.65+progress*.65,.30+progress*.65);c.stroke();c.restore();
 }
 if(f.skillFx>0){c.save();c.strokeStyle=`rgba(255,231,151,${Math.min(.95,f.skillFx*2.4)})`;c.lineWidth=.12;c.beginPath();c.arc(f.pos.x,f.pos.y,(.42-f.skillFx)*3+.35,0,Math.PI*2);c.stroke();c.restore();}
 for(const e of f.enemies||[]){if(e.hurtFx>0&&e.hp>0){c.save();c.translate(e.x,e.y);c.scale(1/sc,1/sc);pixelImpact(c,0,-5,8);c.restore()}}
 for(const fx of f.popFx||[]){c.save();c.translate(fx.x,fx.y-(.76-fx.ttl)*.5);c.scale(1/sc,1/sc);text(c,fx.text,0,-17,fx.color||'#fff1b1',12);c.restore()}
 c.save();c.translate(f.pos.x,f.pos.y);c.scale(1/sc,1/sc);
 chef(c,0,Math.sin(clock*9)*(f.moving?1.5:.35),clock,{scale:1.55,walk:f.moving,attack:!!f.attackFx,face:(f.facing?.x||0)<-.15?-1:1,hurt:f.hurtFx});c.restore();
 if(f.harvestNode){const n=f.nodes.find(n=>n.key===f.harvestNode);if(n){capsule(c,n.x-.40,n.y-.49,.8,.10,'#304d39');capsule(c,n.x-.40,n.y-.49,.8*(f.harvestProgress/.82),.10,'#f3dd7e')}}
 c.restore();
 // Gameplay feedback lives in a short-lived DOM notice; never reserve a permanent text strip over the forest.
}
function guest(c,x,y,kind,time,walking=false){pixelActor(c,kind||'regular',x,y,1.4,{walk:walking?time:0});}
// Patience indicator is drawn next to the pixel customer, not below the table.
export function guestWaitRatio(simTime,arrival,patience){
 const total=Math.max(1,Number(patience)||1);
 return Math.max(0,Math.min(1,(total-Math.max(0,simTime-arrival))/total));
}
function waitingRing(c,x,y,ratio){
 const pct=Math.max(0,Math.min(1,ratio));
 circle(c,x,y,12,'#203b32dd');
 c.strokeStyle='#819182';c.lineWidth=3;c.beginPath();c.arc(x,y,9,-Math.PI/2,3*Math.PI/2);c.stroke();
 if(pct>0){c.strokeStyle=pct>.36?'#b4e27c':pct>.18?'#f6c563':'#f07f5b';c.lineWidth=3.5;c.lineCap='round';c.beginPath();c.arc(x,y,9,-Math.PI/2,-Math.PI/2+Math.PI*2*pct);c.stroke();}
 circle(c,x,y,2.2,'#f2e8cd');
}
function dish(c,x,y,kind){circle(c,x,y,12,'#f1e5c6');circle(c,x,y,9,'#9ba288');circle(c,x-3,y-1,4,kind==='POT'?'#ca9866':'#9a5438');circle(c,x+4,y-2,3,'#d3b76b');circle(c,x+1,y+4,3,'#719b55')}
// These pure timelines have no clock modulo. Each order animates exactly once.
export function arrivalProgress(simTime,arrivedAt,duration=.85){return Math.max(0,Math.min(1,(simTime-arrivedAt)/duration))}
export function servingProgress(simTime,servedAt,duration=1.25){const age=simTime-servedAt;return age<0||age>=duration?null:age/duration}
export function drawDiner(canvas,s,clock,simTime=s.service?.time??clock){const size=setCanvas(canvas);if(!size)return;const {c,w,h}=size,v=s.service;const t=v?simTime:clock;
 rect(c,0,0,w,h,'#6e5845');for(let y=0;y<h;y+=24){rect(c,0,y,w,22,y%48===0?'#765f49':'#705640');line(c,0,y,w,y,'#694d37',1)}
 // Wider camera: smaller furniture/actors leave a readable band for the HUD.
 c.save();c.translate(w*.105,h*.08);c.scale(.79,.81);
 // restaurant wall, kitchen and counter
 rect(c,0,0,w,h*.21,'#536f58');rect(c,w*.09,15,w*.32,26,'#c9a16c');text(c,'ODDPOT',w*.25,28,'#493928',13);rect(c,w*.76,7,w*.14,45,'#315d62');rect(c,w*.79,7,w*.02,45,'#b7d2ba');
 for(const [i,x] of [[0,w*.20],[1,w*.80]]){
  rect(c,x-43,h*.24-17,86,64,'#654b35');rect(c,x-39,h*.24-13,78,56,'#aa7950');
  circle(c,x,h*.24,24,i?'#7796a1':'#576f71');circle(c,x,h*.24,17,i?'#3c474d':'#3a4144');
  const busy=v?.stations[i?'POT':'WOK'];if(busy){for(let n=0;n<3;n++){circle(c,x-14+n*14,h*.24-22+Math.sin(t*3+n)*3,4,'#f3e0b588')}text(c,`${Math.max(0,Math.ceil(busy.left))}s`,x,h*.24+35,'#fff5d5',11)}
 }
 rect(c,w*.12,h*.43,w*.76,17,'#6f4d33');rect(c,w*.12,h*.43,w*.76,7,'#d3a66d');
 // A pixel-art chef animates continuously even between discrete order ticks.
 chef(c,w*.5+Math.sin(t*1.8)*3,h*.35+Math.sin(t*3),t,{scale:1.65,walk:!!v&&!v.paused&&!v.breakAt,attack:!!v?.stations.WOK&&!v.paused&&!v.breakAt});
 for(const evt of (v?.events||[]).filter(e=>e.type==='served'&&servingProgress(t,e.t)!==null)){
  const order=v.orders.find(o=>o.id===evt.order);if(!order||order.tableId==null)continue;
  const r=servingProgress(t,evt.t),endX=order.tableId?w*.75:w*.25;
  if(r<1) dish(c,w*.5+(endX-w*.5)*r,h*.45+(h*.65-h*.45)*r,'WOK');
 }
 for(let i=0;i<2;i++){
  const x=i?w*.75:w*.25,y=h*.60;
  circle(c,x,y+8,52,'#5b392b88');circle(c,x,y,46,'#674936');circle(c,x,y-5,41,'#c0905d');
  const o=v?.orders.find(o=>o.tableId===i&&['queued','cooking'].includes(o.status));
  const recent=!o&&v?.orders.find(o=>o.tableId===i&&o.status==='served'&&t-o.served<=4.5);
  if(o||recent){const g=o||recent;
   const events=v?.events?.filter(e=>e.order===g.id&&e.type==='arrived')||[];const at=events[0]?.t??v?.time??0;
   const appear=arrivalProgress(t,at);
   const gy=h*.84-(h*.84-(y-51))*appear+(v?.paused||v?.breakAt?0:Math.sin(t*3+i)*.6);
   guest(c,x,gy,g.segment,t,appear<1);
   if(o)waitingRing(c,x+25,gy-10,guestWaitRatio(t,o.arrival,o.patience));
   // The game-world table needs no tiny repeated dish text; tap a guest for details.
   if(recent){dish(c,x,y,'WOK');text(c,'好吃!',x,y-78,'#f8e1a4',12)}
  }
 }
 // Event result is surfaced in the transient HUD notice, not across customer sprites.
 rect(c,w*.45,h*.87,w*.1,h*.11,'#b98b62');rect(c,w*.47,h*.87,w*.06,h*.07,'#2b473a');
 for(const [x,y] of [[w*.12,h*.83],[w*.88,h*.82]]){rect(c,x-4,y+5,8,15,'#795436');circle(c,x,y,11,'#5d975d')}
 c.restore();
}
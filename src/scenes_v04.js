// Lightweight procedural game graphics: original Canvas shapes, no art pack.
import {ING,RECIPES,CUSTOMERS} from './data.js?v=0.4.0';
const color={ink:'#24382a',leaf:'#386b43',soil:'#806044',stone:'#a6b392',cream:'#f4dfb0',gold:'#dfb873'};
function rect(c,x,y,w,h,fill){c.fillStyle=fill;c.fillRect(x,y,w,h)}
function circle(c,x,y,r,fill){c.fillStyle=fill;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill()}
function line(c,x1,y1,x2,y2,stroke,width=1){c.strokeStyle=stroke;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()}
function text(c,string,x,y,fill='#fff1d0',size=12,align='center'){c.textAlign=align;c.textBaseline='middle';c.fillStyle=fill;c.font=`bold ${size}px system-ui`;c.fillText(string,x,y)}
function capsule(c,x,y,w,h,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,h/2);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke()}}
export function setCanvas(canvas){if(!canvas)return null;const {width,height}=canvas.getBoundingClientRect();if(width<10||height<10)return null;const dpr=Math.min(window.devicePixelRatio||1,2);const W=Math.floor(width*dpr),H=Math.floor(height*dpr);if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H}const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,width,height);return {c,w:width,h:height};}
function tree(c,x,y,t=0){rect(c,x-4,y+2,8,16,'#6d4930');circle(c,x,y-8,16,'#214d34');circle(c,x-6,y-12,12,'#3e7850');circle(c,x+7,y-13,10,'#4e8a50');circle(c,x-6,y-16,2,'#92b66d')}
function chef(c,x,y,t=0){
 circle(c,x,y+11,12,'#26463377');rect(c,x-9,y-2,18,21,'#d4a660');rect(c,x-5,y+13,4,6,'#473c32');rect(c,x+3,y+13,4,6,'#473c32');circle(c,x,y-6,9,'#edc4a0');rect(c,x-10,y-16,20,5,'#f5ead8');rect(c,x-7,y-22,14,10,'#faf3e5');rect(c,x-5,y-5,2,2,'#382e2b');rect(c,x+4,y-5,2,2,'#382e2b');rect(c,x-3,y+6,6,2,'#9d5533')}
function monster(c,e,t){const x=e.x,y=e.y;
 if(e.kind==='chicken'){circle(c,x,y+6,13,'#54452d80');circle(c,x,y,13,'#e4cf90');circle(c,x-2,y-4,8,'#f6e5bd');circle(c,x+7,y-2,2,'#202a26');rect(c,x+10,y+1,7,4,'#d18a4a');rect(c,x-6,y-17,5,7,'#ad5641');rect(c,x+1,y-17,5,7,'#b65a3d');}
 else{circle(c,x,y+5,12,'#34283580');circle(c,x,y,11,'#b34f42');circle(c,x-4,y-4,5,'#e48f48');circle(c,x+4,y-4,5,'#d56b3a');circle(c,x+9,y,2,'#fff1d2');rect(c,x-2,y-16,5,8,'#477a42');}
 if(e.warning>0){circle(c,x,y,19,'#e9c26445');text(c,'!',x,y-28,'#ffdf83',16)}
 capsule(c,x-12,y-24,24,4,'#28352f');capsule(c,x-12,y-24,24*e.hp/e.maxHp,4,'#e3b65d');
}
function plant(c,n,t){const x=n.x,y=n.y;if(n.claimed)return;
 circle(c,x,y+6,13,'#274a3677');circle(c,x,y,11,n.key==='target'?'#f3d27d':'#8ba87a');
 if(n.id==='mushroom'){rect(c,x-2,y-2,4,13,'#e8d3ad');circle(c,x,y-4,9,'#a75f56');circle(c,x-3,y-6,2,'#f7e4b7')}
 else if(n.id==='chili'){line(c,x-2,y+8,x+3,y-8,'#d85e37',7);line(c,x+3,y-8,x+7,y-11,'#376b38',3)}
 else if(n.id==='beef'||n.id==='chicken'){circle(c,x,y,9,'#b36656');circle(c,x-2,y-1,5,'#d99171')}
 else {circle(c,x-4,y,6,'#6c9862');circle(c,x+4,y-3,5,'#c3ba68');rect(c,x-1,y+1,3,9,'#6f553e')}
 if(n.key==='target'){c.strokeStyle='#ffe09c';c.lineWidth=2;c.beginPath();c.arc(x,y,16+Math.sin(t*3)*2,0,Math.PI*2);c.stroke()}
}
export function drawField(canvas,s,clock){const size=setCanvas(canvas);if(!size||!s.field?.action)return;const {c,w,h}=size,f=s.field;const sc=Math.min(w/9,h/11),left=(w-sc*9)/2,top=(h-sc*11)/2;
 c.fillStyle='#305a40';c.fillRect(0,0,w,h);c.save();c.translate(left,top);c.scale(sc,sc);
 rect(c,0,0,9,11,'#528659');for(let i=0;i<11;i++){rect(c,0,i,9,1,i%2?'#548459':'#4c7f56');}
 for(let k=0;k<45;k++){const x=((k*13+4)%87)/10,y=((k*17+3)%103)/10;circle(c,x,y,.04,'#98b67a66')}
 // clearing path and gradient forest edge
 c.fillStyle='#bbac7855';c.beginPath();c.ellipse(4.4,6.4,2.2,4.9,.05,0,Math.PI*2);c.fill();
 for(const o of f.obstacles){c.save();c.translate(o.x+.5,o.y+.5);c.scale(1/sc,1/sc);tree(c,0,0);c.restore()}
 for(const n of f.nodes){if(n.type==='event'&&!n.claimed){circle(c,n.x,n.y,.23,'#ecd597');rect(c,n.x-.11,n.y-.17,.23,.32,'#916b4b');text(c,'?',n.x,n.y-.04,'#4d3d28',.27)}else {c.save();c.translate(n.x,n.y);c.scale(1/sc,1/sc);plant(c,{...n,x:0,y:0},clock);c.restore()}}
 for(const p of f.projectiles||[]){circle(c,p.x,p.y,.12,'#ef9c4e');circle(c,p.x,p.y,.05,'#ffe5a3')}
 for(const e of f.enemies||[]){if(e.hp>0){c.save();c.translate(e.x,e.y);c.scale(1/sc,1/sc);monster(c,{...e,x:0,y:0},clock);c.restore()}}
 c.save();c.translate(f.pos.x,f.pos.y);c.scale(1/sc,1/sc);chef(c,0,Math.sin(clock*9)*1.5,clock);c.restore();
 if(f.harvestNode){const n=f.nodes.find(n=>n.key===f.harvestNode);if(n){capsule(c,n.x-.40,n.y-.49,.8,.10,'#304d39');capsule(c,n.x-.40,n.y-.49,.8*(f.harvestProgress/.82),.10,'#f3dd7e')}}
 c.restore();
 // bottom prompt is painted as part of the scene, not a scrolling paragraph.
 const txt=f.activeEvent?'调味师正在等待你的回答':f.actionMessageTTL>0?f.actionMessage:'靠近自动采集 · 接近怪物自动攻击';
 capsule(c,10,h-42,w-20,29,'#17382dcc','#9db27f');text(c,txt.slice(0,32),w/2,h-27,'#f3e9cd',11);
}
function guest(c,x,y,kind,time){const pal={regular:'#96b2c8',family:'#d19b80',adventurer:'#6f9b7d',critic:'#a68aac'}[kind]||'#d3b88a';circle(c,x,y+8,13,'#322b2766');rect(c,x-8,y-3,16,17,pal);circle(c,x,y-10,9,'#e8bb93');rect(c,x-8,y-20,16,6,kind==='critic'?'#67485c':'#70513c');rect(c,x-5,y-12,2,2,'#382d2a');rect(c,x+4,y-12,2,2,'#382d2a');rect(c,x-6,y+11,4,7,'#4f4a45');rect(c,x+2,y+11,4,7,'#4f4a45')}
function dish(c,x,y,kind){circle(c,x,y,12,'#f1e5c6');circle(c,x,y,9,'#9ba288');circle(c,x-3,y-1,4,kind==='POT'?'#ca9866':'#9a5438');circle(c,x+4,y-2,3,'#d3b76b');circle(c,x+1,y+4,3,'#719b55')}
export function drawDiner(canvas,s,clock){const size=setCanvas(canvas);if(!size)return;const {c,w,h}=size,v=s.service;
 rect(c,0,0,w,h,'#987856');for(let y=0;y<h;y+=24){rect(c,0,y,w,22,y%48===0?'#9b7956':'#987452');line(c,0,y,w,y,'#6f523e',1)}
 // restaurant wall, kitchen and counter
 rect(c,0,0,w,h*.21,'#536f58');rect(c,w*.09,15,w*.32,26,'#c9a16c');text(c,'ODDPOT',w*.25,28,'#493928',13);rect(c,w*.76,7,w*.14,45,'#315d62');rect(c,w*.79,7,w*.02,45,'#b7d2ba');
 for(const [i,x] of [[0,w*.20],[1,w*.80]]){
  rect(c,x-43,h*.24-17,86,64,'#654b35');rect(c,x-39,h*.24-13,78,56,'#aa7950');
  circle(c,x,h*.24,24,i?'#7796a1':'#576f71');circle(c,x,h*.24,17,i?'#3c474d':'#3a4144');
  const busy=v?.stations[i?'POT':'WOK'];if(busy){for(let n=0;n<3;n++){circle(c,x-14+n*14,h*.24-22+Math.sin(clock*3+n)*3,4,'#f3e0b588')}text(c,`${Math.max(0,Math.ceil(busy.left))}s`,x,h*.24+35,'#fff5d5',11)}
 }
 rect(c,w*.12,h*.43,w*.76,17,'#6f4d33');rect(c,w*.12,h*.43,w*.76,7,'#d3a66d');
 // A tiny kitchen crew animates independently of the invoice/queue update.
 chef(c,w*.5+Math.sin(clock*1.8)*5,h*.35+Math.sin(clock*3)*2,clock);
 for(const evt of (v?.events||[]).filter(e=>e.type==='served'&&v.time-e.t<=3)){
  const order=v.orders.find(o=>o.id===evt.order);if(!order||order.tableId==null)continue;
  const elapsed=(v.time-evt.t)+(clock%1),r=Math.min(1,elapsed/1.7),endX=order.tableId?w*.75:w*.25;
  if(r<1) dish(c,w*.5+(endX-w*.5)*r,h*.45+(h*.65-h*.45)*r,'WOK');
 }
 for(let i=0;i<2;i++){
  const x=i?w*.75:w*.25,y=h*.65;
  circle(c,x,y+8,52,'#5b392b88');circle(c,x,y,46,'#674936');circle(c,x,y-5,41,'#c0905d');
  const o=v?.orders.find(o=>o.tableId===i&&['queued','cooking'].includes(o.status));
  const recent=!o&&v?.orders.find(o=>o.tableId===i&&o.status==='served'&&v.time-o.served<=6);
  if(o||recent){const g=o||recent;
   const events=v?.events?.filter(e=>e.order===g.id&&e.type==='arrived')||[];const at=events[0]?.t??v?.time??0;
   const appear=Math.max(0,Math.min(1,((v?.time??0)-at+(clock%1))/.9));
   const gy=h*.84-(h*.84-(y-51))*appear+Math.sin(clock*3+i)*1.5;
   guest(c,x,gy,g.segment,clock);
   if(o){const r=RECIPES[o.recipeId];text(c,r?.name?.slice(0,6)||'点餐',x,y+12,'#fff2cc',11);}
   if(recent){dish(c,x,y,'WOK');text(c,'好吃!',x,y-78,'#f8e1a4',12)}
  }
 }
 rect(c,w*.45,h*.87,w*.1,h*.11,'#b98b62');rect(c,w*.47,h*.87,w*.06,h*.07,'#2b473a');
 for(const [x,y] of [[w*.12,h*.83],[w*.88,h*.82]]){rect(c,x-4,y+5,8,15,'#795436');circle(c,x,y,11,'#5d975d')}
}
import {pixelActor,pixelEnemy,pixelImpact} from './pixels_v041.js?v=0.5.5';
// Lightweight procedural game graphics: original Canvas shapes, no art pack.
import {ING,RECIPES,CUSTOMERS} from './data.js?v=0.5.5';
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
// Countdown lives next to each customer instead of consuming a table-width HUD strip.
// Derived from the same service clock and patience values used for order resolution.
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
// Physical restaurant set. World units are scaled together, including ALL actors.
// Actor size, seat locations, chef throw, and waiter walk are a single visual contract.
export const DINER_ACTOR_SCALE=1.13;
export function seatLocation(table,seat,w,h){
 const tx=w*(table===0?.28:.72),ty=h*.60;
 return {x:tx+(seat===0?-33:33),y:ty-51};
}
export function plateFlight(simTime,servedAt,duration=1.12){
 const age=simTime-servedAt;
 return {progress:Math.max(0,Math.min(1,age/duration)),flying:age>=0&&age<duration,landed:age>=duration};
}
function lerp(a,b,t){return a+(b-a)*t}
function smooth(t){const p=Math.max(0,Math.min(1,t));return p*p*(3-2*p)}
// Deliberate lanes: entry -> center aisle -> outside table -> chair.
// Guests traverse this route in reverse when leaving, never crossing a table.
export function guestPathPoints(order,w,h){
 const seat=seatLocation(order.tableId,order.seatId??0,w,h);
 const side=(order.seatId??0)===0?-1:1;
 const flank={x:seat.x+side*29,y:seat.y};
 const lower={x:flank.x,y:h*.735};
 return [{x:w*.5,y:h*.94},{x:w*.5,y:h*.735},lower,flank,seat];
}
function routePoint(points,p){
 const t=Math.max(0,Math.min(.999999,p))*(points.length-1),i=Math.floor(t);
 return {x:lerp(points[i].x,points[i+1].x,smooth(t-i)),y:lerp(points[i].y,points[i+1].y,smooth(t-i))};
}
export function guestStagePosition(order,simTime,w,h){
 const points=guestPathPoints(order,w,h),age=simTime-(order.doorAt??order.arrival);
 const leaving=order.status==='served'&&order.served!==null&&simTime-(order.reviewedAt??order.served)>=.65
  ||(['left','rejected'].includes(order.status)&&Number.isFinite(order.leftAt));
 if(leaving){const elapsed=order.status==='served'?simTime-(order.reviewedAt??order.served)-.65:simTime-order.leftAt;
  const progress=Math.max(0,Math.min(1,elapsed/(order.status==='served'?1.55:2.5)));
  return {...routePoint(points,1-progress),moving:progress<1,visible:progress<1};}
 if(age<0)return {...points[0],moving:false,visible:false};
 const progress=Math.max(0,Math.min(1,age/2));
 return {...routePoint(points,progress),moving:progress<1,visible:true};
}
// Review bubbles are driven by deterministic quality/fit/wait values from
// the simulation, not random decorative phrases.
export function guestSceneBubble(order,t){
 if(order.status==='ordering')return {text:'我看看菜单…',kind:'choice'};
 if(['queued','cooking'].includes(order.status))return {text:RECIPES[order.recipeId]?.name||'点单中',kind:'order'};
 if(order.status==='eating')return {text:'',kind:'eating'};
 if(order.status==='review'||(order.status==='served'&&t-(order.reviewedAt??0)<.9))return {text:order.reviewText||'谢谢招待！',kind:order.reviewType||'happy'};
 return null;
}
// Dialogue follows the actual head position. Plan ALL currently visible guest
// bubbles together so a two-seat table never layers one text card over another.
// Only this renderer owns their offsets; no arbitrary seat-specific -28px shift.
export function dinerBubbleSize(words,kind){
 const characters=Array.from(words||'').slice(0,16);
 const lines=characters.length>8?[characters.slice(0,8).join(''),characters.slice(8).join('')]:[characters.join('')];
 const fontSize=kind==='order'?11:10.5;
 const width=Math.min(135,Math.max(62,Math.ceil(Math.max(...lines.map(x=>x.length))*fontSize+20)));
 return {width,height:lines.length>1?39:25,lines,fontSize};
}
export function dinerBubbleLayout(orders,t,w,h){
 const padding=8,placed=[];
 // Sit-down seats get fixed positions, but the speech follows a moving guest
 // on the approach/exit. Keep ordering deterministic for screenshot stability.
 let actors=(orders||[]).map(order=>{
  const bubble=guestSceneBubble(order,t),pos=guestStagePosition(order,t,w,h);
  if(!bubble?.text||!pos.visible)return null;
  const size=dinerBubbleSize(bubble.text,bubble.kind);
  return {id:order.id,tableId:order.tableId,seatId:order.seatId,kind:bubble.kind,words:bubble.text,
   anchorX:pos.x,anchorY:pos.y-22,...size};
 }).filter(Boolean);
 // Low-value menu musing yields to actual dish requests and post-meal reviews.
 // Two diners can still chat together; crowded tables don't make four loud cards.
 const important=actors.filter(a=>a.kind!=='choice');
 if(actors.length>2)actors=[...important,...actors.filter(a=>a.kind==='choice').slice(0,Math.max(0,2-important.length))];
 actors.sort((a,b)=>a.anchorY-b.anchorY||Math.min(a.anchorX,w-a.anchorX)-Math.min(b.anchorX,w-b.anchorX)||a.anchorX-b.anchorX||String(a.id).localeCompare(String(b.id)));
 for(const item of actors){
  const side=item.seatId===0?-1:1;
  const xOffsets=[side*26,0,side*49,-side*18,side*65,-side*42];
  const upOffsets=[0,7,22,39,55,72,90,110];
  let best=null;
  for(const up of upOffsets){
   for(const dx of xOffsets){
    const x=Math.max(padding,Math.min(w-padding-item.width,item.anchorX+dx-item.width/2));
    const y=Math.max(padding,Math.min(h-padding-item.height,item.anchorY-6-up-item.height));
    const overlap=placed.reduce((sum,p)=>{
      const ix=Math.max(0,Math.min(x+item.width,p.x+p.width+5)-Math.max(x,p.x-5));
      const iy=Math.max(0,Math.min(y+item.height,p.y+p.height+5)-Math.max(y,p.y-5));
      return sum+ix*iy;
    },0);
    const displacement=Math.abs((x+item.width/2)-item.anchorX);
    const penalty=overlap*10000+up*.8+displacement*.20+Math.abs(dx-side*26)*.55;
    if(best===null||penalty<best.penalty)best={x,y,penalty};
   }
  }
  placed.push({...item,x:best.x,y:best.y});
 }
 return placed;
}
function drawReviewBubble(c,item){
 const {x,y,width,height,lines,fontSize,kind,anchorX,anchorY}=item;
 const positive=['delicious','happy','choice'].includes(kind),negative=['bad','quality','late','taste'].includes(kind);
 const bg=negative?'#ffe1d3':positive?'#e5f3d1':'#f6e8c7';
 const stroke=negative?'#b77363':'#7f8b68';
 capsule(c,x,y,width,height,bg,stroke);
 for(let i=0;i<lines.length;i++)text(c,lines[i],x+width/2,y+(lines.length===1?height/2:12+i*16),negative?'#703c32':'#394636',fontSize);
 // Connector starts inside the bubble border and ends just above the head.
 const baseX=Math.max(x+12,Math.min(x+width-12,anchorX));
 c.fillStyle=bg;c.beginPath();c.moveTo(baseX-3,y+height-1);c.lineTo(baseX+3,y+height-1);
 c.lineTo(anchorX,Math.max(y+height+1,anchorY-1));c.closePath();c.fill();
 c.strokeStyle=stroke;c.lineWidth=1;c.beginPath();c.moveTo(baseX-3,y+height);c.lineTo(anchorX,Math.max(y+height+1,anchorY-1));c.stroke();
}
function walkGuest(c,order,v,t,w,h){
 const pos=guestStagePosition(order,t,w,h);if(!pos.visible)return;
 const eating=order.status==='eating',review=order.status==='review';
 const bob=eating?Math.sin((t-(order.landedAt||t))*6)*1.3:review?Math.sin(t*3)*.5:0;
 pixelActor(c,order.segment,pos.x,pos.y+bob,DINER_ACTOR_SCALE,{walk:pos.moving?t:0});
 const bubble=guestSceneBubble(order,t);
 if(bubble?.kind==='eating')line(c,pos.x-8,pos.y-23,pos.x-4,pos.y-32,'#f3e8bc',2);
 if(['queued','cooking'].includes(order.status))waitingRing(c,pos.x+19,pos.y-14,guestWaitRatio(t,order.arrival,order.patience));
}
// Every shift begins and ends at the service station. Queue interactions
// rather than retarget a moving actor when another guest arrives.
export function waiterJobs(v){
 const events=(v?.events||[]).filter(e=>['seated','ordered','served'].includes(e.type));
 let end=0;
 return events.map(e=>{
  const start=Math.max(e.t,end),duration=e.type==='ordered'?3.4:3.8;
  end=start+duration;
  return {start,end,type:e.type,table:e.table??v.orders?.find(o=>o.id===e.order)?.tableId??0};
 });
}
export function waiterStagePosition(v,t,w,h){
 const home={x:w*.5,y:h*.79};
 const job=waiterJobs(v).find(j=>t>=j.start&&t<j.end);
 if(!job)return {...home,moving:false};
 const a=(t-job.start)/(job.end-job.start);
 const p=a<.43?smooth(a/.43):a>.63?1-smooth((a-.63)/.37):1;
 const side=job.table===0?-1:1;
 const target={x:home.x+side*w*.10,y:h*.718};
 return {x:lerp(home.x,target.x,p),y:lerp(home.y,target.y,p),moving:p>.01&&p<.99,action:job.type};
}
function paintDinerStaff(c,s,v,t,w,h){
 const staff=v?.crew||s.crew||{};
 const jobs=v?.stations||{};
 const recentThrow=(v?.events||[]).slice().reverse().find(e=>e.type==='throw'&&plateFlight(t,e.t,2).flying);
 for(let i=0;i<2;i++){
  const x=w*(i===0?.21:.79),active=!!jobs[i===0?'WOK':'POT'];
  if(staff.helper?.hired&&staff.helper.station===i){
   pixelActor(c,'helper',x+(i===0?35:-35),h*.345,DINER_ACTOR_SCALE,{walk:active?t:0,attack:active});
  }
 }
 // A deterministic, home-anchored patrol prevents the waiter teleporting
 // between guests and keeps them outside the chair collision zone.
 if(staff.waiter?.hired){
  const pos=waiterStagePosition(v,t,w,h);
  pixelActor(c,'waiter',pos.x,pos.y,DINER_ACTOR_SCALE,{walk:pos.moving?t:0});
 }
 // Chef remains the same scale as all staff and guests. Throw animation
 // belongs to a specific serve event, never a looping idle gesture.
 pixelActor(c,'chef',w*.5,h*.34,DINER_ACTOR_SCALE,{attack:!!recentThrow,walk:jobs.WOK||jobs.POT?t:0});
}
export function drawDiner(canvas,s,clock,simTime=s.service?.time??clock){
 const size=setCanvas(canvas);if(!size)return;
 const {c,w,h}=size,v=s.service,t=v?simTime:clock;
 rect(c,0,0,w,h,'#66523e');
 for(let y=0;y<h;y+=24){rect(c,0,y,w,22,y%48===0?'#765d46':'#71563f');line(c,0,y,w,y,'#674b34',1)}
 // A little wider than v0.5B, but without stretching character proportions.
 c.save();c.translate(w*.095,h*.075);c.scale(.81,.82);
 rect(c,0,0,w,h*.20,'#4c7158');rect(c,w*.1,14,w*.31,26,'#d0a56b');text(c,'ODDPOT',w*.25,28,'#48382a',13);
 rect(c,w*.77,7,w*.13,43,'#346064');rect(c,w*.80,7,w*.018,43,'#c9dac6');
 for(let i=0;i<2;i++){
  const x=w*(i===0?.21:.79),slot=s.kitchen?.slots?.[i],isPot=(slot?.type||(i?'POT':'WOK'))==='POT';
  rect(c,x-45,h*.24-16,90,62,'#694c33');rect(c,x-40,h*.24-11,80,52,'#b58457');
  circle(c,x,h*.24,24,isPot?'#7296a0':'#576d69');circle(c,x,h*.24,17,'#3b4545');
  if(isPot)rect(c,x-25,h*.24-4,50,6,'#8eabb0');else line(c,x-21,h*.24,x-41,h*.24-10,'#ddbc81',5);
  if(slot?.level===2){circle(c,x+26,h*.24-23,8,'#f2d584');text(c,'Ⅱ',x+26,h*.24-23,'#564627',10)}
  const busy=v?.stations[i===0?'WOK':'POT'];if(busy){for(let j=0;j<3;j++)circle(c,x-15+j*14,h*.24-23+Math.sin(t*2+j)*2.4,4,'#f3e1bd99');
   text(c,`${Math.max(0,Math.ceil(busy.left))}s`,x,h*.24+37,'#fff4ce',12)}
 }
 // Cooking steam and gentle work motions remain tied to the simulation clock.
 for(const [idx,station] of ['WOK','POT'].entries()){if(!v?.stations[station])continue;const xx=w*(idx===0?.21:.79);circle(c,xx+Math.sin(t*.65+idx)*5,h*.20-20,3,'#eed9b55c');}
 rect(c,w*.14,h*.43,w*.72,17,'#6b4930');rect(c,w*.14,h*.43,w*.72,7,'#d7a96d');
 // Two real chairs per table, with reserved physical positions.
 for(let i=0;i<2;i++){
  const x=w*(i===0?.28:.72),y=h*.60;
  for(let seat=0;seat<2;seat++){const pos=seatLocation(i,seat,w,h);
   rect(c,pos.x-13,pos.y+16,26,14,'#684931');rect(c,pos.x-10,pos.y+18,20,9,'#b68a62');}
  circle(c,x,y+9,49,'#4b3526a8');circle(c,x,y,43,'#654a35');circle(c,x,y-5,38,'#c08b5a');
 }
 // Serving is one transaction but a visible plate enters only after landing.
 const serveEvents=(v?.events||[]).filter(e=>e.type==='throw');
 for(const e of serveEvents){const o=v.orders.find(order=>order.id===e.order);if(!o||o.tableId==null)continue;
  const progress=plateFlight(t,e.t,2);if(t-e.t>8)continue;
  const center=w*(o.tableId===0?.28:.72),tx=center+(o.seatId===0?-13:13),ty=h*.60-9;
  if(progress.flying){
    const p=smooth(progress.progress),sx=w*.5,sy=h*.42;
    const x=lerp(sx,tx,p),y=lerp(sy,ty,p)-35*4*p*(1-p);
    circle(c,x-12*p,y+10,3,'#f5e9c17a');dish(c,x,y,RECIPES[o.recipeId]?.station||'WOK');
  }else if(progress.landed&&(['eating','review'].includes(o.status)||(o.status==='served'&&t-(o.reviewedAt??o.served)<1.5))){dish(c,tx,ty,RECIPES[o.recipeId]?.station||'WOK');}
 }
 // Characters are drawn in separate chair slots after table/plate geometry.
 if(v){const occupants=v.orders.filter(o=>o.tableId!=null&&(
   ['entering','ordering','queued','cooking','flying','eating','review'].includes(o.status)||(o.status==='served'&&t-(o.reviewedAt??o.served)<2.2)||(['left','rejected'].includes(o.status)&&Number.isFinite(o.leftAt)&&t-o.leftAt<2.5)));
  for(const o of occupants)walkGuest(c,o,v,t,w,h);
  paintDinerStaff(c,s,v,t,w,h);
  for(const bubble of dinerBubbleLayout(occupants,t,w,h))drawReviewBubble(c,bubble);
 }else paintDinerStaff(c,s,v,t,w,h);
 rect(c,w*.45,h*.87,w*.1,h*.11,'#b98b62');rect(c,w*.47,h*.87,w*.06,h*.07,'#2b473a');
 for(const [x,y] of [[w*.12,h*.83],[w*.88,h*.82]]){rect(c,x-4,y+5,8,15,'#795436');circle(c,x,y,11,'#5d975d')}
 c.restore();
}
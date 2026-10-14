// E.2: continuous Canvas effects. Every function is presentation-only and
// reads existing simulation snapshots. No clocks, randomness or reward writes.
const fieldFxClamp=n=>Math.max(0,Math.min(1,n));
const fieldFxEllipse=(c,x,y,rx,ry,fill)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();};
const fieldFxRing=(c,x,y,r,color,width)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.strokeStyle=color;c.lineWidth=width;c.stroke();};
export function drawFieldImpact(c,x,y,remaining,radius=.30,color='#fff0c1'){
 const q=fieldFxClamp(remaining),p=1-q;if(q<=0)return;
 c.save();c.translate(x,y);c.globalAlpha=q;c.lineCap='round';
 fieldFxRing(c,0,0,radius*(.28+p*.75),color,radius*.075);
 c.strokeStyle=color;c.lineWidth=radius*.10;
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5+.35;
  c.beginPath();c.moveTo(Math.cos(a)*radius*.34,Math.sin(a)*radius*.34);
  c.quadraticCurveTo(Math.cos(a+.08)*radius*.7,Math.sin(a+.08)*radius*.7,Math.cos(a)*radius*(.7+p*.4),Math.sin(a)*radius*(.7+p*.4));c.stroke();
 }
 c.restore();
}
export function drawFieldProjectile(c,p,type='enemy'){
 c.save();c.lineCap='round';
 if(type==='player'){
  const t=fieldFxClamp(p.time/Math.max(.001,p.duration)),arc=Math.sin(Math.PI*t)*.37;
  if(p.empowered){
   c.save();c.globalAlpha=.5+.35*t;fieldFxRing(c,p.targetX,p.targetY,p.radius*(.8+.2*t),'#d3f3dc',.035);
   fieldFxRing(c,p.x,p.y-arc,.24,'#e2f7c7',.055);c.restore();
  }
  fieldFxEllipse(c,p.x,p.y,.14,.065,'#304d3c33');
  const d=Math.hypot(p.targetX-p.fromX,p.targetY-p.fromY)||1;
  c.strokeStyle=p.empowered?'#d8f4caaa':'#e3c99c77';c.lineWidth=p.empowered?.12:.08;c.beginPath();
  c.moveTo(p.x-(p.targetX-p.fromX)/d*.21,p.y-arc-(p.targetY-p.fromY)/d*.21);c.lineTo(p.x,p.y-arc);c.stroke();
  if(p.empowered){c.translate(p.x,p.y-arc);c.scale(1.18,1.18);c.translate(-p.x,-p.y+arc);}
  fieldFxEllipse(c,p.x,p.y-arc,.15,.17,'#bb874e');
  fieldFxEllipse(c,p.x-.03,p.y-arc-.025,.105,.13,'#e6c48a');
  fieldFxEllipse(c,p.x-.05,p.y-arc-.065,.032,.06,'#fff0c4');
  c.strokeStyle='#88a877';c.lineWidth=.045;c.beginPath();c.moveTo(p.x,p.y-arc-.14);c.quadraticCurveTo(p.x+.02,p.y-arc-.23,p.x+.10,p.y-arc-.20);c.stroke();
 }else{
  const spore=p.source==='spore',a=Math.atan2(p.vy||0,p.vx||1);
  c.translate(p.x,p.y);c.rotate(a);
  c.strokeStyle=spore?'#8abbc577':'#e9976877';c.lineWidth=.09;c.beginPath();c.moveTo(-.27,0);c.quadraticCurveTo(-.16,-.03,0,0);c.stroke();
  fieldFxEllipse(c,0,0,.14,spore?.14:.10,spore?'#90c7c3':'#efad70');
  fieldFxEllipse(c,.025,-.018,.065,.055,spore?'#daf2da':'#fff0b9');
 }
 c.restore();
}
export function drawFieldSwipe(c,f){
 const fx=f.attackFx;if(!(fx?.ttl>0)||fx.pot)return;
 const p=fieldFxClamp(1-fx.ttl/fx.duration),a=Math.atan2(fx.dy,fx.dx),fade=(1-p)**1.5;
 c.save();c.translate(fx.x??f.pos.x,fx.y??f.pos.y);c.rotate(a);c.globalAlpha=fade;c.lineCap='round';
 // Contact is immediate in the simulation: the bright edge crosses the front
 // on frame zero, then sweeps outwards and thins into recovery.
 for(const [r,w,color] of [[.80,.16,'#cb996c'],[1.03,.11,'#f8dc9e'],[1.17,.035,'#fff8dc']]){
  c.beginPath();c.arc(0,0,r,-.78+p*.7,.78+p*.7);c.strokeStyle=color;c.lineWidth=w*(1-p*.6);c.stroke();
 }
 c.restore();
}
export function drawFieldSkillWave(c,f){
 if(!(f.skillFx>0))return;
 const q=fieldFxClamp(f.skillFx/.42),p=1-q,o=f.skillOrigin||f.pos,pot=o.type==='POT'||!o.type&&f.weapon?.type==='POT';
 c.save();c.globalAlpha=q;c.lineCap='round';
 if(pot){
  // Cast pressure hugs the caster. The damaging blast is at the landing point.
  fieldFxRing(c,o.x,o.y,.20+p*.40,'#cde8ca',.05*q);
  for(let i=0;i<3;i++){
   const x=o.x+(i-1)*.15,y=o.y-.12-p*.48;
   c.beginPath();c.moveTo(x,y+.20);c.quadraticCurveTo(x-.10,y+.08,x+.04,y-.08);c.strokeStyle='#e4f4d6';c.lineWidth=.055*q;c.stroke();
  }
 }else{
  const radius=.25+Math.min(1,p*2.7)*1.6;
  fieldFxRing(c,o.x,o.y,radius,'#edc37f',.12*q);
  fieldFxRing(c,o.x,o.y,Math.max(.1,radius-.12),'#fff2c5',.045*q);
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4;c.beginPath();c.moveTo(o.x+Math.cos(a)*radius*.82,o.y+Math.sin(a)*radius*.82);
   c.lineTo(o.x+Math.cos(a)*radius,o.y+Math.sin(a)*radius);c.strokeStyle='#fff0c1';c.lineWidth=.035*q;c.stroke();
  }
 }
 c.restore();
}
export function drawFieldHitEffects(c,f){
 for(const fx of f.impactFx||[]){
  const q=fieldFxClamp(fx.ttl/fx.duration),p=1-q;
  c.save();c.translate(fx.x,fx.y);c.globalAlpha=q;c.lineCap='round';
  if(fx.kind==='contact'){
   const a=Math.atan2(fx.dy,fx.dx),size=fx.strong?.53:.34;
   c.translate(-fx.dx*.13,-.12-fx.dy*.13);c.rotate(a);
   fieldFxEllipse(c,0,0,.08*q,.20*q,fx.color);
   c.strokeStyle=fx.color;c.lineWidth=.06*q;
   for(let i=0;i<5;i++){
    const theta=-1.25+i*.625,r=size*(.35+p);
    c.beginPath();c.moveTo(Math.cos(theta)*r*.35,Math.sin(theta)*r*.35);
    c.lineTo(Math.cos(theta)*r,Math.sin(theta)*r);c.stroke();
   }
   if(fx.kill)fieldFxRing(c,0,0,.14+p*.36,'#ffe7a5',.045*q);
  }else{
   const r=fx.radius,expand=Math.min(1,p*3),color=fx.strong?'#d6f3d9':'#eee3bc';
   fieldFxEllipse(c,0,0,r*expand,r*.36*expand,fx.strong?'#afd9bf44':'#e7d5a433');
   fieldFxRing(c,0,-.07,r*expand,color,.08*q);
   if(fx.strong)fieldFxRing(c,0,-.07,r*Math.max(0,p-.09)*1.45,'#f3f8cf',.045*q);
   for(let i=0;i<(fx.strong?8:5);i++){
    const a=i*Math.PI*2/(fx.strong?8:5),x=Math.cos(a)*r*p*.8,y=Math.sin(a)*r*p*.35-p*.42;
    c.beginPath();c.moveTo(x,y+.13*q);c.quadraticCurveTo(x-.10*q,y-.05,x+.02,y-.21*q);c.strokeStyle=color;c.lineWidth=(fx.strong?.10:.065)*q;c.stroke();
   }
   if(p<.22)fieldFxEllipse(c,0,-.1,r*.32*(1-p/.22),r*.20*(1-p/.22),'#fff7d7');
  }
  c.restore();
 }
}
export function drawFieldBurst(c,fx){
 const q=fieldFxClamp(fx.ttl/.5),p=1-q;
 c.save();c.globalAlpha=q;fieldFxRing(c,fx.x,fx.y,.12+p*.5,'#e8d49f',.065);
 for(let i=0;i<6;i++){const a=i*Math.PI/3+.2,r=.12+p*.47;
  fieldFxEllipse(c,fx.x+Math.cos(a)*r,fx.y+Math.sin(a)*r,.035,.065,'#f2e1b3');}
 c.restore();
}
export function drawFieldCollection(c,fx){
 const q=fieldFxClamp(fx.ttl/.76),p=1-q;
 c.save();c.globalAlpha=q*.65;fieldFxRing(c,fx.x,fx.y+.08,.18+p*.3,'#dce5ba',.045);c.restore();
}
export function drawFieldDeath(c,e){
 if(!(e.hp<=0&&e.deathFx>0))return;
 const q=fieldFxClamp(e.deathFx/.45),p=1-q;
 c.save();c.globalAlpha=q*.5;
 for(let i=0;i<3;i++){const a=i*2.1+e.x;
  fieldFxEllipse(c,e.x+Math.cos(a)*(.12+p*.3),e.y-.10-p*.4+Math.sin(a)*.1,.035,.055,'#e4d8b4');}
 c.restore();
}
// Indicators use screen pixels, so they do not shrink when the map expands.
export function drawFieldActorIndicators(c,e,sc){
 if(e.hp<=0)return;
 c.save();c.translate(e.x,e.y);c.scale(1/sc,1/sc);
 const barW=e.isBoss?52:24,barY=e.isBoss?-54:-25;
 c.beginPath();c.roundRect(-barW/2,barY,barW,4,2);c.fillStyle='#2f423bbb';c.fill();
 const width=(barW-2)*fieldFxClamp(e.hp/Math.max(1,e.maxHp));
 if(width>0){c.beginPath();c.roundRect(-barW/2+1,barY+1,width,2,Math.min(1,width/2));c.fillStyle='#e9cd91';c.fill();}
 if(e.warning>0){
  const q=fieldFxClamp(1-e.warning/(e.windupTotal||.7));
  c.beginPath();c.arc(0,barY-9,4,-Math.PI/2,-Math.PI/2+q*Math.PI*2);c.strokeStyle='#f4d9a1';c.lineWidth=1.8;c.stroke();
 }
 c.restore();
}
export function drawFieldNodeMarkers(c,n,time,screenScale=40){
 if(n.claimed)return;
 c.save();c.lineCap='round';
 if(n.type==='event'){
  c.translate(n.x,n.y);c.scale(1/screenScale,1/screenScale);
  c.globalAlpha=.86+.08*Math.sin(time*2);c.strokeStyle='#fff0c6';c.lineWidth=2.6;
  c.beginPath();c.moveTo(0,-39);c.lineTo(0,-32);c.stroke();
  fieldFxEllipse(c,0,-28,1.4,1.4,'#fff0c6');
 }else if(n.key==='target'){
  const bob=Math.sin(time*3+n.x)*.028;
  c.strokeStyle='#f9e6b0';c.lineWidth=.042;
  for(const [x,y,a] of [[n.x-.31,n.y-.43+bob,Math.PI],[n.x+.31,n.y-.43+bob,-Math.PI/2],[n.x+.31,n.y+.11+bob,0],[n.x-.31,n.y+.11+bob,Math.PI/2]]){
   c.beginPath();c.arc(x,y,.12,a,a+Math.PI/2);c.stroke();}
 }
 c.restore();
}

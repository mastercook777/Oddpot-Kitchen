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
  fieldFxEllipse(c,p.x,p.y,.14,.065,'#304d3c33');
  const d=Math.hypot(p.targetX-p.fromX,p.targetY-p.fromY)||1;
  c.strokeStyle='#e3c99c77';c.lineWidth=.08;c.beginPath();
  c.moveTo(p.x-(p.targetX-p.fromX)/d*.21,p.y-arc-(p.targetY-p.fromY)/d*.21);c.lineTo(p.x,p.y-arc);c.stroke();
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
 const p=fieldFxClamp(1-fx.ttl/fx.duration),a=Math.atan2(fx.dy,fx.dx);
 c.save();c.translate(f.pos.x,f.pos.y);c.rotate(a);c.globalAlpha=fieldFxClamp(fx.ttl/.2);c.lineCap='round';
 for(const [r,w,color] of [[.86,.12,'#e9c087'],[1.03,.05,'#fff0c4']]){
  c.beginPath();c.arc(0,0,r,-.9+p*.65,.45+p*.65);c.strokeStyle=color;c.lineWidth=w;c.stroke();
 }
 c.restore();
}
export function drawFieldSkillWave(c,f){
 if(!(f.skillFx>0))return;
 const q=fieldFxClamp(f.skillFx/.42),p=1-q;
 c.save();c.globalAlpha=q;fieldFxRing(c,f.pos.x,f.pos.y,.38+p*1.25,f.weapon?.type==='POT'?'#d3e8c4':'#f1d59d',.075);c.restore();
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
 c.beginPath();c.roundRect(-12,-25,24,4,2);c.fillStyle='#2f423bbb';c.fill();
 const width=22*fieldFxClamp(e.hp/Math.max(1,e.maxHp));
 if(width>0){c.beginPath();c.roundRect(-11,-24,width,2,Math.min(1,width/2));c.fillStyle='#e9cd91';c.fill();}
 if(e.warning>0){
  const q=fieldFxClamp(1-e.warning/(e.windupTotal||.7));
  c.beginPath();c.arc(0,-34,4,-Math.PI/2,-Math.PI/2+q*Math.PI*2);c.strokeStyle='#f4d9a1';c.lineWidth=1.8;c.stroke();
 }
 c.restore();
}
export function drawFieldNodeMarkers(c,n,time){
 if(n.claimed)return;
 c.save();c.lineCap='round';
 if(n.type==='event'){
  c.translate(n.x+.33,n.y-.88);c.globalAlpha=.75+.15*Math.sin(time*2);
  c.lineWidth=.035;c.strokeStyle='#f0dab0';
  for(let i=0;i<4;i++){const a=i*Math.PI/2;
   c.beginPath();c.moveTo(Math.cos(a)*.04,Math.sin(a)*.04);c.quadraticCurveTo(Math.cos(a)*.08,Math.sin(a)*.08,Math.cos(a)*.14,Math.sin(a)*.14);c.stroke();}
 }else if(n.key==='target'){
  const bob=Math.sin(time*3+n.x)*.028;
  c.strokeStyle='#f9e6b0';c.lineWidth=.042;
  for(const [x,y,a] of [[n.x-.31,n.y-.43+bob,Math.PI],[n.x+.31,n.y-.43+bob,-Math.PI/2],[n.x+.31,n.y+.11+bob,0],[n.x-.31,n.y+.11+bob,Math.PI/2]]){
   c.beginPath();c.arc(x,y,.12,a,a+Math.PI/2);c.stroke();}
 }
 c.restore();
}

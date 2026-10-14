// G: readable mini-boss patterns and pixel bodies. Damage/drops stay owned
// by field_v04. Callbacks use its real collision and damage protections.
export const MINI_BOSS_PATTERNS=Object.freeze({
 boss_spore:[{kind:'fan',windup:.85},{kind:'burst',windup:1.0},{kind:'ring',windup:1.05}],
 boss_ember:[{kind:'fan',windup:.85},{kind:'charge',windup:.95},{kind:'burst',windup:1.0}]
});
export function bossChargeEnd(f,origin,aim,blocked){
 const dx=aim.x-origin.x,dy=aim.y-origin.y,d=Math.hypot(dx,dy)||1,max=Math.min(2.4,d+.35);let end={...origin};
 for(let n=.08;n<=max;n+=.08){const p={x:origin.x+dx/d*n,y:origin.y+dy/d*n};if(blocked(f,p,.18))break;end=p;}
 return end;
}
export function stepMiniBoss(f,e,dt,{blocked,hurt}){
 if(e.hp<=0){e.rush=null;e.bossAttack=null;return;}
 if(e.rush){
  const rush=e.rush,dx=rush.end.x-e.x,dy=rush.end.y-e.y,d=Math.hypot(dx,dy),step=Math.min(d,4*dt);
  if(d>.02){const next={x:e.x+dx/d*step,y:e.y+dy/d*step};
   if(!blocked(f,next,.18)){e.x=next.x;e.y=next.y;}else {e.rush=null;e.bossAttack=null;}
   if(Math.hypot(f.pos.x-e.x,f.pos.y-e.y)<.60&&!f.finished)hurt(1,'enemy',e);
  }
  if(d<=step+.02){e.rush=null;e.bossAttack=null;}
  return;
 }
 if(e.warning>0){
  // Old saves already inside a legacy warning finish the old fan once.
  e.bossAttack??={kind:'fan',windup:e.windupTotal||.85,origin:{x:e.x,y:e.y},aim:{...(e.aim||f.pos)}};
  e.warning=Math.max(0,e.warning-dt);if(e.warning>0)return;
  const a=e.bossAttack,angle=Math.atan2(a.aim.y-a.origin.y,a.aim.x-a.origin.x),spore=e.kind==='boss_spore';
  const fire=(theta,speed)=>f.projectiles.push({x:e.x,y:e.y,vx:Math.cos(theta)*speed,vy:Math.sin(theta)*speed,ownerX:e.x,ownerY:e.y,ownerId:e.id,life:3,source:spore?'spore':'pepper'});
  if(a.kind==='fan')for(const offset of spore?[-.55,0,.55]:[-.27,0,.27])fire(angle+offset,spore?1.9:3.1);
  else if(a.kind==='ring')for(let i=1;i<8;i++)fire(angle+i*Math.PI/4,1.7);
  else if(a.kind==='burst'){
   f.bossZones??=[];f.bossZones.push({ownerId:e.id,x:a.aim.x,y:a.aim.y,radius:.8,life:.25,source:spore?'spore':'pepper'});
  }else if(a.kind==='charge')e.rush={end:{...a.end},origin:{...a.origin}};
  e.cooldown=2.2;e.bossAttack=e.rush?a:null;return;
 }
 const dx=f.pos.x-e.x,dy=f.pos.y-e.y,d=Math.hypot(dx,dy);
 if(d<3.6&&d>.85){const speed=.47*(e.slowTime>0?.45:1),next={x:e.x+dx/d*speed*dt,y:e.y+dy/d*speed*dt};if(!blocked(f,next,.18)){e.x=next.x;e.y=next.y;}}
 if(d>=4||e.cooldown>0)return;
 const pattern=MINI_BOSS_PATTERNS[e.kind]||MINI_BOSS_PATTERNS.boss_spore;
 const attack=pattern[(e.attackCycle||0)%pattern.length];e.attackCycle=(e.attackCycle||0)+1;
 const origin={x:e.x,y:e.y},aim={...f.pos};
 e.bossAttack={...attack,origin,aim};if(attack.kind==='charge')e.bossAttack.end=bossChargeEnd(f,origin,aim,blocked);
 e.aim=aim;e.attackOrigin=origin;e.warning=attack.windup;e.windupTotal=attack.windup;
}
export function stepBossZones(f,dt,hurt){
 f.bossZones=(f.bossZones||[]).filter(z=>z.life>0&&f.enemies.some(e=>e.id===z.ownerId&&e.hp>0));
 for(const z of f.bossZones){
  if(!f.finished&&Math.hypot(f.pos.x-z.x,f.pos.y-z.y)<z.radius)hurt(1,z.source,{x:z.x,y:z.y});
  z.life=Math.max(0,z.life-dt);
 }
}
const bossRect=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
export function drawPixelMiniBoss(c,e,time,sc){
 c.save();c.translate(e.x,e.y);c.scale(1/sc,1/sc);
 c.beginPath();c.ellipse(0,20,30,8,0,0,Math.PI*2);c.fillStyle='#283f3855';c.fill();
 if(e.hp<=0)c.globalAlpha=Math.min(1,(e.deathFx||0)/.45);
 else if(e.hurtFx>0&&Math.floor(e.hurtFx*20)%2===0)c.globalAlpha=.6;
 c.scale(1.8,1.8);c.translate(-18,-22);
 const r=(x,y,w,h,col)=>bossRect(c,x,y,w,h,col),step=Math.round(Math.sin(time*4)*1),dark='#293b39';
 if(e.kind==='boss_spore'){
  // Heavy rooting feet, bark-plated shoulders and a luminous inner sporeheart.
  r(5,31+step,10,5,dark);r(22,31-step,10,5,dark);r(4,34+step,7,3,'#8a7962');r(27,34-step,7,3,'#8a7962');
  r(6,19,26,15,dark);r(9,21,19,12,'#756785');r(10,22,6,9,'#9686a3');r(21,22,6,9,'#514e62');
  r(1,19,9,11,dark);r(3,20,6,9,'#747657');r(28,19,8,11,dark);r(29,20,5,9,'#747657');
  r(3,23,3,3,'#a7af7c');r(30,25,3,2,'#a7af7c');r(15,24,8,7,dark);r(16,25,6,5,'#e2c891');r(18,26,2,3,'#fff1bc');
  r(7,13,23,11,dark);r(9,14,20,9,'#b2a294');r(10,16,17,6,'#85728c');r(11,17,5,2,'#cde6c4');r(22,17,5,2,'#cde6c4');r(16,21,7,2,dark);
  // Broad cap with scalloped rim, gills, tiered lights and curated spots.
  r(1,10,35,6,dark);r(3,7,31,7,'#6e637e');r(7,3,24,9,'#9680a6');r(11,0,16,9,'#b69ab9');
  r(3,11,29,3,'#b7baa0');r(6,14,2,4,'#82846d');r(11,14,2,3,'#82846d');r(25,14,2,3,'#82846d');
  r(9,5,6,3,'#d2bcbd');r(22,4,5,2,'#d8c4c3');r(5,9,4,2,'#adb39d');r(28,9,3,3,'#adb39d');
  r(14,2,9,2,'#d8cbc0');r(12,32,3,2,'#adbb8d');r(24,31,3,2,'#adbb8d');
 }else{
  // Pepper crown and jaw, broad basalt armor, clawed feet, molten chest seams.
  r(5,31+step,11,6,dark);r(22,31-step,11,6,dark);r(5,35+step,4,2,'#e2c99b');r(11,35+step,4,2,'#e2c99b');r(25,35-step,4,2,'#e2c99b');
  r(5,18,29,16,dark);r(8,19,23,13,'#8e6650');r(10,20,6,11,'#b98256');r(22,20,7,11,'#68534b');
  r(1,18,10,12,dark);r(2,17,8,8,'#b16f48');r(30,17,7,12,dark);r(31,18,5,8,'#b16f48');
  r(2,21,4,3,'#e1ab73');r(33,22,3,3,'#e1ab73');r(17,24,4,8,'#efb17a');r(16,25,8,3,'#db8656');r(18,26,3,2,'#ffe0a6');
  r(8,8,23,15,dark);r(10,9,19,12,'#cc7950');r(13,9,13,5,'#e1a06b');r(10,15,19,5,'#885b45');
  r(11,13,5,3,dark);r(22,13,5,3,dark);r(12,14,3,1,'#f8dd9d');r(23,14,3,1,'#f8dd9d');
  r(14,19,11,3,dark);r(15,19,3,2,'#f1d8aa');r(22,19,3,2,'#f1d8aa');
  r(8,6,22,4,'#85503b');r(9,1,5,8,'#c18253');r(24,0,5,9,'#c18253');r(16,-3,8,10,'#65825c');r(18,-5,4,5,'#9caa73');
  r(10,5,3,4,'#e4b87e');r(25,4,3,4,'#e4b87e');r(9,29,5,2,'#bc936b');r(25,30,5,2,'#bc936b');
 }
 c.restore();
}
export function drawMiniBossWarning(c,e){
 if(e.hp<=0||!e.bossAttack)return;const a=e.bossAttack;
 c.save();c.lineCap='round';const col=e.kind==='boss_spore'?'#cbd3b2':'#eed09d',q=Math.max(0,Math.min(1,1-(e.warning||0)/a.windup));
 c.strokeStyle=col;c.lineWidth=.065;c.fillStyle=e.kind==='boss_spore'?'#bcb3d42d':'#e89b6a2d';
 if(a.kind==='burst'){
  c.beginPath();c.arc(a.aim.x,a.aim.y,.8,0,Math.PI*2);c.fill();c.stroke();
  c.beginPath();c.arc(a.aim.x,a.aim.y,.8,-Math.PI/2,-Math.PI/2+q*Math.PI*2);c.lineWidth=.10;c.stroke();
 }else if(a.kind==='charge'){
  c.beginPath();c.moveTo(a.origin.x,a.origin.y);c.lineTo(a.end.x,a.end.y);c.lineWidth=1.2;c.strokeStyle='#d690642c';c.stroke();
  c.beginPath();c.moveTo(a.origin.x,a.origin.y);c.lineTo(a.end.x,a.end.y);c.lineWidth=.09;c.strokeStyle=col;c.stroke();
  c.beginPath();c.arc(a.end.x,a.end.y,.60,0,Math.PI*2);c.lineWidth=.045;c.stroke();
 }else{
  const angle=Math.atan2(a.aim.y-a.origin.y,a.aim.x-a.origin.x),spreads=a.kind==='ring'?Array.from({length:7},(_,i)=>(i+1)*Math.PI/4):e.kind==='boss_spore'?[-.55,0,.55]:[-.27,0,.27];
  for(const spread of spreads){c.beginPath();c.moveTo(a.origin.x+Math.cos(angle+spread)*.38,a.origin.y+Math.sin(angle+spread)*.38);c.lineTo(a.origin.x+Math.cos(angle+spread)*1.5,a.origin.y+Math.sin(angle+spread)*1.5);c.lineWidth=.04;c.stroke();}
 }
 c.restore();
}
export function drawBossZones(c,f){
 for(const z of f.bossZones||[]){if(z.life<=0)continue;c.save();c.globalAlpha=Math.min(.8,z.life/.25);c.beginPath();c.arc(z.x,z.y,z.radius,0,Math.PI*2);c.strokeStyle=z.source==='spore'?'#d4c0dd':'#f1c08e';c.lineWidth=.10;c.stroke();c.restore();}
}

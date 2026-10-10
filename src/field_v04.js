// v0.4 real-time forest encounter. The underlying kitchen inventory remains
// governed by engine.settleField; this file only mutates the expedition bag.
import {ING} from './data.js?v=0.5.2';
import {clamp, rand, settleField} from './engine.js?v=0.5.2';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const pushMsg=(f,message)=>{f.actionMessage=message;f.actionMessageTTL=2.7;};
export function startActionField(s){
 const f=s.field;if(!f||f.action)return false;
 f.action=true;f.pos={...(f.spawn||{x:4.5,y:9.4})};f.x=f.pos.x;f.y=f.pos.y;
 f.elapsed=0;f.harvestProgress=0;f.harvestNode=null;f.attackCd=0;f.skillCd=0;f.damageCd=0;f.activeEvent=null;
 f.projectiles=[];f.attackFx=null;f.skillFx=0;f.hurtFx=0;f.popFx=[];f.facing={x:0,y:-1};f.moving=false;f.actionMessage='移动寻找食材。靠近目标会自动采集。';f.actionMessageTTL=4;
 f.enemies=(f.route==='risk'||f.route==='spring_risk')?
 [{id:'chicken',kind:'chicken',x:6.85,y:6.6,hp:3,maxHp:3,cooldown:1.5,phase:0},
  {id:'pepper',kind:'pepper',x:2,y:3.3,hp:3,maxHp:3,cooldown:2.3,phase:1}]:
 [f.region==='spring'?{id:'pepper',kind:'pepper',x:6.8,y:3.3,hp:2,maxHp:2,cooldown:2.5,phase:0}:{id:'chicken',kind:'chicken',x:7.2,y:2.9,hp:2,maxHp:2,cooldown:2.0,phase:0}];
 // A target is always safely reachable before enemy engagement. Additional
 // meat from a combat-only reward sits near the high-risk side branch.
 f.nodes=f.nodes.map(n=>({...n,x:n.x+.5,y:n.y+.5,type:n.type==='danger'?'combat':n.type}));
 return true;
}
function blocked(f,p,r=.20){return p.x<r||p.y<r||p.x>f.worldW-r||p.y>f.worldH-r||f.obstacles.some(o=>Math.abs(p.x-(o.x+.5))<.40+r&&Math.abs(p.y-(o.y+.5))<.40+r)}
export function addBag(f,id,n){if(!ING[id]||!n)return 0;const old=f.bag[id]||0;const capacity=Math.max(6,Number(f.capacity)||6);if(old>=3||(!old&&Object.keys(f.bag).length>=capacity))return 0;const actual=Math.min(n,3-old);f.bag[id]=old+actual;return actual}
function hurt(s,amount=1){const f=s.field;if(f.damageCd>0)return false;f.hp=Math.max(0,f.hp-amount);f.damageCd=1.15;f.hurtFx=.46;pushMsg(f,`受伤 -${amount}，可随时撤离保住收获。`);if(f.hp===0){f.finished=true;settleField(s,'faint')}return true}
function gather(f,n){let gained=addBag(f,n.id,n.n);if(!gained){pushMsg(f,'背包或同类堆叠已满：可在背包中丢弃材料');return false}n.claimed=true;f.popFx??=[];f.popFx.push({x:n.x,y:n.y,text:`+${gained}`,ttl:.76,color:'#ffe8a3'});pushMsg(f,`采到 ${ING[n.id].name} ×${gained}${n.key==='target'?' · 今日目标已完成，可撤离！':''}`);return true}
export function useFieldSkill(s){const f=s.field;if(s.phase!=='field'||!f?.action||f.skillCd>0||f.finished)return false;f.skillCd=6.5;f.skillFx=.42;let hits=0;for(const e of f.enemies){if(e.hp<=0||dist(f.pos,e)>1.85)continue; e.hp-=2;e.hurtFx=.4;f.popFx??=[];f.popFx.push({x:e.x,y:e.y,text:'-2',ttl:.72,color:'#ffeab4'});e.x=clamp(e.x+Math.sign(e.x-f.pos.x)*.65,.35,f.worldW-.35);e.y=clamp(e.y+Math.sign(e.y-f.pos.y)*.65,.35,f.worldH-.35);hits++;}pushMsg(f,hits?`锅铲震荡！击退 ${hits} 个食材怪`:'挥动锅铲，没有击中目标');return true}
export function resolveFieldEvent(s,choice){const f=s.field;if(!f?.action||!f.activeEvent||f.finished)return false;const n=f.nodes.find(n=>n.key===f.activeEvent);if(!n||n.claimed)return false;let label='';if(choice==='trade'){
 if(!f.bag.mushroom){pushMsg(f,'没有采到蘑菇，无法交换');return false}
 f.bag.mushroom--;if(!f.bag.mushroom)delete f.bag.mushroom;
 const n=addBag(f,'chili',1);if(n===0){f.bag.mushroom=(f.bag.mushroom||0)+1;pushMsg(f,'背包没有火椒位置');return false}label='向游商用 1 份蘑菇换到火椒 ×1';
}else if(choice==='forage'){
 if(f.hp<=1){pushMsg(f,'生命不足，不能调查危险草丛');return false}
 f.hp--;const gained=addBag(f,n.id,2);label=`冒险深入草丛，损失 1 生命，取得 ${ING[n.id].name} ×${gained}`;
}else if(choice==='leave'){label='你绕开了可疑的料理笔记，保持安全';}
 else return false;
 n.claimed=true;f.activeEvent=null;pushMsg(f,label);return true;
}
export function stepActionField(s,axisX,axisY,dt){
 const f=s.field;if(s.phase!=='field'||!f?.action||f.finished||f.settled||f.activeEvent)return null;
 dt=clamp(Number(dt)||0,0,.06); f.elapsed+=dt;
 for(const key of ['attackCd','skillCd','damageCd','actionMessageTTL','skillFx','hurtFx'])f[key]=Math.max(0,(f[key]||0)-dt);
 if(f.attackFx){f.attackFx.ttl=Math.max(0,f.attackFx.ttl-dt);if(!f.attackFx.ttl)f.attackFx=null;}
 for(const e of f.enemies){e.hurtFx=Math.max(0,(e.hurtFx||0)-dt);e.lungeFx=Math.max(0,(e.lungeFx||0)-dt);e.deathFx=Math.max(0,(e.deathFx||0)-dt);}
 f.popFx=(f.popFx||[]).filter(x=>(x.ttl-=dt)>0);
 const len=Math.hypot(axisX,axisY), dx=len>0?axisX/len:0,dy=len>0?axisY/len:0;
 f.moving=len>.08; if(f.moving)f.facing={x:dx,y:dy};
 // Hot springs vent on a visible, deterministic cycle. The warning pool can
 // be crossed safely if the player pays attention; forest has no vent pulse.
 if(f.region==='spring'&&f.hp>0){for(const vent of f.hazards){const phase=(f.elapsed+(vent.x%2)*1.7)%4.2;if(phase>3.45&&Math.hypot(f.pos.x-(vent.x+.5),f.pos.y-(vent.y+.5))<.55){hurt(s,1);break}}}
 const speed=2.8;
 if(len>.08){const px={x:f.pos.x+dx*speed*dt,y:f.pos.y};if(!blocked(f,px))f.pos.x=px.x;const py={x:f.pos.x,y:f.pos.y+dy*speed*dt};if(!blocked(f,py))f.pos.y=py.y;f.x=f.pos.x;f.y=f.pos.y;}
 let event=null;
 for(const e of f.enemies){
  if(e.hp<=0)continue;
  e.cooldown-=dt;
  const d=dist(f.pos,e);
  if(d<3.6&&d>.6){const chase=e.kind==='chicken'?1.02:.64;const next={x:e.x+(f.pos.x-e.x)/d*chase*dt,y:e.y+(f.pos.y-e.y)/d*chase*dt};if(!blocked(f,next,.1)){e.x=next.x;e.y=next.y}}
  if(d<(e.kind==='chicken'?.70:3.2)&&e.cooldown<=0){
   if(e.kind==='chicken'){e.cooldown=1.6;e.warning=.45;}
   else {e.cooldown=2.5;e.warning=.55;e.aim={x:f.pos.x,y:f.pos.y}}
  }
  if(e.warning>0){e.warning-=dt;if(e.warning<=0){if(e.kind==='chicken'){e.lungeFx=.22;if(dist(f.pos,e)<.95)hurt(s)}else {const a=e.aim||f.pos,rr=Math.hypot(a.x-e.x,a.y-e.y)||1;f.projectiles.push({x:e.x,y:e.y,vx:(a.x-e.x)/rr*2.8,vy:(a.y-e.y)/rr*2.8,life:3});}}}
 }
 for(const p of f.projectiles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(dist(f.pos,p)<.28){p.life=0;hurt(s)}}f.projectiles=f.projectiles.filter(p=>p.life>0&&!blocked(f,p,0));
 if(f.attackCd<=0){const target=f.enemies.filter(e=>e.hp>0&&dist(f.pos,e)<1.25).sort((a,b)=>dist(f.pos,a)-dist(f.pos,b))[0];if(target){f.attackCd=.72;f.attackFx={ttl:.33,duration:.33,dx:(target.x-f.pos.x)/Math.max(.001,dist(f.pos,target)),dy:(target.y-f.pos.y)/Math.max(.001,dist(f.pos,target))};f.facing={x:f.attackFx.dx,y:f.attackFx.dy};target.hp--;target.hurtFx=.31;f.popFx.push({x:target.x,y:target.y,text:'-1',ttl:.58,color:'#fef4bf'});if(target.hp<=0){target.deathFx=.27;}if(target.hp<=0){pushMsg(f,`击败${target.kind==='chicken'?'林地啄啄鸡':'香辛小精怪'}，附近可以取得新食材！`);if(target.kind==='pepper')f.nodes.push({key:'pepper-drop',x:target.x,y:target.y,id:'chili',n:1,type:'gather',claimed:false});else f.nodes.push({key:'chicken-drop',x:target.x,y:target.y,id:'chicken',n:1,type:'gather',claimed:false});event='enemy_defeated';}}}
 const nearby=f.nodes.find(n=>!n.claimed&&dist(f.pos,n)<.86&&n.type!=='combat');
 if(nearby){if(nearby.type==='event'){
  f.activeEvent=nearby.key;pushMsg(f,'遇见流浪调味师：你要如何处理？');event='field_event';
 }else {
  if(f.harvestNode!==nearby.key){f.harvestNode=nearby.key;f.harvestProgress=0}
  f.harvestProgress+=dt;if(f.harvestProgress>=.82){if(gather(f,nearby))event='harvest';f.harvestProgress=0;f.harvestNode=null}
 }}else{f.harvestNode=null;f.harvestProgress=0;}
 // Combat side reward is claimable once nearby hostile units have been defeated.
 for(const n of f.nodes){if(n.type==='combat'&&!n.claimed&&dist(f.pos,n)<.90){const alive=f.enemies.some(e=>e.hp>0&&dist(e,n)<3);if(!alive){if(gather(f,n))event='harvest'}else if(f.actionMessageTTL<=0)pushMsg(f,'食材被怪物看守。可以战斗，也可以绕开。')}}
 return event;
}
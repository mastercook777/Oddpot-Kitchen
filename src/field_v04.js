// v0.4 real-time forest encounter. The underlying kitchen inventory remains
// governed by engine.settleField; this file only mutates the expedition bag.
import {ING} from './data.js?v=0.8.0';
import {clamp, rand, settleField,addFieldBag} from './engine.js?v=0.8.1';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const pushMsg=(f,message)=>{f.actionMessage=message;f.actionMessageTTL=2.7;};
export function startActionField(s){
 const f=s.field;if(!f||f.action)return false;
 f.action=true;f.pos={...(f.spawn||{x:4.5,y:9.4})};f.x=f.pos.x;f.y=f.pos.y;
 f.elapsed=0;f.harvestProgress=0;f.harvestNode=null;f.attackCd=0;f.skillCd??=0;f.damageCd=0;f.guardTime??=0;f.shieldCharge??=(f.weapon?.type==='WOK');f.shieldCooldown??=0;f.shieldFlash??=0;f.activeEvent=null;
 f.projectiles=[];f.playerProjectiles=[];f.attackFx=null;f.skillFx=0;f.hurtFx=0;f.popFx=[];f.facing={x:0,y:-1};f.moving=false;f.actionMessage='移动寻找食材。靠近目标会自动采集。';f.actionMessageTTL=4;
 const profile=f.biome||{},mix=profile.enemyMix||[f.region==='spring'?'pepper':'chicken'];
 const risk=/risk/.test(f.route),wave=f.segmentIndex||1;
 // Encounter composition, count and spawn rotate with the run seed and zone,
 // but dangerous branches always retain at least one hostile encounter.
 const encounterSeed=(profile.encounterSeed||((s.seed||1)>>>0))+wave*9187;
 const random=i=>(Math.imul(1664525,((encounterSeed+i*7919)>>>0))+1013904223)>>>0;
 const base=profile.enemyCount||1,shift=random(3)%3-1;
 const count=Math.min(4,Math.max(risk?1:1,base+shift+(risk&&wave>1?1:0)));
 const positions=[
  {x:6.85,y:6.6},{x:2.1,y:3.3},{x:7.1,y:2.9},{x:1.8,y:6.3},
  {x:6.9,y:4.25},{x:2.8,y:7.1},{x:5.8,y:2.4},{x:1.6,y:4.6}
 ];
 f.enemies=[];
 for(let i=0;i<count;i++){
  const pick=mix[(random(i+19)+i)%mix.length],kind=pick||'chicken';
  const candidates=positions.slice();
  const start=(random(i+47)+i)%candidates.length;
  let p=null;
  for(let c=0;c<candidates.length;c++){
   const basePos=candidates[(start+c)%candidates.length];
   const dx=(random(i*13+c+12)%5-2)*.07,dy=(random(i*17+c+27)%5-2)*.07;
   const candidate={x:basePos.x+dx,y:basePos.y+dy};
   if(blocked(f,candidate,.16)||dist(candidate,f.spawn||{x:4.5,y:9.4})<2.4)continue;
   if(f.enemies.some(e=>dist(e,candidate)<1.1))continue;
   p=candidate;break;
  }
  if(!p)p={x:7-i*.8,y:3+i*.55};
  const hp=kind==='boar'?4:kind==='chicken'||kind==='steam_crab'?3:2;
  f.enemies.push({id:kind+'-'+i+'-'+wave,kind,x:p.x,y:p.y,hp,maxHp:hp,
   cooldown:1.55+(random(i+81)%10)*.12,phase:i});
 }
 if(f.segmentIndex===3&&f.dangerCommitment&&!f.legacyField){
  const hot=f.region==='spring',p=f.bossSpawn||{x:4.5,y:1.8};
  f.enemies.push({id:hot?'ember_king':'spore_king',kind:hot?'boss_ember':'boss_spore',
   isBoss:true,x:p.x,y:p.y,hp:10,maxHp:10,cooldown:2.5,
   warning:0,phase:0,slowTime:0,lootDropped:false});
 }
 // A target is always safely reachable before enemy engagement. Additional
 // meat from a combat-only reward sits near the high-risk side branch.
 f.nodes=f.nodes.map(n=>({...n,x:n.x+.5,y:n.y+.5,type:n.type==='danger'?'combat':n.type}));
 return true;
}
function blocked(f,p,r=.20){return p.x<r||p.y<r||p.x>f.worldW-r||p.y>f.worldH-r||f.obstacles.some(o=>Math.abs(p.x-(o.x+.5))<.40+r&&Math.abs(p.y-(o.y+.5))<.40+r)}
export function addBag(f,id,n){return addFieldBag(f,id,n)}
function damageEnemy(s,e,amount=1){
 const f=s.field;if(!e||e.hp<=0)return false;
 e.hp=Math.max(0,e.hp-amount);e.hurtFx=.36;
 f.popFx??=[];f.popFx.push({x:e.x,y:e.y,text:'-'+amount,ttl:.72,color:'#ffeab4'});
 if(e.hp>0||e.lootDropped)return true;
 e.lootDropped=true;e.deathFx=.45;
 if(e.isBoss){
  const ingredient=e.kind==='boss_ember'?'ember_pepper':'mushroom_heart';
  const first=!s.bossCleared?.[e.id];f.bossDefeated=e.id;
  f.nodes.push({key:'boss-reward-'+f.segmentIndex,id:ingredient,n:first?2:1,
   type:'gather',x:e.x,y:e.y,claimed:false});
  pushMsg(f,'Mini Boss 被击败！珍贵食材已掉落，靠近拾取再返回饭店。');
 }else{
  const ingredient=e.kind==='pepper'?'chili':e.kind==='sporeling'?'mushroom':e.kind==='boar'?'beef':e.kind==='steam_crab'?'potato':'chicken';
  f.nodes.push({key:e.id+'-drop-'+f.segmentIndex,id:ingredient,n:1,
   type:'gather',x:e.x,y:e.y,claimed:false});
  pushMsg(f,'打败食材怪！附近可以采集新食材。');
 }
 return true;
}
function clearLineOfFire(f,a,b){
 const d=Math.hypot(a.x-b.x,a.y-b.y);
 for(let t=.20;t<d;t+=.18){
  const q={x:a.x+(b.x-a.x)*t/d,y:a.y+(b.y-a.y)*t/d};
  if(f.obstacles.some(o=>Math.abs(q.x-(o.x+.5))<.43&&Math.abs(q.y-(o.y+.5))<.43))return false;
 }
 return true;
}
function potLaunch(f,target,damage=1,radius=.65,slow=0){
 f.playerProjectiles??=[];
 f.playerProjectiles.push({x:f.pos.x,y:f.pos.y,fromX:f.pos.x,fromY:f.pos.y,
  targetX:target.x,targetY:target.y,time:0,duration:.38,damage,radius,slow});
}
function advancePlayerProjectiles(s,dt){
 const f=s.field;
 for(const p of f.playerProjectiles||[]){
  p.time+=dt;const factor=Math.min(1,p.time/p.duration);
  p.x=p.fromX+(p.targetX-p.fromX)*factor;p.y=p.fromY+(p.targetY-p.fromY)*factor;
  if(factor<1||p.hit)continue;
  p.hit=true;
  for(const e of f.enemies||[]){
   if(e.hp>0&&dist({x:p.targetX,y:p.targetY},e)<=p.radius){
    damageEnemy(s,e,p.damage);if(p.slow>0)e.slowTime=Math.max(e.slowTime||0,p.slow);
   }
  }
  f.popFx??=[];f.popFx.push({x:p.targetX,y:p.targetY,text:'💥',ttl:.5,color:'#ffe5ad'});
 }
 f.playerProjectiles=(f.playerProjectiles||[]).filter(p=>!p.hit);
}
const WOK_SHIELD_RECHARGE=8;
function shieldAttackIsFrontal(f,attacker){
 if(!attacker||!Number.isFinite(attacker.x)||!Number.isFinite(attacker.y))return false;
 const aim=f.facing||{x:0,y:-1},norm=Math.hypot(aim.x,aim.y)||1;
 const dx=attacker.x-f.pos.x,dy=attacker.y-f.pos.y,dist=Math.hypot(dx,dy)||1;
 return (aim.x*dx+aim.y*dy)/(norm*dist)>=Math.cos(Math.PI*2/5);
}
function hurt(s,amount=1,source='enemy',attacker=null){
 const f=s.field;if(f.damageCd>0)return false;
 // A WOK shield deflects ONE attack coming from the front once recharged;
 // active parry is deliberately a separate short timing window.
 const isAttack=['enemy','pepper','spore'].includes(source);
 if(f.weapon?.type==='WOK'&&isAttack&&shieldAttackIsFrontal(f,attacker)){
  const parry=f.guardTime>0,passive=!!f.shieldCharge;
  if(parry||passive){
   if(parry)f.guardTime=0;
   else {f.shieldCharge=false;f.shieldCooldown=WOK_SHIELD_RECHARGE;}
   f.shieldFlash=.55;f.damageCd=.38;
   f.popFx??=[];f.popFx.push({x:f.pos.x,y:f.pos.y-.2,text:parry?'完美格挡!':'盾牌挡住!',ttl:.82,color:'#faffb8'});
   pushMsg(f,parry?'🛡️ 锅盖反击成功！':'🛡️ 锅盖自动抵挡！8 秒后恢复防护。');
   return true;
  }
 }
 const b=f.bento;
 let protectedHit=false;
 if(b&&!b.used){
  const enemyShield=b.kind==='first_enemy_hit'&&(source==='enemy'||(b.enhanced&&source==='pepper'));
  const springShield=b.kind==='spring_shield'&&(source==='vent'||(b.enhanced&&source==='pepper'));
  const sporeShield=b.kind==='spore_shield'&&(source==='spore'||(b.enhanced&&source==='enemy'));
  if(enemyShield||springShield||sporeShield){amount=Math.max(0,amount-1);b.used=true;protectedHit=true}
 }
 f.hp=Math.max(0,f.hp-amount);f.damageCd=1.15;f.hurtFx=.46;
 pushMsg(f,protectedHit?'🍱 便当生效！这一次抵御了 1 点伤害。':`受伤 -${amount}，可随时撤离保住收获。`);
 if(f.hp===0){f.finished=true;settleField(s,'faint')}return true;
}
function gather(f,n){
 let gained=addBag(f,n.id,n.n);
 if(!gained){pushMsg(f,'背包或同类堆叠已满：可在背包中丢弃材料');return false}
 const b=f.bento;
 let bonus=0;
 if(b&&!b.used){
  const mushroom=b.kind==='mushroom_gather'&&(n.id==='mushroom'||(b.enhanced&&n.id==='potato'));
  const plant=b.kind==='first_plant_gather'&&(['cabbage','onion'].includes(n.id)||(b.enhanced&&n.id==='potato'));
  if(mushroom||plant){bonus=addBag(f,n.id,1);if(bonus)b.used=true}
 }
 gained+=bonus;n.claimed=true;f.popFx??=[];
 f.popFx.push({x:n.x,y:n.y,text:'+'+gained,ttl:.76,color:'#ffe8a3'});
 pushMsg(f,(bonus?'🍱 便当采集加成！':'')+'采到 '+ING[n.id].name+' ×'+gained+(n.key==='target'?' · 今日目标已完成，可撤离！':''));
 return true;
}
export function useFieldSkill(s){
 const f=s.field;if(s.phase!=='field'||!f?.action||f.skillCd>0||f.finished||f.segmentStatus==='choice')return false;
 if(f.weapon?.type==='POT'){
  const target=f.enemies.filter(e=>e.hp>0&&dist(f.pos,e)<=3.9&&clearLineOfFire(f,f.pos,e))
   .sort((a,b)=>dist(f.pos,a)-dist(f.pos,b))[0];
  if(!target){pushMsg(f,'高压汤锅：附近没有可瞄准的敌人。');return false;}
  potLaunch(f,target,2,1.1,.8);f.skillCd=6.5;f.skillFx=.42;
  pushMsg(f,'🍲 高压汤锅！投出强化洋葱炸弹。');return true;
 }
 f.skillCd=6.5;f.skillFx=.42;f.guardTime=f.weapon?.level>1?.55:.45;
 let hits=0;
 for(const e of f.enemies){
  if(e.hp<=0||dist(f.pos,e)>1.85)continue;
  damageEnemy(s,e,2);e.x=clamp(e.x+Math.sign(e.x-f.pos.x)*.65,.35,f.worldW-.35);
  e.y=clamp(e.y+Math.sign(e.y-f.pos.y)*.65,.35,f.worldH-.35);hits++;
 }
 pushMsg(f,hits?'🛡️ 锅盖反击！击退 '+hits+' 个敌人':'🛡️ 举起锅盖！短暂防御迎面攻击。');
 return true;
}
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
 if(f.segmentStatus==='choice')return null;
 dt=clamp(Number(dt)||0,0,.06); f.elapsed+=dt;f.guardTime=Math.max(0,(f.guardTime||0)-dt);
 f.shieldFlash=Math.max(0,(f.shieldFlash||0)-dt);
 if(f.weapon?.type==='WOK'&&!f.shieldCharge){f.shieldCooldown=Math.max(0,(f.shieldCooldown||0)-dt);if(f.shieldCooldown<=0)f.shieldCharge=true;}
 for(const key of ['attackCd','skillCd','damageCd','actionMessageTTL','skillFx','hurtFx'])f[key]=Math.max(0,(f[key]||0)-dt);
 if(f.attackFx){f.attackFx.ttl=Math.max(0,f.attackFx.ttl-dt);if(!f.attackFx.ttl)f.attackFx=null;}
 for(const e of f.enemies){e.hurtFx=Math.max(0,(e.hurtFx||0)-dt);e.lungeFx=Math.max(0,(e.lungeFx||0)-dt);e.deathFx=Math.max(0,(e.deathFx||0)-dt);}
 f.popFx=(f.popFx||[]).filter(x=>(x.ttl-=dt)>0);
 const len=Math.hypot(axisX,axisY), dx=len>0?axisX/len:0,dy=len>0?axisY/len:0;
 f.moving=len>.08; if(f.moving)f.facing={x:dx,y:dy};
 // Hot springs vent on a visible, deterministic cycle. The warning pool can
 // be crossed safely if the player pays attention; forest has no vent pulse.
 if((f.region==='spring'||f.biome?.style==='roots')&&f.hp>0){
  const spore=f.biome?.style==='roots';
  for(const vent of f.hazards){
   const phase=(f.elapsed+(vent.x%2)*1.7)%4.2;
   if(phase>(spore?3.15:3.45)&&Math.hypot(f.pos.x-(vent.x+.5),f.pos.y-(vent.y+.5))<.55){
    hurt(s,1,spore?'spore':'vent');break;
   }
  }
 }
 const b=f.bento;
 const risk=/risk/.test(f.route);
 const boost=b&&((b.kind==='risk_move'&&risk)||(b.kind==='danger_speed'&&risk))?(b.enhanced?.07:.05):0;
 const speed=2.8*(1+boost);
 if(len>.08){const px={x:f.pos.x+dx*speed*dt,y:f.pos.y};if(!blocked(f,px))f.pos.x=px.x;const py={x:f.pos.x,y:f.pos.y+dy*speed*dt};if(!blocked(f,py))f.pos.y=py.y;f.x=f.pos.x;f.y=f.pos.y;}
 let event=null;
 for(const e of f.enemies){
  if(e.hp<=0)continue;
  e.cooldown-=dt;
  const d=dist(f.pos,e);
  const melee=['chicken','boar','steam_crab'].includes(e.kind);
  e.slowTime=Math.max(0,(e.slowTime||0)-dt);
  const chase=e.kind==='boar'?1.22:e.kind==='chicken'?1.02:e.kind==='steam_crab'?.78:e.isBoss?.47:.62;
  if(d<3.6&&d>.62){
   const speed=chase*(e.slowTime>0?.45:1),next={x:e.x+(f.pos.x-e.x)/d*speed*dt,y:e.y+(f.pos.y-e.y)/d*speed*dt};
   if(!blocked(f,next,.1)){e.x=next.x;e.y=next.y}
  }
  if(d<(melee?.88:e.isBoss?4:3.2)&&e.cooldown<=0){
   e.cooldown=e.isBoss?3:e.kind==='boar'?2.1:melee?1.7:e.kind==='sporeling'?2.9:2.5;
   e.warning=e.isBoss?.85:melee?.42:e.kind==='sporeling'?.72:.55;
   e.aim={x:f.pos.x,y:f.pos.y};
  }
  if(e.warning>0){e.warning-=dt;if(e.warning<=0){
   if(melee){e.lungeFx=.22;if(dist(f.pos,e)<(e.kind==='boar'?1.10:.95))hurt(s,1,'enemy',e)}
   else{
    const aim=e.aim||f.pos,ang=Math.atan2(aim.y-e.y,aim.x-e.x);
    const spreads=e.isBoss?e.kind==='boss_spore'?[-.55,0,.55]:[-.27,0,.27]:[0];
    const source=e.kind==='boss_spore'||e.kind==='sporeling'?'spore':'pepper';
    for(const spread of spreads){
     const theta=ang+spread,speed=source==='spore'?(e.isBoss?1.9:2.1):e.isBoss?3.1:2.8;
     f.projectiles.push({x:e.x,y:e.y,vx:Math.cos(theta)*speed,vy:Math.sin(theta)*speed,
       ownerX:e.x,ownerY:e.y,life:3,source});
    }
   }
  }}
 }
 for(const p of f.projectiles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(dist(f.pos,p)<.28){p.life=0;hurt(s,1,p.source||'pepper',{x:p.ownerX??p.x,y:p.ownerY??p.y})}}f.projectiles=f.projectiles.filter(p=>p.life>0&&!blocked(f,p,0));
 advancePlayerProjectiles(s,dt);
 if(f.attackCd<=0){
  const isPot=f.weapon?.type==='POT',range=isPot?3.5:1.25;
  const target=f.enemies.filter(e=>e.hp>0&&dist(f.pos,e)<range&&(!isPot||clearLineOfFire(f,f.pos,e)))
   .sort((a,b)=>dist(f.pos,a)-dist(f.pos,b))[0];
  if(target){
   const distance=Math.max(.001,dist(f.pos,target));
   f.facing={x:(target.x-f.pos.x)/distance,y:(target.y-f.pos.y)/distance};
   if(isPot){
    f.attackCd=f.weapon?.level>1?1.1:1.2;
    potLaunch(f,target,1,f.weapon?.level>1?.75:.65);
    f.attackFx={ttl:.24,duration:.24,dx:f.facing.x,dy:f.facing.y,pot:true};
   }else{
    f.attackCd=.70;
    f.attackFx={ttl:.33,duration:.33,dx:f.facing.x,dy:f.facing.y};
    const maxHits=2,span=f.weapon?.level>1?1.84:1.57;
    let hit=0;
    for(const enemy of f.enemies){
     if(enemy.hp<=0||dist(f.pos,enemy)>1.25)continue;
     const r=Math.max(.001,dist(f.pos,enemy)),dot=((enemy.x-f.pos.x)*f.facing.x+(enemy.y-f.pos.y)*f.facing.y)/r;
     if(dot<Math.cos(span/2))continue;
     damageEnemy(s,enemy,1);if(++hit>=maxHits)break;
    }
   }
  }
 }
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
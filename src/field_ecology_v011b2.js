// B2 applies only to newly spawned expanded segments. Existing enemies keep
// their saved controller. All movement uses the real obstacle grid.
import {fieldTilePath} from './field_rules_v011a.js';
import {fieldEnemySpawnCandidates} from './field_world_v011b1.js';
import {meleeProfile,meleeAttackWouldHit} from './field_combat_feedback_v084.js?v=0.8.4';
export const ECOLOGY_ENCOUNTERS={
 meadow:{base:2,mix:['chicken','boar']},glow:{base:3,mix:['chicken','sporeling']},
 roots:{base:3,mix:['boar','sporeling','chicken']},garden:{base:2,mix:['chicken','boar']},
 spring:{base:2,mix:['steam_crab','pepper']},steam:{base:3,mix:['steam_crab','pepper','chicken']},
 ember:{base:3,mix:['pepper','boar','steam_crab']},oasis:{base:2,mix:['steam_crab','chicken']},
 cloud:{base:2,mix:['gust_moth','chicken']},cloud_roost:{base:3,mix:['gust_moth','gust_moth','chicken']}
};
const ecologyDist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const ecologyHash=n=>{let h=n>>>0;h=Math.imul(h^(h>>>16),0x45d9f3b);h=Math.imul(h^(h>>>16),0x45d9f3b);return (h^(h>>>16))>>>0;};
export function ecologyHasSight(f,a,b,padding=0){
 const d=ecologyDist(a,b);
 for(let n=.12;n<d;n+=.12){const p={x:a.x+(b.x-a.x)*n/d,y:a.y+(b.y-a.y)*n/d};
  if(f.obstacles.some(o=>Math.abs(p.x-o.x-.5)<.43+padding&&Math.abs(p.y-o.y-.5)<.43+padding))return false;
 }
 return true;
}
export function createEcologyEnemies(f,seed){
 const config=ECOLOGY_ENCOUNTERS[f.biome?.style]||ECOLOGY_ENCOUNTERS.meadow,wave=f.segmentIndex||1,risk=/risk/.test(f.route);
 const count=Math.min(risk?7:4,config.base+(risk?2:0)+(risk&&wave>1?1:!risk&&wave===3?1:0)+(ecologyHash(seed)>>>12)%2);
 const candidates=fieldEnemySpawnCandidates(f,seed,count+10),nodes=f.nodes.filter(n=>n.type==='event'||n.key==='target').map(n=>({x:n.x+.5,y:n.y+.5}));
 const food=f.nodes.filter(n=>n.type!=='event').map(n=>({x:n.x+.5,y:n.y+.5}));
 const validCache=new Map();
 const valid=p=>{const key=p.x+','+p.y;if(!validCache.has(key))validCache.set(key,ecologyDist(p,f.spawn)>=2.7&&nodes.every(n=>ecologyDist(n,p)>=1.2)&&food.every(n=>ecologyDist(n,p)>=.85)&&!f.hazards.some(h=>Math.floor(p.x)===h.x&&Math.floor(p.y)===h.y)&&fieldTilePath(f,f.spawn,p,{avoidHazards:true}).length>0);return validCache.get(key);};
 // Additional reachable cells avoid forcing a crowded or inaccessible fallback.
 for(let y=1;y<f.worldH-1;y++)for(let x=1;x<f.worldW-1;x++){
  const p={x:x+.5,y:y+.5};if(valid(p)&&!candidates.some(q=>ecologyDist(q,p)<.1))candidates.push(p);
 }
 const enemies=[],offset=(ecologyHash(seed+71)>>>8)%config.mix.length;let group=-1;
 for(let i=0;i<count;i++){
  const previous=i%2?enemies.at(-1):null;
  const available=candidates.filter(p=>valid(p)&&enemies.every(e=>ecologyDist(p,e)>=1.2));
  const anchor=food[(ecologyHash(seed+Math.floor(i/2)*913)>>>8)%food.length]||f.bossSpawn;
  const score=p=>ecologyDist(p,anchor)+ecologyHash(seed+p.x*113+p.y*997)/4294967296*.6;
  available.sort((a,b)=>previous?ecologyDist(a,previous)-ecologyDist(b,previous):score(a)-score(b));
  const p=available[0];if(!p)break;
  if(!previous||ecologyDist(p,previous)>3)group++;
  const kind=config.mix[(offset+i)%config.mix.length],hp=kind==='boar'?4:['chicken','steam_crab'].includes(kind)?3:2;
  enemies.push({id:kind+'-'+i+'-'+wave,kind,x:p.x,y:p.y,hp,maxHp:hp,brainVersion:'0.11-B2',groupId:group,
   home:previous&&ecologyDist(p,previous)<=3?{...previous.home}:{...p},phase:i,patrolSide:ecologyHash(seed+i*97)%4,
   cooldown:1.5+(ecologyHash(seed+i*719)%10)*.12});
 }
 return enemies;
}
export function ecologyEngagedEnemies(f){
 const living=f.enemies.filter(e=>e.hp>0),bossNear=living.some(e=>e.isBoss&&(e.warning>0||e.rush||ecologyDist(e,f.pos)<4));
 const ordinary=living.filter(e=>e.brainVersion==='0.11-B2'),awakened=new Set();
 for(const e of ordinary)if(e.hurtFx>0||(ecologyDist(e,f.pos)<3.4&&ecologyHasSight(f,e,f.pos)))awakened.add(e.groupId);
 const candidates=ordinary.filter(e=>{
  if(e.warning>0||e.ecologyRush)return true;
  const tether=e.kind==='steam_crab'?2.2:4.5;
  return ecologyDist(f.pos,e.home)<=tether&&(e.hurtFx>0||ecologyDist(e,f.pos)<3.4||awakened.has(e.groupId))&&ecologyHasSight(f,e,f.pos);
 });
 candidates.sort((a,b)=>Number(!!(b.warning>0||b.ecologyRush))-Number(!!(a.warning>0||a.ecologyRush))||ecologyDist(a,f.pos)-ecologyDist(b,f.pos)||a.id.localeCompare(b.id));
 return new Set(candidates.slice(0,bossNear?2:3).map(e=>e.id));
}
export function moveEcologyEnemy(f,e,target,speed,dt,blocked){
 const d=ecologyDist(e,target);if(d<.08)return;
 const step=Math.min(d,speed*dt),next={x:e.x+(target.x-e.x)/d*step,y:e.y+(target.y-e.y)/d*step};
 if(ecologyHasSight(f,e,target,.15)&&!blocked(f,next,.18)){e.face=next.x<e.x?-1:1;e.x=next.x;e.y=next.y;e.moving=true;return;}
 const key=Math.floor(target.x)+','+Math.floor(target.y);
 e.pathWait=Math.max(0,(e.pathWait||0)-dt);
 if(e.pathGoal!==key||!e.path||e.pathWait<=0){e.path=fieldTilePath(f,e,target).slice(1);e.pathGoal=key;e.pathWait=.4;}
 while(e.path?.length&&ecologyDist(e,e.path[0])<.05)e.path.shift();
 const waypoint=e.path?.[0];if(!waypoint)return;
 const wd=ecologyDist(e,waypoint),n=Math.min(wd,speed*dt),p={x:e.x+(waypoint.x-e.x)/wd*n,y:e.y+(waypoint.y-e.y)/wd*n};
 if(!blocked(f,p,.18)){e.face=p.x<e.x?-1:1;e.x=p.x;e.y=p.y;e.moving=true;}
}
export function ecologyChargeEnd(f,e,aim,blocked){
 const dx=aim.x-e.x,dy=aim.y-e.y,d=Math.hypot(dx,dy)||1;let end={x:e.x,y:e.y};
 for(let n=.06;n<=Math.min(1.8,d+.15);n+=.06){const p={x:e.x+dx/d*n,y:e.y+dy/d*n};if(blocked(f,p,.18))break;end=p;}
 return end;
}
export function stepEcologyEnemy(f,e,dt,engaged,{blocked,hurt}){
 if(e.hp<=0){e.ecologyRush=null;e.ecologyAttack=null;e.warning=0;return;}
 const slow=e.slowTime>0?.45:1,d=ecologyDist(e,f.pos);e.engaged=engaged;e.moving=false;
 if(!engaged&&(e.warning>0||e.ecologyRush)){e.warning=0;e.ecologyRush=null;e.ecologyAttack=null;e.attackOrigin=null;e.cooldown=Math.max(.5,e.cooldown);}
 if(e.ecologyRush){
  const end=e.ecologyRush.end,n=ecologyDist(e,end),step=Math.min(n,3.2*slow*dt);
  if(n>.001){const p={x:e.x+(end.x-e.x)/n*step,y:e.y+(end.y-e.y)/n*step};if(!blocked(f,p,.18)){e.face=p.x<e.x?-1:1;e.x=p.x;e.y=p.y;e.moving=true;}else {e.ecologyRush=null;e.ecologyAttack=null;}}
  if(ecologyDist(e,f.pos)<.48&&!f.finished)hurt(1,'enemy',e);
  if(n<=step+.02){e.ecologyRush=null;e.ecologyAttack=null;}return;
 }
 if(e.warning>0){
  e.warning=Math.max(0,e.warning-dt);if(e.warning>0)return;
  if(e.kind==='boar'&&e.ecologyAttack){e.ecologyRush={end:{...e.ecologyAttack.end}};e.cooldown=2.4;return;}
  const melee=meleeProfile(e.kind),origin=e.attackOrigin||e,aim=e.aim||f.pos;
  const angle=Math.atan2(aim.y-origin.y,aim.x-origin.x);
  if(melee){
   const p={x:e.x+Math.cos(angle)*melee.dash,y:e.y+Math.sin(angle)*melee.dash};if(!blocked(f,p,.18)){e.x=p.x;e.y=p.y;}
   if(ecologyHasSight(f,e,f.pos)&&meleeAttackWouldHit(e,f.pos))hurt(1,'enemy',e);
   e.strikeFx={ttl:.28,duration:.28,x:e.x,y:e.y,dx:Math.cos(angle),dy:Math.sin(angle)};e.lungeFx=.28;
   e.cooldown=e.kind==='chicken'?1.7:2.0;if(e.kind==='chicken')e.retreatTime=.65;
  }else if(ecologyHasSight(f,e,aim)){
   const spore=e.kind==='sporeling',gust=e.kind==='gust_moth',speed=spore?2.1:gust?2.4:2.8;
   f.projectiles.push({x:e.x,y:e.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,ownerX:e.x,ownerY:e.y,ownerId:e.id,life:3,source:gust?'gust':spore?'spore':'pepper'});
   e.cooldown=spore?2.9:gust?2.7:2.5;
  }else e.cooldown=.6;
  e.attackOrigin=null;return;
 }
 if(!engaged){
  if(ecologyDist(e,e.home)>1.2){moveEcologyEnemy(f,e,e.home,.78*slow,dt,blocked);return;}
  // Calm short patrol near the real home, with no random draws per frame.
  const t=Math.floor((f.elapsed||0)/3)+(e.patrolSide||0),offsets=[[.7,0],[0,.7],[-.7,0],[0,-.7]],o=offsets[t%4];
  moveEcologyEnemy(f,e,{x:e.home.x+o[0],y:e.home.y+o[1]},.32*slow,dt,blocked);return;
 }
 if(e.retreatTime>0){e.retreatTime=Math.max(0,e.retreatTime-dt);moveEcologyEnemy(f,e,e.home,1.2*slow,dt,blocked);return;}
 const ranged=!meleeProfile(e.kind),spacing=e.kind==='sporeling'?2.0:2.5;
 if(ranged&&d<spacing-.35){
  const dx=(e.x-f.pos.x)/(d||1),dy=(e.y-f.pos.y)/(d||1),target={x:e.x+dx*.6,y:e.y+dy*.6};
  if(!blocked(f,target,.18))moveEcologyEnemy(f,e,target,.65*slow,dt,blocked);
 }else if(d>(ranged?spacing+.35:e.kind==='boar'?1.75:.8))moveEcologyEnemy(f,e,f.pos,(e.kind==='chicken'?.95:e.kind==='boar'?1.05:.68)*slow,dt,blocked);
 if(e.cooldown>0||!ecologyHasSight(f,e,f.pos))return;
 const melee=meleeProfile(e.kind),trigger=e.kind==='boar'?2.15:melee?melee.trigger:3.2;
 if(ecologyDist(e,f.pos)>=trigger)return;
 e.aim={...f.pos};e.attackOrigin={x:e.x,y:e.y};
 e.warning=e.kind==='boar'?1:melee?melee.windup:e.kind==='sporeling'?.72:.55;e.windupTotal=e.warning;
 e.intentKind=melee?'melee':'ranged';
 if(e.kind==='boar')e.ecologyAttack={origin:{...e.attackOrigin},end:ecologyChargeEnd(f,e,e.aim,blocked)};
}
export function drawEcologyWarning(c,e){
 if(e.hp<=0||!e.ecologyAttack)return;const a=e.ecologyAttack;
 c.save();c.lineCap='round';c.beginPath();c.moveTo(a.origin.x,a.origin.y);c.lineTo(a.end.x,a.end.y);
 c.strokeStyle='#dc98732e';c.lineWidth=.96;c.stroke();c.strokeStyle='#efcf9b';c.lineWidth=.055;c.stroke();
 c.beginPath();c.arc(a.end.x,a.end.y,.48,0,Math.PI*2);c.lineWidth=.04;c.stroke();c.restore();
}

// Local hit response in simulation seconds. No global hit-stop or wall clock.
export const FIELD_HIT_PROFILES={
 wok:{distance:.22,duration:.14,hold:.035,color:'#fff0bc'},
 pot:{distance:.17,duration:.14,hold:.030,color:'#e3efc4'},
 wok_skill:{distance:.55,duration:.20,hold:.050,color:'#fff0bc'},
 pot_skill:{distance:.36,duration:.18,hold:.050,color:'#d3f3dc'},
 fork_thrust:{distance:.24,duration:.16,hold:.040,color:'#ffe7b7'},
 fork_flame:{distance:.35,duration:.19,hold:.045,color:'#ffb76c'}
};
export function queueFieldImpact(f,fx){
 f.impactFx??=[];f.impactFx.push(fx);
 if(f.impactFx.length>24)f.impactFx.splice(0,f.impactFx.length-24);
}
export function beginFieldHit(f,e,kind,origin){
 const profile=FIELD_HIT_PROFILES[kind]||FIELD_HIT_PROFILES.wok;
 let dx=e.x-origin.x,dy=e.y-origin.y,n=Math.hypot(dx,dy);
 if(n<.001){dx=origin.dx??f.facing?.x??0;dy=origin.dy??f.facing?.y??-1;n=Math.hypot(dx,dy);if(n<.001){dx=0;dy=-1;n=1;}}
 dx/=n;dy/=n;
 const strong=kind.endsWith('_skill'),heavy=['boar','steam_crab'].includes(e.kind);
 e.hitResponse={kind,dx,dy,hold:profile.hold,duration:profile.duration,time:0,
  distance:e.isBoss||e.hp<=0?0:profile.distance*(heavy?.55:1),
  ttl:profile.hold+profile.duration+.07,total:profile.hold+profile.duration+.07};
 queueFieldImpact(f,{kind:'contact',x:e.x,y:e.y,dx,dy,strong,kill:e.hp<=0,
  color:profile.color,ttl:strong?.28:.20,duration:strong?.28:.20});
 if(strong||e.hp<=0)f.combatJolt=Math.max(f.combatJolt||0,.09);
}
// Return AI time left in this frame. The actor alone stops briefly; player,
// cooldowns, hazards and all other actors continue. Sweep every displacement.
export function stepFieldHit(f,e,dt,blocked){
 const r=e.hitResponse;if(!r)return dt;
 r.ttl=Math.max(0,r.ttl-dt);
 if(e.isBoss||e.hp<=0){if(!r.ttl)e.hitResponse=null;return dt;}
 const held=Math.min(dt,r.hold);r.hold=Math.max(0,r.hold-held);
 const moving=Math.min(dt-held,Math.max(0,r.duration-r.time));
 const prev=r.time/r.duration;r.time+=moving;
 const next=r.time/r.duration,distance=r.distance*((1-prev)**2-(1-next)**2);
 const steps=Math.ceil(distance/.035);
 for(let i=0;i<steps;i++){
  const p={x:e.x+r.dx*distance/steps,y:e.y+r.dy*distance/steps};
  if(blocked(f,p,.18)){r.distance=0;break;}
  e.x=p.x;e.y=p.y;
 }
 const remaining=Math.max(0,dt-held-moving);
 if(!r.ttl)e.hitResponse=null;
 return remaining;
}
export function fieldHitPose(e){
 const r=e.hitResponse;if(!r||r.ttl<=0)return {x:0,y:0,sx:1,sy:1};
 const p=1-r.ttl/r.total,amount=Math.sin(Math.PI*Math.min(1,p*1.8))*(e.isBoss?.35:1);
 // Pixel-sized recoil only: authoritative coordinates and warnings stay put.
 return {x:r.dx*amount*2,y:r.dy*amount*1.5,sx:1+amount*.07,sy:1-amount*.07};
}
export function fieldAttackPose(f){
 const fx=f.attackFx;if(!fx?.ttl)return {x:0,y:0,angle:0};
 const p=Math.max(0,Math.min(1,1-fx.ttl/fx.duration));
 const snap=Math.exp(-p*6),settle=Math.sin(p*Math.PI)*.25;
 return {x:fx.dx*(snap*2-settle),y:fx.dy*(snap*1.4-settle),angle:(snap-.2)*.9};
}

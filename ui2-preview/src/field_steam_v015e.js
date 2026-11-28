// v0.15-E: Cloud Harbor steamer is the short-radius area CONTROL choice.
// Pure targeting and field timing are shared by the live engine and tests.
export const STEAM_COMBAT=Object.freeze({
  pulseRange:[1.60,1.90],pulseCooldown:[.96,.78],pulseSlow:[.90,1.25],pulseTargets:2,
  mistRadius:[1.90,2.15],mistDuration:[2.8,3.4],mistSlowTick:.24
});
const lvIndex=level=>level>1?1:0;
export const steamPulseStats=level=>({
 range:STEAM_COMBAT.pulseRange[lvIndex(level)],cooldown:STEAM_COMBAT.pulseCooldown[lvIndex(level)],
 slow:STEAM_COMBAT.pulseSlow[lvIndex(level)],targets:STEAM_COMBAT.pulseTargets
});
export function steamPulseTargets(f,hasLineOfSight=()=>true){
 const stats=steamPulseStats(f.weapon?.level),pos=f.pos;
 return (f.enemies||[]).filter(e=>e.hp>0&&Math.hypot(e.x-pos.x,e.y-pos.y)<stats.range&&hasLineOfSight(pos,e))
   .sort((a,b)=>Math.hypot(a.x-pos.x,a.y-pos.y)-Math.hypot(b.x-pos.x,b.y-pos.y)||String(a.id).localeCompare(String(b.id)))
   .slice(0,stats.targets);
}
export function startSteamMist(f){
 const i=lvIndex(f.weapon?.level);
 f.steamMist={x:f.pos.x,y:f.pos.y,radius:STEAM_COMBAT.mistRadius[i],ttl:STEAM_COMBAT.mistDuration[i],
  duration:STEAM_COMBAT.mistDuration[i],level:f.weapon?.level||1};
 return f.steamMist;
}
export function steamMistContains(field,enemy){
 return !!field&&field.ttl>0&&Math.hypot(enemy.x-field.x,enemy.y-field.y)<=field.radius;
}
export function stepSteamMist(f,dt){
 if(!f.steamMist)return;
 f.steamMist.ttl=Math.max(0,f.steamMist.ttl-Math.max(0,dt));
 if(!f.steamMist.ttl)f.steamMist=null;
}

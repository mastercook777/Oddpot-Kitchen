// v0.8.4: one data source for melee wind-up, striking reach and telegraph.
// All durations are simulated seconds; no wall clock or scene-dependent hit boxes.
export const MELEE_PROFILES={
 chicken:{windup:.68,reach:1.02,trigger:1.13,arcDeg:110,dash:.10,recover:.24,accent:'#ffd18a'},
 boar:{windup:.88,reach:1.35,trigger:1.38,arcDeg:85,dash:.32,recover:.34,accent:'#ff9678'},
 steam_crab:{windup:.75,reach:1.08,trigger:1.20,arcDeg:125,dash:.16,recover:.28,accent:'#a3eff2'}
};
export function meleeProfile(kind){return MELEE_PROFILES[kind]||null;}
export function meleeAttackWouldHit(enemy,playerPos){
 const p=meleeProfile(enemy?.kind);
 if(!p||!enemy?.aim||!playerPos)return false;
 const dx=playerPos.x-enemy.x,dy=playerPos.y-enemy.y,dist=Math.hypot(dx,dy);
 if(dist>p.reach||dist<.00001)return false;
 const ax=enemy.aim.x-(enemy.attackOrigin?.x??enemy.x),ay=enemy.aim.y-(enemy.attackOrigin?.y??enemy.y);
 const al=Math.hypot(ax,ay);
 if(al<.00001)return true;
 const dot=(dx*ax+dy*ay)/(dist*al);
 return dot>=Math.cos(p.arcDeg*Math.PI/360);
}
export function meleeWindupProgress(enemy){
 const max=enemy?.windupTotal||meleeProfile(enemy?.kind)?.windup||.7;
 return Math.max(0,Math.min(1,1-Math.max(0,enemy?.warning||0)/max));
}

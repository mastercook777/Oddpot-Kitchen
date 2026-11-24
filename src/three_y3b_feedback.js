// Y3b visual-only hit response. Simulation already implements recoil and local hit-stop.
const clamp=x=>Math.min(1,Math.max(0,x));
export function enemyHitVisual(e){
 const h=e.hitResponse,ratio=h?.ttl>0?clamp(h.ttl/Math.max(.001,h.total)):0;
 const pulse=ratio>0?Math.sin(Math.PI*Math.min(1,(1-ratio)*1.25+.14)):clamp((e.hurtFx||0)/.36)*.55;
 const heavy=e.isBoss?.38:e.kind==='boar'?.60:1;
 const a=pulse*heavy,death=e.hp<=0?Math.max(.05,clamp((e.deathFx||0)/.45)):1;
 return {sx:death*(1+.16*a),sy:death*(1-.22*a),sz:death*(1+.09*a),tilt:a*.16,flash:ratio>.62?(ratio-.62)/.38:0};
}
export function pickupVisual(n,t){const target=n.key==='target',rare=String(n.key||'').startsWith('boss-reward-'),event=n.type==='event';return {color:rare?'#e3a9ff':target?'#ffe4a0':event?'#a8e1e3':'#d1ed9b',radius:rare?.43:target?.37:.29,opacity:(target||rare?.78:.47)+Math.sin(t*3+(n.x||0))*.08,bob:event?0:.035+Math.sin(t*3+(n.x||0))*.025};}

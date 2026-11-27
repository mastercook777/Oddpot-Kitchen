// CB2-R1: workshop-only adjudication based on actual recorded ingredient/action heat.
import {ING} from './data.js';
import {liveHeatEvidence,liveIngredientState} from './cooking_v063.js?v=cb2r1';
import {grillHeatBounds} from './grill_cooking_v014b.js?v=cb2r1';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
const spread=xs=>Math.max(...xs)-Math.min(...xs);
const smooth=(v,lo,hi)=>{const n=clamp((v-lo)/(hi-lo));return n*n*(3-2*n)};
const band=(x,lo,hi,fadeLo,fadeHi)=>smooth(x,lo-fadeLo,lo)*(1-smooth(x,hi,hi+fadeHi));
export function hash(str,seed=2166136261){let h=seed>>>0;for(const c of String(str)){h=Math.imul(h^c.charCodeAt(0),16777619)>>>0}return h}
export function seeded(seed,txn,domain){let h=hash(domain,hash(txn,seed));return ()=>{h=(h+0x6D2B79F5)>>>0;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
function failure(result){
 const states=result.doneness||[],ids=result.ids||[];
 const missing=ids.find(id=>!states.some(d=>d.id===id)||states.some(d=>d.id===id&&['未下锅','未穿串','待下锅'].includes(d.label)));
 const burnt=states.find(d=>d.label==='焦糊'),raw=states.find(d=>d.label!=='熟透');
 if(!result.recipeId)return {status:'未知组合',tip:'这几种食材还没有形成可辨认的料理。'};
 if(missing)return {status:'漏料失败',tip:(ING[missing]?.name||'食材')+'还没有加入料理。'};
 if(burnt)return {status:'焦糊失败',tip:(ING[burnt.id]?.name||'食材')+'已经焦糊，应该更早离火。'};
 if(raw)return {status:'夹生失败',tip:(ING[raw.id]?.name||'食材')+(result.vessel==='GRILL'?'还有一面没有烤透。':'还没有完全熟透。')};
 if(!result.sellable||!ids.length||states.length!==ids.length)return {status:'料理失败',tip:'这锅料理还没有完成。'};
 return null;
}
// Evaluate actions at their actual time, excluding the action itself from the heat reading.
function liveEvidence(r){
 const drops=r.events,actions=r.actions||[],t=r.duration,v=r.vessel;
 const hs=drops.map(d=>liveHeatEvidence(d,t,actions,v));
 // The preferred range uses actual readiness and actual burn limits, not a new simulation.
 const progress=hs.map(h=>clamp(Math.max((h.age-h.age/Math.max(1,h.ratio))/Math.max(.1,h.ageLimit-h.age/Math.max(1,h.ratio)),h.dense?(h.ratio-1)/2.4:0)));
 const heat=mean(progress.map(p=>.32+.68*band(p,.10,.36,.14,.57)));
 // Timing coordination: close enough readiness; gentle early aromatics and late light ingredients both work.
 const ready=drops.map(d=>{let l=d.t,h=t;for(let i=0;i<16;i++){const m=(l+h)/2;const prior=actions.filter(a=>a.t<=m);if(liveIngredientState(d,m,prior,v)==='熟透')h=m;else l=m}return h});
 const gap=spread(ready),window=v==='POT'||v==='STEAM'?5.5:4.5;
 const coordination=.25+.75*(1-smooth(gap,1.1,window+2));
 const grades=actions.map(a=>{
  const involved=drops.filter(d=>a.with?.includes(d.id)&&d.t<=a.t),prior=actions.filter(x=>x.t<a.t);
  const ratios=involved.map(d=>liveHeatEvidence(d,a.t,prior,v).ratio);
  const coverage=involved.length/drops.length;
  let timing=0;
  if(a.type==='flip'||a.type==='toss')timing=band(mean(ratios),.30,1.45,.30,1.10);
  else if(a.type==='gentle')timing=band(mean(ratios),.25,1.35,.25,1.15);
  else if(a.type==='reduce')timing=band(mean(ratios),.65,1.95,.55,1.25);
  else if(a.type==='seal')timing=1-smooth(mean(ratios),.60,1.6);
  else if(a.type==='vent'){const seal=actions.find(x=>x.type==='seal');timing=seal?band(a.t-seal.t,2,8,2,5)*band(mean(ratios),.65,2.25,.65,1.4):0}
  return {type:a.type,grade:clamp(timing*(.35+.65*coverage)),early:mean(ratios)<.35};
 });
 // A good technique is enough; optional extra technique is not a checklist.
 let tech=.12;
 if(grades.length){const best=Math.max(...grades.map(x=>x.grade)),avg=mean(grades.map(x=>x.grade));tech=.12+.88*(.8*best+.2*avg)}
 const weak=grades.slice().sort((a,b)=>a.grade-b.grade)[0];
 const tips={coord:'不同食材的熟化速度不太一致，试试调整投料间隔。',tech:!grades.length?'试着在烹饪过程中运用一种合适的技法。':weak?.early?'食材还没充分受热，技法或许可以稍晚一些。':'技法的时机还有改善空间，留意锅中食材的状态。',heat:mean(progress)>.35?'料理已经熟了，再早一些起锅或许会更鲜嫩。':'食材刚刚熟透，再稍微融合一下或许会更好。'};
 return {coordination,tech,heat,tips};
}
function grillEvidence(r){
 const faces=r.facts.frontBack||[],heatSamples=faces.flatMap(f=>{const {low,high}=grillHeatBounds(f.id);return [f.front,f.back].map(x=>clamp((x-low)/(high-low)))});
 const heat=mean(heatSamples.map(x=>.25+.75*band(x,.12,.43,.15,.5)));
 const balance=mean(faces.map(f=>1-smooth(Math.abs(f.front-f.back),.55,4.6)));
 // Different ingredients share a fire; score compatible heat windows, not a recipe-index skewer answer.
 const coordination=.30+.70*(1-smooth(spread(heatSamples),.18,.80));
 const turn=r.actions.find(a=>a.type==='turn'),brush=r.actions.find(a=>a.type==='brush');
 let brushGrade=0;if(turn&&brush){const gap=brush.t-turn.t;brushGrade=band(gap,.35,2.7,.35,2.5)}
 const tech=clamp(.14+.77*balance+.09*brushGrade);
 return {coordination,tech,heat,tips:{coord:'不同食材的火候差距有些大，可以尝试另一种火区。',tech:balance<.75?'两面都熟了，但火候不够均衡，留意翻面的时机。':'香料还可以更好地附着在烤串上。',heat:mean(heatSamples)>.42?'烤串有些过火，试着早一点离开炭火。':'烤串刚刚熟透，可以再给它一点形成焦香的时间。'}};
}
export function judgeCooking(result,seed,txn){
 const f=failure(result);if(f)return {baseTier:0,...f};
 const e=result.vessel==='GRILL'?grillEvidence(result):liveEvidence(result);
 const scores=[e.coordination,e.tech,e.heat],raw=100*(.30*scores[0]+.35*scores[1]+.35*scores[2]);
 const excellent=scores.filter(x=>x>=.68).length>=2&&scores.every(x=>x>=.40);
 const random=seeded(seed,txn,'cb2r1-quality')();
 // Only within three points of thresholds can RNG affect adjacent bands.
 const score=raw+(random*6-3);
 const baseTier=score>=75&&excellent?3:score>=55?2:1;
 const key=['coord','tech','heat'][scores.indexOf(Math.min(...scores))];
 return {baseTier,status:'成功',tip:baseTier<3?e.tips[key]:null,internal:{coordination:e.coordination,tech:e.tech,heat:e.heat,raw,score,excellent}};
}

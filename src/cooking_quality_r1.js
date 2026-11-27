// CB2-R1: workshop-only adjudication based on actual recorded ingredient/action heat.
import {ING} from './data.js';
import {liveHeatEvidence,liveIngredientState} from './cooking_v063.js?v=cb2r1c';
import {grillHeatBounds,grillHeat} from './grill_cooking_v014b.js?v=cb2r1c';
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
 const hs=drops.map(d=>liveHeatEvidence(d,t,actions,v,!!r.baseOnly));
 // The preferred range uses actual readiness and actual burn limits, not a new simulation.
 const progress=hs.map(h=>clamp(Math.max((h.age-h.age/Math.max(1,h.ratio))/Math.max(.1,h.ageLimit-h.age/Math.max(1,h.ratio)),h.dense?(h.ratio-1)/2.4:0)));
 const heat=mean(progress.map(p=>.32+.68*band(p,.10,.36,.14,.57)));
 // Timing coordination: close enough readiness; gentle early aromatics and late light ingredients both work.
 const ready=drops.map(d=>{let l=d.t,h=t;for(let i=0;i<16;i++){const m=(l+h)/2;const prior=actions.filter(a=>a.t<=m);if(liveIngredientState(d,m,prior,v,!!r.baseOnly)==='熟透')h=m;else l=m}return h});
 const gap=spread(ready),window=v==='POT'||v==='STEAM'?5.5:4.5;
 const coordination=.25+.75*(1-smooth(gap,1.1,window+2));
 const grades=actions.map(a=>{
  const involved=drops.filter(d=>a.with?.includes(d.id)&&d.t<=a.t),prior=actions.filter(x=>x.t<a.t);
  const ratios=involved.map(d=>liveHeatEvidence(d,a.t,prior,v,!!r.baseOnly).ratio);
  const coverage=involved.length/drops.length;
  let timing=0;
  // Timing is judged on physical contact before any button heat bonus.
  // A short-lived aromatic must not make a barely heated main ingredient look ready.
  if(v==='WOK'||v==='POT'){
   const natural=involved.map(d=>liveHeatEvidence(d,a.t,[],v,!!r.baseOnly).ratio);
   const recent=involved.length?Math.min(...involved.map(d=>a.t-d.t)):0;
   const contact=smooth(recent,v==='WOK'?.45:.55,v==='WOK'?1.55:1.85);
   const window=a.type==='flip'?[.30,1.65,.30,1.65]:a.type==='toss'?[.50,1.8,.50,1.65]:a.type==='gentle'?[.27,1.45,.27,1.6]:[.78,1.95,.68,1.7];
   const individual=natural.map(q=>band(q,...window));
   const slow=natural.length?Math.min(...natural):0;
   const readiness=smooth(slow,.12,a.type==='reduce'?.65:.40);
   timing=contact*readiness*(.70*mean(individual)+.30*(individual.length?Math.min(...individual):0));
  }
  else if(r.baseOnly&&v==='STEAM'){const recent=involved.length?Math.min(...involved.map(d=>a.t-d.t)):0;const window=a.type==='seal'?[.28,1.25,.28,1.5]:[.65,1.9,.6,1.5];timing=smooth(recent,.55,1.65)*smooth(Math.min(...ratios),.10,.38)*mean(ratios.map(q=>band(q,...window)));}
  else if(a.type==='seal')timing=1-smooth(mean(ratios),.60,1.6);
  else if(a.type==='vent'){const seal=actions.find(x=>x.type==='seal');timing=seal?band(a.t-seal.t,2,8,2,5)*band(mean(ratios),.65,2.25,.65,1.4):0}
  return {type:a.type,grade:clamp(timing*(.35+.65*coverage)),early:involved.some(d=>a.t-d.t<1.25)||mean(ratios)<.35};
 });
 // A good technique is enough; optional extra technique is not a checklist.
 let tech=.12;
 if(grades.length){const best=Math.max(...grades.map(x=>x.grade)),avg=mean(grades.map(x=>x.grade));tech=.12+.88*(.7*best+.3*avg)}
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
 let tech=clamp(.14+.77*balance+.09*brushGrade);
 if(r.baseOnly){
  const grades=r.actions.filter(a=>['brush','smoke'].includes(a.type)).map(a=>{
   const readings=r.ids.map(id=>{const h=grillHeat(id,a.t,[],r.facts.rate,true),{low}=grillHeatBounds(id);return (h.front+h.back)/(2*low)});
   const window=a.type==='brush'?[.55,1.4,.45,1.5]:[.35,1.05,.35,1.65];
   const contact=smooth(a.t,.7,2.25),remaining=smooth(r.duration-a.t,.15,a.type==='brush'?1.15:1.65);
   return contact*remaining*(.8*mean(readings.map(q=>band(q,...window)))+.2*Math.min(...readings.map(q=>band(q,...window))));
  });
  tech=grades.length?.12+.88*(.7*Math.max(...grades)+.3*mean(grades)):.12;
 }
 return {coordination,tech,heat,tips:{coord:'不同食材的火候差距有些大，可以尝试另一种火区。',tech:r.baseOnly?(r.actions.length?'酱汁或烟香还没有充分融入食材，留意施展技法的时机。':'试试在食材受热后刷酱或熏香。'):balance<.75?'两面都熟了，但火候不够均衡，留意翻面的时机。':'香料还可以更好地附着在烤串上。',heat:mean(heatSamples)>.42?'烤串有些过火，试着早一点离开炭火。':'烤串刚刚熟透，可以再给它一点形成焦香的时间。'}};
}
export function judgeCooking(result,seed,txn){
 const f=failure(result);if(f)return {baseTier:0,...f};
 const e=result.vessel==='GRILL'?grillEvidence(result):liveEvidence(result);
 const scores=[e.coordination,e.tech,e.heat],raw=100*(.30*scores[0]+.35*scores[1]+.35*scores[2]);
 const excellent=scores.filter(x=>x>=.68).length>=2&&scores.every(x=>x>=.40)&&(!(result.baseOnly||['WOK','POT'].includes(result.vessel))||e.tech>=.65);
 const random=seeded(seed,txn,'cb2r1-quality')();
 // Only within three points of thresholds can RNG affect adjacent bands.
 const score=raw+(random*6-3);
 const baseTier=score>=75&&excellent?3:score>=55?2:1;
 const key=['coord','tech','heat'][scores.indexOf(Math.min(...scores))];
 return {baseTier,status:'成功',tip:baseTier<3?e.tips[key]:null,internal:{coordination:e.coordination,tech:e.tech,heat:e.heat,raw,score,excellent}};
}

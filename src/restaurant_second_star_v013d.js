// Second-star chapter milestone uses the original single service ledger and real orders.
// No free guests, rewards, or offline-only shortcut is created in this module.
export const SECOND_STAR_TARGETS={1:70,2:84};
const secondClamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number(n)||0));
const dayKey=s=>s.cycle+'-'+s.day;
const absoluteDay=s=>(s.cycle-1)*3+s.day;
export function ensureSecondAppraisal(s){
 const p=s.chapterProgress??={stars:0};
 p.secondAppraisal??={stage:1,requestDay:null,lastAttemptDay:null,stage1Result:null,lastScore:null};
 const q=p.secondAppraisal;
 q.stage=q.stage===2?2:1;q.requestDay??=null;q.lastAttemptDay??=null;
 q.stage1Result??=null;q.lastScore??=null;
 return q;
}
export function secondStarAvailable(s){
 const p=s.chapterProgress||{},q=ensureSecondAppraisal(s);
 return p.stars===1&&(s.dining?.tableCount||2)>=4&&absoluteDay(s)>=7&&
  ['forecast','prep'].includes(s.phase)&&!s.service&&q.lastAttemptDay!==dayKey(s);
}
export function secondStarRequested(s){return secondStarAvailable(s)&&ensureSecondAppraisal(s).requestDay===dayKey(s);}
export function requestSecondStar(s,requested=true){
 if(!secondStarAvailable(s))return false;
 ensureSecondAppraisal(s).requestDay=requested?dayKey(s):null;return true;
}
export function scoreSecondStar(v,stage,profit,recipes={}){
 const orders=v?.orders||[],served=orders.filter(o=>o.status==='served'),total=orders.length;
 const coverage=total?Math.round(served.length*100/total):0;
 const avg=k=>served.length?Math.round(served.reduce((n,o)=>n+secondClamp(o[k]),0)/served.length):0;
 const queueEvents=(v?.events||[]).filter(e=>e.type==='queue_left'),seated=(v?.events||[]).filter(e=>e.type==='queue_seated');
 const waitMean=seated.length?seated.reduce((n,e)=>n+(e.seconds||0),0)/seated.length:0;
 const queueScore=secondClamp(Math.round(100-queueEvents.length*18-waitMean*1.1));
 const earnings=served.length?secondClamp(Math.round(45+profit/served.length*5)):0;
 const diversity=new Set(served.map(o=>o.recipeId).filter(Boolean)).size;
 const actualWork=new Set((v?.events||[]).filter(e=>e.type==='helper_finished'||e.type==='waiter_pickup').map(e=>e.order)).size;
 const teamwork=secondClamp(65+Math.min(35,actualWork*7));
 const satisfaction=avg('sat'),craft=avg('quality');
 const diversityScore=diversity>=3?100:diversity===2?95:diversity===1?35:0;
 const score=stage===1?Math.round(coverage*.45+queueScore*.25+earnings*.30):
   Math.round(satisfaction*.40+craft*.25+diversityScore*.20+teamwork*.15);
 const target=SECOND_STAR_TARGETS[stage]||72;
 const passed=served.length>=6&&coverage>=40&&score>=target&&(stage===1||diversity>=2);
 const metrics=stage===1?{coverage,queueScore,earnings}:{satisfaction,craft,diversity:diversityScore,teamwork};
 const weakest=Object.entries(metrics).sort((a,b)=>a[1]-b[1])[0]?.[0]||'coverage';
 return {stage,score,target,passed,served:served.length,total,coverage,profit,queueAbandoned:queueEvents.length,
  satisfaction,craft,diversity,teamwork,queueScore,earnings,weakest};
}

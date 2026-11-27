// First chapter milestone. Service orders are the sole scoring evidence.
export const FIRST_STAR_TARGET=72;
export const FOURTH_TABLE_COST=220;
export const FIRST_STAR_CHAPTER='hearth';
const starClamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number(n)||0));
export const restaurantDay=s=>(s.cycle-1)*3+s.day;
export const restaurantDayKey=s=>s.cycle+'-'+s.day;

export function ensureChapterProgress(s){
 const p=s.chapterProgress??={chapterId:FIRST_STAR_CHAPTER,stars:0,requestDay:null,lastAttemptDay:null,lastScore:null};
 p.chapterId=FIRST_STAR_CHAPTER;
 p.stars=Math.max(0,Math.min(3,Number(p.stars)||0));
 p.requestDay??=null;p.lastAttemptDay??=null;p.lastScore??=null;
 s.chapterProgress=p;
 return p;
}
export function firstStarAvailable(s){
 const p=ensureChapterProgress(s);
 return p.stars===0&&restaurantDay(s)>=4&&
  ['forecast','prep'].includes(s.phase)&&!s.service&&p.lastAttemptDay!==restaurantDayKey(s);
}
export function firstStarRequested(s){
 return firstStarAvailable(s)&&ensureChapterProgress(s).requestDay===restaurantDayKey(s);
}
export function requestFirstStar(s,requested=true){
 if(!firstStarAvailable(s))return false;
 ensureChapterProgress(s).requestDay=requested?restaurantDayKey(s):null;
 return true;
}
export function scoreFirstStar(orders=[]){
 const all=Array.isArray(orders)?orders:[],served=all.filter(o=>o.status==='served');
 const avg=key=>served.length?Math.round(served.reduce((n,o)=>n+starClamp(o[key]),0)/served.length):0;
 const coverage=all.length?Math.round(served.length/all.length*100):0;
 const satisfaction=avg('sat'),fit=avg('fit'),craft=avg('quality');
 const score=Math.round(coverage*.35+satisfaction*.35+fit*.15+craft*.15);
 const passed=all.length>0&&coverage>=Math.ceil(200/3)&&score>=FIRST_STAR_TARGET;
 const weakest=Object.entries({coverage,satisfaction,fit,craft}).sort((a,b)=>a[1]-b[1])[0]?.[0]||'coverage';
 return {coverage,satisfaction,fit,craft,score,target:FIRST_STAR_TARGET,served:served.length,total:all.length,passed,weakest};
}

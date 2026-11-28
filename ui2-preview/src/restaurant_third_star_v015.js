// The feast occupies ordinary arrival slots. Every verdict comes from a real order.
const thirdDayKey=s=>`${s.cycle}-${s.day}`;
export const FEAST_GUESTS=['family','gardener','critic'];
export const FEAST_TARGETS={satisfaction:75,served:6,profit:0};
export function ensureThirdAppraisal(s){
 const p=s.chapterProgress??={chapterId:'hearth',stars:0};
 p.thirdAppraisal??={requestDay:null,lastAttemptDay:null,lastResult:null};
 return p.thirdAppraisal;
}
export function thirdStarAvailable(s){
 const q=ensureThirdAppraisal(s);
 return s.chapterProgress?.stars===2&&['forecast','prep'].includes(s.phase)&&
  !s.service&&q.lastAttemptDay!==thirdDayKey(s);
}
export function thirdStarRequested(s){return thirdStarAvailable(s)&&ensureThirdAppraisal(s).requestDay===thirdDayKey(s)}
export function requestThirdStar(s,requested=true){
 if(!thirdStarAvailable(s))return false;
 ensureThirdAppraisal(s).requestDay=requested?thirdDayKey(s):null;
 return true;
}
export function feastSeats(count){
 const positions=[1,Math.floor(count/2),Math.max(2,count-2)];
 return positions.map((index,i)=>({index,segment:FEAST_GUESTS[i]}));
}
export function scoreThirdStar(orders,judgeIds,profit){
 const verdicts=judgeIds.map((id,i)=>{
  const order=orders.find(o=>o.id===id);
  const served=order?.status==='served';
  const sat=served?Math.round(order.sat||0):null;
  const passed=served&&sat>=FEAST_TARGETS.satisfaction;
  const reason=passed?'满意完成':!served?order?.status==='left'?'等位或出餐超时':order?.status==='rejected'?'缺料未能接单':'未完成上菜':'口味或出品未达标';
  return {id,segment:order?.segment||FEAST_GUESTS[i],recipeId:order?.recipeId||null,sat,passed,reason};
 });
 const served=orders.filter(o=>o.status==='served').length;
 const recognized=verdicts.filter(v=>v.passed).length;
 return {verdicts,recognized,served,profit,
  passed:recognized>=2&&served>=FEAST_TARGETS.served&&profit>=FEAST_TARGETS.profit};
}

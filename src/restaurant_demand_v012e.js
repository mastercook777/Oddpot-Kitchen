// v0.12-E · demand is earned by reputation and the first star, NOT by buying seats.
// Independent of table count: comparing 3/4 tables uses exactly the same visitors.
export const QUEUE_PATIENCE_SECONDS=24;
export const NATURAL_STAR_GUEST_CAP=19;
export function starWordOfMouthBoost(stars,pressure,reputation){
 if((Number(stars)||0)<1)return 0;
 return 2+(['矿工收工','集市热闹夜'].includes(pressure)?2:1)+(reputation>=10?1:0);
}
export function naturalStarAttendance(baseline,stars,pressure,reputation){
 const boost=starWordOfMouthBoost(stars,pressure,reputation);
 return boost?Math.min(NATURAL_STAR_GUEST_CAP,baseline+boost):baseline;
}
// Star word-of-mouth brings a lunch-to-dinner surge into the middle wave.
// Original three-wave distribution stays unchanged before earning the star.
export function serviceArrivalWave(i,baseCount,starred){
 if(!starred)return Math.min(2,Math.floor(i*3/baseCount));
 const first=Math.max(1,Math.floor(baseCount*.34));
 const second=Math.max(first+1,Math.floor(baseCount*.79));
 return i<first?0:i<second?1:2;
}
export function serviceArrivalSecond(wave,waveIndex,spacing,starred){
 if(!starred)return wave*21+waveIndex*spacing;
 // The rush lands in a short window; chairs are a real capacity constraint.
 return wave*21+waveIndex*(wave===1?1:Math.min(2,spacing));
}
export function outdoorQueueCount(orders,second){
 return orders.filter(o=>o.status==='waiting'&&o.arrival<=second).length;
}
export function outdoorQueueExpired(order,second){
 return order.status==='waiting'&&order.arrival<=second&&second-order.arrival>=QUEUE_PATIENCE_SECONDS;
}
export function queueServiceReport(shift){
 const enter=(shift?.events||[]).filter(e=>e.type==='queue_seated');
 const left=(shift?.events||[]).filter(e=>e.type==='queue_left');
 return {peak:shift?.queuePeak||0,waited:enter.length,abandoned:left.length,
  waitSeconds:enter.reduce((n,e)=>n+(e.seconds||0),0),maxWaitSeconds:enter.reduce((n,e)=>Math.max(n,e.seconds||0),0),
  remaining:(shift?.orders||[]).filter(o=>o.status==='waiting').length};
}

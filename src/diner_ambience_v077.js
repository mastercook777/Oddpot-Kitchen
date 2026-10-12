// v0.7.7 - transient, state-grounded dining dialogue for real orders.
// Data only: never mutate gameplay, advance clocks or spend resources.
// Max one speech per table, max two across the entire restaurant.
import {RECIPES} from './data.js?v=0.6.3';

const clampSpeech=x=>Math.max(0,Math.min(1,x));
const speechWhen=(t,start,duration)=>Number.isFinite(start)&&t>=start&&t<start+duration;
const waiting=new Set(['queued','cooking','pickup','carried','delivering']);
const intro=(name)=>'来一份'+name+'！';
function displayName(order){
 const name=RECIPES[order.recipeId]?.name||'招牌菜';
 return Array.from(name).length>7?Array.from(name).slice(0,7).join(''):name;
}
export function diningSpeechCue(order,t){
 if(!order||!Number.isFinite(t)||order.tableId==null||!Number.isInteger(order.tableId))return null;
 const o=order;
 const cue=(content,kind,priority,start,length)=>({
  id:o.id,tableId:o.tableId,seatId:o.seatId||0,text:content,kind,priority,reviewType:o.reviewType||null,
  phase:clampSpeech((t-start)/length),elapsed:t-start
 });
 // A real disappointment/review always outranks decorative chatter.
 if(o.status==='review'&&speechWhen(t,o.reviewAt,2.1))
  return cue(o.reviewText||'谢谢招待！','review',9,o.reviewAt,2.1);
 if(o.status==='served'&&speechWhen(t,o.reviewedAt,.8))
  return cue(o.reviewText||'欢迎下次！','review',8,o.reviewedAt,.8);
 if(o.status==='left'&&speechWhen(t,o.leftAt,1.8))
  return cue('等太久了…','upset',9,o.leftAt,1.8);
 if(o.status==='rejected'&&speechWhen(t,o.leftAt,1.8))
  return cue('没有想吃的…','upset',9,o.leftAt,1.8);

 if(o.status==='eating'&&speechWhen(t,o.landedAt,1.8))
  return cue('我开动啦！','eating',7,o.landedAt,1.8);

 if(o.status==='ordering'&&speechWhen(t,o.seatedAt,1.6))
  return cue('看看今天吃什么…','order',4,o.seatedAt,1.6);

 if(waiting.has(o.status)){
  const remaining=o.patience-(t-o.arrival);
  // The warning occurs when the actual remaining patience enters danger,
  // no fake mood/happiness values are generated.
  if(remaining<=9&&remaining>0){
   const startedAt=o.arrival+o.patience-9;
   if(speechWhen(t,startedAt,2.4))
    return cue(remaining<=5?'菜还没好吗？':'等得有点久啦…','upset',8,Math.max(startedAt,t-2.4),2.4);
  }
  if(o.status==='delivering'&&speechWhen(t,o.deliveryAt,1.8))
   return cue('我的菜来啦！','arrival',6,o.deliveryAt,1.8);
  if(o.status==='carried'&&speechWhen(t,o.pickupAt,2.6))
   return cue('是我的那份吗？','arrival',5,o.pickupAt,2.6);
  if(o.status==='pickup'&&speechWhen(t,o.pickupAt,1.8))
   return cue('闻着好香呀！','arrival',5,o.pickupAt,1.8);
  if(o.status==='queued'&&speechWhen(t,o.orderedAt,2.1))
   return cue(intro(displayName(o)),'order',6,o.orderedAt,2.1);
  if(o.status==='cooking'&&speechWhen(t,o.started+3,1.65))
   return cue('厨房好香呀！','ambient',2,o.started+3,1.65);
 }
 return null;
}
// Deterministic arbitration. Same-table patrons never stack, and no
// random UI content is saved to the game or re-rolled on each animation frame.
export function selectDiningSpeech(orders,t,max=2){
 if(!Array.isArray(orders)||!Number.isFinite(t)||max<=0)return [];
 const perTable=new Map();
 for(const o of orders){
  const cue=diningSpeechCue(o,t);
  if(!cue)continue;
  const current=perTable.get(cue.tableId);
  if(!current||cue.priority>current.priority||
    (cue.priority===current.priority&&((Math.floor(t/1.3)+cue.tableId)%2===cue.seatId)))
    perTable.set(cue.tableId,cue);
 }
 const ranked=[...perTable.values()].sort((a,b)=>b.priority-a.priority||a.tableId-b.tableId);
 // Avoid dialogue fatigue: two tables may speak simultaneously only if
 // a meaningful event (not small talk) is happening at both.
 if(ranked.length>1&&ranked[0].priority<7)return ranked.slice(0,1);
 return ranked.slice(0,Math.min(2,max));
}
export function speechOpacity(cue){
 if(!cue)return 0;
 // Gentle short fade at intro/outro, no pulsing, blinking or scrolling text.
 const p=cue.phase||0;
 return clampSpeech(Math.min(1,p*7,(1-p)*7));
}
export function diningBubbleLines(words,maxChars=16){
 const chars=Array.from(String(words||'')).slice(0,maxChars);
 if(Array.from(String(words||'')).length>maxChars)chars.splice(Math.max(0,maxChars-1),1,'…');
 const midpoint=chars.length>9?Math.ceil(chars.length/2):chars.length;
 return [chars.slice(0,midpoint).join(''),chars.slice(midpoint).join('')].filter(Boolean);
}

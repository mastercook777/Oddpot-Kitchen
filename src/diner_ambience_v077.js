// v0.7.7 - transient, state-grounded dining dialogue for real orders.
// Data only: never mutate gameplay, advance clocks or spend resources.
// Max one speech per table, max two across the entire restaurant.
import {RECIPES,ING} from './data.js?v=0.6.3';

const clampSpeech=x=>Math.max(0,Math.min(1,x));
const speechWhen=(t,start,duration)=>Number.isFinite(start)&&t>=start&&t<start+duration;
const speechWaiting=new Set(['queued','cooking','pickup','carried','delivering']);
// Four fantastical guest factions: dwarves, mushroom kin, slime neighbors and ghost critics.
// Choices use only order-id and cue name: save/load/RAF cannot re-roll dialogue.
export const DINER_VOICES={
 adventurer:{
  order:['矿洞干活累！来份喷火肉！','铁角头盔都闻香啦！','这餐比龙鳞还扎实吗？'],
  choose:['闻着香，先瞧菜单！','探险前得吃顿好的。','战利品不如美食香！'],
  kitchen:['锅里可真热闹！','这火候有冒险味！','香味比藏宝图靠谱！'],
  ready:['哇，开饭喽！','香气都飘到我这了！','这份闻着够劲！'],
  delivery:['快端来，我饿坏了！','终于轮到我了！','好家伙，开饭！'],
  eat:['吃饱了继续出发！','这口能打十只怪！','好吃，体力回满！'],
  hurry:['老板！赶时间呢！','我的菜还没好吗？','快些，我要上路！'],
  furious:['不等了，冒险要紧！','饿着肚子怎么出发！','再不来，我走啦！'],
  stockout:['备料没了？白跑一趟！','没食材还怎么开饭！','白闻了半天香味！'],
  mismatch:['菜单里没硬菜啊…','竟然没有辣味料理？','先去别处吃饱吧。']
 },
 family:{
  order:['小蘑菇们想喝热汤。','孩子的菌帽都馋歪啦！','麻烦不要把我们煮了呀。'],
  choose:['看看有什么家常菜。','小朋友也想点菜呢。','今晚一起吃顿好的。'],
  kitchen:['孩子闻到香味啦。','炖得香香的真好。','厨房看起来好忙呀。'],
  ready:['闻着就很温暖！','热乎乎的，真好呀。','孩子都望向厨房了。'],
  delivery:['终于上菜啦！','来啦，大家准备吃！','孩子等着开动呢。'],
  eat:['大家慢慢吃呀。','这味道好像家里做的。','吃饭时间最幸福。'],
  hurry:['孩子都等饿了…','还要等多久呀？','小朋友有点着急。'],
  furious:['孩子饿坏了，我们走。','实在不能再等了。','抱歉，我们先走了。'],
  stockout:['没食材了？真遗憾。','孩子想吃的做不了呀。','白期待了一晚上…'],
  mismatch:['没有适合孩子的菜。','想找些温和的菜呀。','菜单不太适合全家。']
 },
 regular:{
  order:['咕噜！老板，还有菌锅舞吗？','史莱姆也能吃辣吗？','闻着香就弹进来啦！'],
  choose:['街坊邻居又来捧场。','今儿菜单有新花样？','闻着香就进来了。'],
  kitchen:['老板今天手挺忙呀。','听着锅声就有食欲。','熟悉的香味回来了！'],
  ready:['这味儿我熟！','菜快好了吧，嘿嘿。','嘿，还是这股香！'],
  delivery:['来喽，正好饿了！','多谢老板亲自端菜。','这盘看着挺不错！'],
  eat:['还是这儿吃着舒坦。','改天带朋友一起来。','嗯，就是这个味儿！'],
  hurry:['今儿可等得有点久。','老板，别忘了我啊！','隔壁桌都上菜啦…'],
  furious:['街坊也不能一直等！','今天这服务不太行！','走了，下次再说吧。'],
  stockout:['咦，这菜卖完啦？','备料不够可惜了。','下回记得多进些货！'],
  mismatch:['今天没我爱吃的呀。','想念那道招牌菜了。','菜单换得有点突然。']
 },
 critic:{
  order:['生前没吃到过这样的菜。','这股香气竟穿透灵界。','让我品鉴怪味的真正奥义。'],
  choose:['今晚来做一次测评。','菜单搭配值得研究。','先观察一下出餐效率。'],
  kitchen:['锅气处理值得一看。','节奏，也是厨艺的一环。','这火候有些看头。'],
  ready:['香气层次出来了。','闻起来值得期待。','收汁倒是很有章法。'],
  delivery:['上菜时机很重要。','终于进入品鉴环节。','摆盘细节我会留意。'],
  eat:['嗯，值得细品。','先尝尝香气和口感。','味道还需要细看。'],
  hurry:['等待也是服务的评分。','出餐效率需要改进。','计时已超过预期。'],
  furious:['这种等待无法接受。','服务失序，测评结束。','我要如实记录这次体验。'],
  stockout:['缺料说明备货不足。','菜都做不了，谈何品质？','库存管理也要评分。'],
  mismatch:['菜单的平衡仍可改进。','缺少值得测评的组合。','今晚没有目标菜品。']
 }
};
function speechHash(str){
 let h=2166136261;
 for(const ch of String(str)){h^=ch.codePointAt(0);h=Math.imul(h,16777619)}
 return h>>>0;
}
function speechVariant(o,event,lines){
 if(!lines?.length)return '';
 return lines[speechHash(String(o.id)+'|'+(o.segment||'regular')+'|'+event)%lines.length];
}
function speechName(o){
 const name=RECIPES[o.recipeId]?.name||'招牌菜';
 return Array.from(name).slice(0,7).join('');
}
function speechMissingFood(o){
 const missing=o.missingIngredients?.find(id=>ING[id])||null;
 return missing?ING[missing].name:null;
}
function speechPerson(o){return DINER_VOICES[o.segment]||DINER_VOICES.regular}
function speechCue(o,t,text,kind,priority,start,duration){
 return {id:o.id,tableId:o.tableId,seatId:o.seatId||0,text,kind,priority,
  reviewType:o.reviewType||null,phase:clampSpeech((t-start)/duration),elapsed:t-start};
}
export function diningSpeechCue(o,t){
 if(!o||!Number.isFinite(t)||!Number.isInteger(o.tableId))return null;
 const v=speechPerson(o), mk=(words,key,kind,p,start,length)=>{
  const phrase=speechVariant(o,key,words);
  return speechCue(o,t,phrase,kind,p,start,length);
 };
 if(o.status==='review'&&speechWhen(t,o.reviewAt,2.4))
  return speechCue(o,t,o.reviewText||'谢谢招待！','review',10,o.reviewAt,2.4);
 if(o.status==='served'&&speechWhen(t,o.reviewedAt,.9))
  return speechCue(o,t,o.reviewText||'感谢招待！','review',9,o.reviewedAt,.9);
 if(o.status==='left'&&speechWhen(t,o.leftAt,2.5)){
  const key=o.leftReason==='营业结束'?'closing':'furious';
  const phrases=key==='closing'?['这么晚了，改天再来。','今天只好先走啦。']:v.furious;
  return mk(phrases,key,'upset',10,o.leftAt,2.5);
 }
 if(o.status==='rejected'&&speechWhen(t,o.leftAt,2.5)){
  if(o.rejectReason==='食材不足'){
   const ingredient=speechMissingFood(o);
   return ingredient?
    speechCue(o,t,ingredient+'都没了？','upset',10,o.leftAt,2.5):
    mk(v.stockout,'stockout','upset',10,o.leftAt,2.5);
  }
  return mk(v.mismatch,'mismatch','upset',9,o.leftAt,2.5);
 }
 if(o.status==='eating'&&speechWhen(t,o.landedAt,1.8))
  return mk(v.eat,'eat','eating',7,o.landedAt,1.8);
 if(o.status==='ordering'&&speechWhen(t,o.seatedAt,1.7))
  return mk(v.choose,'choose','choice',3,o.seatedAt,1.7);
 if(speechWaiting.has(o.status)){
  const deadline=Number(o.arrival)+Number(o.patience);
  if(Number.isFinite(deadline)){
   // One early warning and one later urgent warning, no infinite looping.
   if(speechWhen(t,deadline-5,1.65)&&t<deadline)
    return mk(v.furious,'lastcall','upset',9,deadline-5,1.65);
   if(speechWhen(t,deadline-11,2.0)&&t<deadline)
    return mk(v.hurry,'hurry','upset',8,deadline-11,2.0);
  }
  if(o.status==='delivering'&&speechWhen(t,o.deliveryAt,1.5))
   return mk(v.delivery,'delivery','arrival',6,o.deliveryAt,1.5);
  if(o.status==='carried'&&speechWhen(t,o.carriedAt??o.pickupAt,1.65))
   return mk(v.delivery,'carried','arrival',6,o.carriedAt??o.pickupAt,1.65);
  if(o.status==='pickup'&&speechWhen(t,o.pickupAt,1.65))
   return mk(v.ready,'ready','arrival',5,o.pickupAt,1.65);
  if(o.status==='queued'&&speechWhen(t,o.orderedAt,2.1))
   return speechCue(o,t,speechName(o)+'！'+speechVariant(o,'order',v.order),'order',6,o.orderedAt,2.1);
  if(o.status==='cooking'&&speechWhen(t,o.started+3,1.7))
   return mk(v.kitchen,'kitchen','ambient',2,o.started+3,1.7);
 }
 return null;
}
export function selectDiningSpeech(orders,t,max=2){
 if(!Array.isArray(orders)||!Number.isFinite(t)||max<=0)return [];
 const chosen=new Map();
 for(const o of orders){
  const cue=diningSpeechCue(o,t);
  if(!cue)continue;
  const curr=chosen.get(cue.tableId);
  if(!curr||cue.priority>curr.priority||
    cue.priority===curr.priority&&((Math.floor(t/1.3)+cue.tableId)%2===cue.seatId))
   chosen.set(cue.tableId,cue);
 }
 const ranked=[...chosen.values()].sort((a,b)=>b.priority-a.priority||a.tableId-b.tableId);
 if(ranked.length>1&&ranked[0].priority<7)return ranked.slice(0,1);
 return ranked.slice(0,Math.min(2,max));
}
// Short, event-triggered kitchen banter. It never generates/consumes resources.
// One worker speaks at a time; high-priority customer speech suppresses it.
export function selectStaffSpeech(s,t,customerCues=[]){
 const v=s?.service,crew=v?.crew;
 if(!v?.walkable||!Number.isFinite(t)||v.paused||v.breakAt||v.done)return null;
 if((customerCues||[]).some(c=>c.priority>=7)||(customerCues||[]).length>=2)return null;
 const helper=!!crew?.helper?.hired,waiter=!!crew?.waiter?.hired;
 if(!helper&&!waiter)return null;
 const events=v.events||[];
 // A prep failure gets a distinct staff acknowledgment AFTER the rejected
 // guest's urgent farewell has ended; never compete with that complaint.
 if(helper){
  const recentShortage=[...events].reverse().find(e=>e.type==='rejected'&&e.reason==='食材不足'
    &&t-e.t>=2.55&&t-e.t<4.0);
  if(recentShortage)return {id:'staff-shortage-'+recentShortage.order,staffRole:'helper',
   kind:'staff',priority:4,text:['哎呀，材料用完了！','得赶紧补补库存！','这道菜缺食材了！'][speechHash(recentShortage.order)%3],
   phase:clampSpeech((t-recentShortage.t-2.55)/1.45)};
 }
 for(let i=events.length-1;i>=Math.max(0,events.length-10);i--){
  const e=events[i],elapsed=t-e.t;
  if(elapsed<0||elapsed>=1.45)continue;
  const station=v.crew?.helper?.station===1?'POT':'WOK';
  const staff= e.type==='waiter_pickup'||e.type==='waiter_return'?'waiter':
    e.type==='started'&&e.station===station||e.type==='plate_ready'&&v.orders.some(o=>o.id===e.order&&RECIPES[o.recipeId]?.station===station)?'helper':null;
  if(staff==='helper'&&!helper||staff==='waiter'&&!waiter||!staff)continue;
  const phrases=staff==='helper'?
   e.type==='started'?['这锅我看着！','火候交给阿火！','下一盘马上来！']:
   ['新鲜出锅！','出餐台准备好啦！','香喷喷的，出锅！']:
   e.type==='waiter_pickup'?['我去送菜！','这盘交给我！','送餐出发！']:
   ['这桌送到了！','我继续招呼客人。','马上去拿下一盘！'];
  return {id:'staff-'+staff+'-'+e.t,staffRole:staff,kind:'staff',priority:3,
   text:phrases[speechHash(staff+e.type+e.order)%phrases.length],
   phase:clampSpeech(elapsed/1.45)};
 }
 if(!helper||!waiter)return null;
 // A sparse two-person exchange, each employee takes turns once.
 const cycle=t%24,role=cycle<1.35?'helper':cycle>=2&&cycle<3.35?'waiter':null;
 if(!role)return null;
 const offset=role==='helper'?0:2;
 const lines=role==='helper'?['小芽，下一盘准备好！','我看火，你看客人！','端菜交给你啦！']:
 ['收到，我去送餐！','放心，桌边我照顾！','盘子我来拿，阿火！'];
 const index=Math.floor(t/24)%lines.length;
 return {id:'staff-chat-'+role+'-'+Math.floor(t/24),staffRole:role,kind:'staff',priority:1,
  text:lines[index],phase:clampSpeech((cycle-offset)/1.35)};
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

// v0.7.7 - transient, state-grounded dining dialogue for real orders.
// Data only: never mutate gameplay, advance clocks or spend resources.
// Max one speech per table, max two across the entire restaurant.
import {RECIPES,ING} from './data.js?v=0.14.0-alpha.5';

const clampSpeech=x=>Math.max(0,Math.min(1,x));
const speechWhen=(t,start,duration)=>Number.isFinite(start)&&t>=start&&t<start+duration;
const speechWaiting=new Set(['queued','cooking','pickup','carried','delivering']);
// Four fantastical guest factions: dwarves, mushroom kin, slime neighbors and ghost critics.
// Choices use only order-id and cue name: save/load/RAF cannot re-roll dialogue.
export const DINER_VOICES={
 adventurer: {
  order: [
   "去矿井前再来份硬菜！",
   "这香味差点震歪我的头盔！",
   "老板，喷火椒多来点！"
  ],
  choose: [
   "先瞧瞧有没有硬菜。",
   "我的矿锤可以等等，肚子不行。",
   "今天的锅气闻着够劲。"
  ],
  kitchen: [
   "好家伙，这火像锻炉！",
   "锅子轰鸣，比打铁还响。",
   "再猛点火，才过瘾！"
  ],
  ready: [
   "胡子都闻香了！",
   "这盘不错，趁热上！",
   "哎哟，香味砸过来了。"
  ],
  delivery: [
   "终于能填饱肚子了！",
   "端稳些，比矿石珍贵！",
   "我已经饿得打不了铁啦。"
  ],
  eat: [
   "够劲！能再挖三层矿。",
   "这一口能扛住岩怪！",
   "胡子里都是香味！"
  ],
  hurry: [
   "矿道要封门了，老板！",
   "肚子空得能回声！",
   "再不来我得啃矿石啦！"
  ],
  furious: [
   "算了，矿井里找点吃的。",
   "这比等矿车还久！",
   "胡子都等凉了，走了。"
  ],
  stockout: [
   "喷火椒也能卖完？",
   "早说缺料，我就去抓岩兽了！",
   "白跑一趟，饿着下矿。"
  ],
  mismatch: [
   "只有清淡菜？今天要干重活。",
   "没有能顶饿的？",
   "下矿前还是想吃肉。"
  ]
 },
 family: {
  order: [
   "小菌帽们想喝热汤。",
   "孩子的菌褶都饿软啦。",
   "温和一些，别把孢子烫飞。"
  ],
  choose: [
   "闻着像雨后的蘑菇林。",
   "幼菇们自己挑，好不好？",
   "有没有暖胃的菌汤？"
  ],
  kitchen: [
   "这股蒸汽真舒服。",
   "别让小菌帽靠炉火太近。",
   "锅里好像飘着森林的雾。"
  ],
  ready: [
   "快看，热汤来了！",
   "孩子们都坐直了。",
   "香得菌帽都竖起来啦。"
  ],
  delivery: [
   "麻烦放中间，大家分着吃。",
   "当心，幼菇们伸手啦。",
   "谢谢，慢慢端来就好。"
  ],
  eat: [
   "这味道像雨后的家。",
   "吃饱啦，菌帽又精神了。",
   "小家伙们都不说话了。"
  ],
  hurry: [
   "幼菇们快睡着了……",
   "菌帽都垂下来了。",
   "抱歉，还要等多久呀？"
  ],
  furious: [
   "再等下去孢子都散了。",
   "孩子实在饿坏啦。",
   "我们先回林子了。"
  ],
  stockout: [
   "幽光蘑菇都用完了吗？",
   "幼菇期待了好久……",
   "下次可得多留些菌菇。"
  ],
  mismatch: [
   "今晚想要暖和一点的。",
   "太辣了，小菌帽受不了。",
   "有没有适合幼菇的菜？"
  ]
 },
 regular: {
  order: [
   "咕噜！老样子有吗？",
   "老板，来盘脆脆的！",
   "闻到香味就弹过来啦！"
  ],
  choose: [
   "咕噜……今天试哪道？",
   "千万别太烫，会冒泡的！",
   "刚从水沟弹过来呢。"
  ],
  kitchen: [
   "这锅气把我吹圆啦！",
   "咕噜噜，闻着就想弹。",
   "有咕噜声，是我还是锅？"
  ],
  ready: [
   "我的身体都在颤啦！",
   "太香了，要忍住别弹。",
   "快来快来，盘子！"
  ],
  delivery: [
   "小心！我会把盘子粘住。",
   "放稳，我一激动就弹。",
   "咕噜，谢谢老板！"
  ],
  eat: [
   "香得我整团都发光。",
   "咕噜，弹性恢复啦！",
   "好吃！我要再弹一圈。"
  ],
  hurry: [
   "等得我快摊成一张饼。",
   "再等下去要化了……",
   "咕……肚子已经扁了。"
  ],
  furious: [
   "我都快蒸发了！",
   "算啦，去别处咕噜。",
   "再等下去就只剩一滩了。"
  ],
  stockout: [
   "呜咕，居然售罄了。",
   "连脆菜都没了吗？",
   "下次给我留一份嘛。"
  ],
  mismatch: [
   "没脆口的？那算啦。",
   "今天的菜单不太合胃口。",
   "想吃清爽一点的呀。"
  ]
 },
 gardener: {
  order:['有新鲜卷卷魔菜吗？','今天想吃点绿油油的。','树叶说这里的蔬食好吃！'],
  choose:['不想吃肉，来份田园菜吧。','芽角闻到青菜香了。','哪道是脆脆的蔬菜？'],
  kitchen:['菜叶可别焖软了。','闻到土豆和洋葱了。','锅里有春天的香气。'],
  ready:['像刚从菜园端出来！','这一盘真好看呀。','叶香扑面而来！'],
  delivery:['把新鲜的端来吧。','小心别碰掉我的鹿角。','这道菜看着真嫩！'],
  eat:['脆脆的好幸福。','这一口像春天。','卷卷魔菜真香！'],
  hurry:['叶子要蔫啦，老板！','芽角的肚子咕咕叫。','还没轮到我的菜吗？'],
  furious:['下次等菜长出来再来。','等太久，叶子都黄了。','芽角先回菜园啦。'],
  stockout:['菜园里都缺菜吗？','那我明天再来采菜。','看来今日青菜卖光了。'],
  mismatch:['只有肉菜吗？','想吃清爽的蔬食呀。','有没有真正的田园菜？']
 },
 stargazer: {
  order: ["走过夜路，想尝一口清亮的。","星砂落到锅边啦。","有没有带花香的料理？"],
  choose: ["让我看看今晚的菜单。","这间小店的香味传得很远。","能闻到菌林与露水。"],
  kitchen: ["锅气像夜空的尾光。","火候再轻一点就好了。","原来星光也能下锅。"],
  ready: ["好香，我的行囊都发亮了。","这一盘看着真清爽。","可以开吃了吗？"],
  delivery: ["小心我的旅袋，放这边。","今晚走了好远，谢啦。","盘子像一轮小月亮。"],
  eat: ["这甜香能照亮夜路。","路过这里真值得。","吃完还能走到天亮。"],
  hurry: ["夜路还长，能快些吗？","我的星砂快睡着了。","已经闻了很久香味啦。"],
  furious: ["今晚只好带着空肚子上路。","等到星星都换位置了。","改日再来吧。"],
  stockout: ["花香都用完了吗？","看来今晚与这道菜无缘。","我的旅袋里也没备餐。"],
  mismatch: ["想找清爽些的口味。","有点太重了，夜路会口渴。","也许下次有更合口的菜。"]
 },
 critic: {
  order: [
   "这道菜的香气有灵魂吗？",
   "让我尝尝生者的火候。",
   "这份料理，值得留在人间？"
  ],
  choose: [
   "传闻这里有难忘的味道。",
   "我跨过灵界来品一口。",
   "不必紧张，先看菜单。"
  ],
  kitchen: [
   "锅气竟穿透了灵雾。",
   "这火焰让我想起生前。",
   "有趣，香气层次分明。"
  ],
  ready: [
   "终于闻见实实在在的香。",
   "盘子里似有一缕灵光。",
   "让我细细品鉴。"
  ],
  delivery: [
   "别急，灵魂也讲究温度。",
   "轻些，我还没有实体。",
   "出餐时机，是厨艺的一部分。"
  ],
  eat: [
   "味道竟让我想起了心跳。",
   "这一口，值得再活一次。",
   "果然有点不寻常。"
  ],
  hurry: [
   "我的灵雾都要散了。",
   "连亡灵的耐心也有限。",
   "香气快飘回灵界了。"
  ],
  furious: [
   "我会把这次等待记入灵册。",
   "再等也尝不到了。",
   "失礼了，我先回去了。"
  ],
  stockout: [
   "连食材的灵魂都耗尽了？",
   "今晚看来无法品鉴。",
   "空空的盘子没有余味。"
  ],
  mismatch: [
   "这几道菜尚不足以惊动亡灵。",
   "我在寻找不同寻常的味道。",
   "今晚或许没有我的那一口。"
  ]
 }
};
for(const [id,lines] of Object.entries({
 cloud_weaver:{
  order:['云汽蒸菜也有吗？','浮苔叶要轻轻蒸。','这阵风让我想吃酸铃。'],
  choose:['今天的风适合清爽的一口。','云舟上可闻不到这锅香。','试试本地新学的菜吧。'],
  kitchen:['闻到蒸笼的云汽啦。','封笼时机正好，我看见了。','浮苔在锅里轻轻跳动。'],
  ready:['刚出笼的香气正好。','这一盘像云朵一样轻。','终于轮到我的晚餐啦。'],
  delivery:['放在靠云海这边吧。','多谢，风还没吹凉呢。','这盘让我带上云舟吧。'],
  eat:['味道像顺风一样轻。','酸铃和浮苔好相衬。','下次泊港还想吃这道。'],
  hurry:['云舟快离港了。','再晚就赶不上顺风了。','能在风转向前上菜吗？'],
  furious:['赶不上这趟风，我先走。','只好空着肚子登舟了。','风向变了，没法再等。'],
  stockout:['浮岛的食材也会卖空？','那就等下趟采集船了。','这道菜的浮苔用完了吗？'],
  mismatch:['想吃些轻盈的当地菜。','今天没有合口味的云米吗？','等有清爽的料理再来。']
 },
 cloud_docker:{
  order:['卸完货，来份管饱的！','酸铃果能提提神。','最好配上热腾腾的云米。'],
  choose:['下一班货船快靠岸了。','有能扛住一夜搬货的菜吗？','这锅闻起来有点劲。'],
  kitchen:['后厨的锅气传到栈桥啦。','再来一点酸香就好了。','这火候像船笛一样响。'],
  ready:['趁热吃完好搬货。','这一份总算上桌了！','还冒着云汽，真香。'],
  delivery:['这盘放稳，风大。','多谢，我先歇口气。','放这儿，别让风吹走。'],
  eat:['有力气接下一班船了！','酸铃入口，整个人精神了。','这饭够扎实，能继续搬。'],
  hurry:['码头还等我卸货呢！','卸货钟快响了。','这班船走前能吃上吗？'],
  furious:['再等就误了航班。','货船离岸了，下次再说。','我得回栈桥干活了。'],
  stockout:['看来要等下一船补货。','云米都卖完了？','食材没了，我只好上船。'],
  mismatch:['没有能填饱肚子的菜吗？','今晚的菜太轻了。','有酸香又管饱的吗？']
 }
}))DINER_VOICES[id]=lines;
const GRILL_VOICES={
 adventurer:{order:['炭火要够劲！','下矿前来串烤的！'],kitchen:['听见炭火噼啪响了！'],ready:['烤串趁热给我！']},
 family:{order:['烤串别太辣，幼菇要分着吃。'],kitchen:['翻面轻一点，别烤焦啦。'],ready:['烤串来了，分着吃吧。']},
 regular:{order:['咕噜，想尝脆脆的烤串！'],kitchen:['这烤香让我弹起来啦！'],ready:['串串来啦！咕噜！']},
 gardener:{order:['请烤一串清爽的蔬菜。'],kitchen:['菜叶边缘烤脆就好。'],ready:['闻到烤蔬菜香啦！']},
 stargazer:{order:['夜路上想带一串菌香。'],kitchen:['炭火像夜里的小星点。'],ready:['烤串的香味陪我赶路。']},
 critic:{order:['让我品品这道炭火香。'],kitchen:['翻面时机决定余香。'],ready:['炭香到了，容我细品。']}
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
 const grill=RECIPES[o.recipeId]?.station==='GRILL'?GRILL_VOICES[o.segment]||GRILL_VOICES.regular:null;
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
   return mk(grill?.ready||v.ready,'ready','arrival',5,o.pickupAt,1.65);
  if(o.status==='queued'&&speechWhen(t,o.orderedAt,2.1))
   return speechCue(o,t,speechName(o)+'！'+speechVariant(o,'order',grill?.order||v.order),'order',6,o.orderedAt,2.1);
  if(o.status==='cooking'&&speechWhen(t,o.started+3,1.7))
   return mk(grill?.kitchen||v.kitchen,'kitchen','ambient',2,o.started+3,1.7);
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
 const helperName=s.activeWorld==='cloud'?'阿岚':'阿火',waiterName=s.activeWorld==='cloud'?'小羽':'小芽';
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
   e.type==='started'?['这锅我看着！',`火候交给${helperName}！`,'下一盘马上来！']:
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
 const lines=role==='helper'?[`${waiterName}，下一盘准备好！`,'我看火，你看客人！','端菜交给你啦！']:
 ['收到，我去送餐！','放心，桌边我照顾！',`盘子我来拿，${helperName}！`];
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

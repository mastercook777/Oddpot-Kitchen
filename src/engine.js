import {ING,RECIPES,CUSTOMERS,FORECAST,DEFAULT_INVENTORY} from './data.js?v=0.5.4';
export const PHASES=['forecast','field','research','menu','prep','service','report','upgrade'];
export const SAVE_KEY='oddpot-prototype-v04'; // v0.2 兼容先前试玩存档
const clone=x=>structuredClone(x);
export const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export function rand(seed){return (Math.imul(1664525,seed>>>0)+1013904223)>>>0}
export function uniqueAdd(ledger,id,type,extra={}){if(ledger.some(x=>x.id===id))return false;ledger.push({id,type,...extra});return true}
export function newGame(seed=20261009){return {version:4,seed,cycle:1,day:1,phase:'forecast',coins:120,reputation:0,inventory:{...DEFAULT_INVENTORY},recipes:{chicken_stew:76,mushroom_stir:76,veg_stir:72},learned:{},tech:false,upgrade:false,crew:{helper:{hired:false,station:0,meals:0,feed:null},waiter:{hired:false,meals:0,feed:null}},staffFoodCost:0,kitchen:{slots:[{type:'WOK',level:1},{type:'POT',level:1}],refitDay:null,freeRefitUsed:false,extraRefits:0},bagSlots:6,selectedTarget:'chili',route:null,field:null,cook:null,menu:['chicken_stew','mushroom_stir','veg_stir'],prep:{},prepCost:0,manualCost:0,service:null,report:null,lastCook:null,ledger:[],logs:[],result:null,step:0};}
// Kitchen station IDs remain WOK/POT for compatibility with 0.4 saves,
// but now denote PHYSICAL positions (left/right), not stove types.
export const KITCHEN_POSITIONS=['WOK','POT'];
export function ensureKitchen(s){
 if(!s.kitchen||!Array.isArray(s.kitchen.slots))s.kitchen={slots:[{type:'WOK',level:s.upgrade?2:1},{type:'POT',level:1}],refitDay:null,freeRefitUsed:false,extraRefits:0};
 s.kitchen.slots=[0,1].map(i=>{const v=s.kitchen.slots[i]||{};return {type:v.type==='WOK'?'WOK':'POT',level:v.level===2?2:1}});
 if(s.upgrade&&s.kitchen.slots[0].level<2)s.kitchen.slots[0].level=2;
 s.kitchen.extraRefits??=0;s.kitchen.freeRefitUsed??=false;
 return s.kitchen;
}
export function kitchenDayKey(s){return `${s.cycle}-${s.day}`}
export function kitchenRefitCost(s){const k=ensureKitchen(s);return k.refitDay===kitchenDayKey(s)&&k.freeRefitUsed?12:0}
export function configureKitchenSlot(s,index,type){
 if(s.phase!=='prep'||![0,1].includes(index)||!['WOK','POT'].includes(type))return false;
 const k=ensureKitchen(s);if(k.slots[index].type===type)return false;
 const today=kitchenDayKey(s),normalFee=kitchenRefitCost(s);
 // Never soft-lock a player who experimented with a free refit. If the
 // kitchen is currently incompatible and this change restores coverage,
 // allow an emergency zero-cost correction when money is insufficient.
 const coverageAfter=(()=>{const types=k.slots.map((x,i)=>i===index?type:x.type);return s.menu.every(id=>!s.recipes[id]||!RECIPES[id]||types.includes(RECIPES[id].station))})();
 const fee=normalFee>s.coins&&!kitchenHasMenuCoverage(s)&&coverageAfter?0:normalFee;
 if(s.coins<fee)return false;
 const seq=k.extraRefits||0;
 if(fee&&!transact(s,`kitchen-refit-${today}-${seq}`,'kitchen_refit',{},-fee))return false;
 if(fee)k.extraRefits=seq+1;
 k.refitDay=today;k.freeRefitUsed=true;k.slots[index].type=type;return true;
}
export function kitchenHasMenuCoverage(s){
 const k=ensureKitchen(s),needed=new Set(s.menu.filter(id=>s.recipes[id]&&RECIPES[id]).map(id=>RECIPES[id].station));
 return [...needed].every(type=>k.slots.some(slot=>slot.type===type));
}
export function kitchenPreview(s){
 const k=ensureKitchen(s),demand={WOK:0,POT:0};
 for(const id of s.menu)if(s.recipes[id]&&RECIPES[id])demand[RECIPES[id].station]++;
 const capacity={WOK:k.slots.filter(x=>x.type==='WOK').length,POT:k.slots.filter(x=>x.type==='POT').length};
 const risk=['WOK','POT'].filter(type=>demand[type]&&!capacity[type]);
 const pressure=['WOK','POT'].map(type=>({type,menu:demand[type],capacity:capacity[type],pressure:capacity[type]?demand[type]/capacity[type]:null}));
 return {pressure,risk,valid:risk.length===0};
}
export function kitchenUpgradeCost(s,index){
 if(![0,1].includes(index))return null;
 return ensureKitchen(s).slots[index].level>=2?null:index===0?60:75;
}
export function buyKitchenUpgrade(s,index){
 if(s.phase!=='upgrade'||![0,1].includes(index))return false;
 const k=ensureKitchen(s),cost=kitchenUpgradeCost(s,index);
 if(cost===null||s.coins<cost)return false;
 const key=index===0?'upgrade-wok':'kitchen-upgrade-1';
 if(!transact(s,key,'upgrade',{},-cost))return false;
 k.slots[index].level=2;if(index===0)s.upgrade=true;return true;
}
export function stationDuration(s,position,recipe,v){
 const k=ensureKitchen(s),i=position==='WOK'?0:1,slot=k.slots[i];
 const bonus=(slot.level-1)*2;
 const staff=v?.crew?.helper;const crewBonus=staff?.hired&&staff.station===i?staff.seconds:0;
 return Math.max(1,recipe.time-bonus-crewBonus-(v?.eventEffects?.[slot.type]||0));
}
// A two-person restaurant team. Feed uses real standard-recipe ingredients;
// meals grant one service-day buff plus a tiny, capped long-term familiarity.
export const CREW_ROLES={helper:{name:'阿火',job:'帮厨',hireCost:40},waiter:{name:'小芽',job:'跑堂',hireCost:35}};
export function ensureCrew(s){
 if(!s.crew)s.crew={};
 for(const role of Object.keys(CREW_ROLES)){
  const raw=s.crew[role]||{};
  raw.hired=!!raw.hired;raw.meals=Math.max(0,Math.min(3,Number(raw.meals)||0));
  raw.feed??=null;if(role==='helper')raw.station=raw.station===1?1:0;
  s.crew[role]=raw;
 }
 s.staffFoodCost??=0;
 return s.crew;
}
export function hireCrew(s,role){
 if(!['prep','upgrade'].includes(s.phase)||!CREW_ROLES[role])return false;
 const c=ensureCrew(s)[role],price=CREW_ROLES[role].hireCost;
 if(c.hired||s.coins<price||!transact(s,`crew-hire-${role}`,'crew_hire',{},-price))return false;
 c.hired=true;return true;
}
export function assignCrew(s,position){
 if(s.phase!=='prep'||![0,1].includes(position))return false;
 const c=ensureCrew(s).helper;if(!c.hired||c.station===position)return false;
 c.station=position;return true;
}
export function activeCrewMeal(s,role){
 const c=ensureCrew(s)[role];return c?.hired&&c.feed?.day===kitchenDayKey(s)?c.feed:null;
}
export function crewEffects(s){
 const crew=ensureCrew(s),helper=crew.helper,waiter=crew.waiter;
 const f=activeCrewMeal(s,'helper'),w=activeCrewMeal(s,'waiter');
 const hr=f?.recipeId?RECIPES[f.recipeId]:null,wr=w?.recipeId?RECIPES[w.recipeId]:null;
 const helperBase=helper.hired?1+(helper.meals>=3?1:0):0;
 const helperMeal=hr?(hr.tags.includes('辣')&&ensureKitchen(s).slots[helper.station].type==='WOK'?2:hr.tags.includes('菌香')?1:0)+(f.quality>=85?1:0):0;
 const waiterBase=waiter.hired?3+(waiter.meals>=3?1:0):0;
 const waiterMeal=wr?(wr.tags.includes('温和')?6:wr.tags.includes('菌香')?4:2)+(w.quality>=85?2:0):0;
 return {helper:{hired:helper.hired,station:helper.station,seconds:Math.min(4,helperBase+helperMeal),fed:!!f,recipeId:f?.recipeId||null,meals:helper.meals},waiter:{hired:waiter.hired,patience:Math.min(12,waiterBase+waiterMeal),fed:!!w,recipeId:w?.recipeId||null,meals:waiter.meals}};
}
export function feedCrew(s,role,recipeId){
 if(s.phase!=='prep'||!CREW_ROLES[role]||!s.recipes[recipeId]||!RECIPES[recipeId])return false;
 const c=ensureCrew(s)[role],r=RECIPES[recipeId];
 if(!c.hired||activeCrewMeal(s,role)||!canUse(s,r.ids))return false;
 const txn=`crew-meal-${kitchenDayKey(s)}-${role}`;
 if(!consume(s,r.ids,txn))return false;
 c.feed={day:kitchenDayKey(s),recipeId,quality:s.recipes[recipeId]};c.meals=Math.min(3,c.meals+1);
 s.staffFoodCost+=r.ids.reduce((sum,id)=>sum+ING[id].cost,0);
 return true;
}
export function save(s){try{localStorage.setItem(SAVE_KEY,JSON.stringify(s))}catch{}}
export function load(){try{
const s=JSON.parse(localStorage.getItem(SAVE_KEY));
if(s?.version!==4||!PHASES.includes(s.phase))return null;
if(s.service){s.service.paused ??= true;s.service.breakAt ??= 0;s.service.breakUsed ??= false;s.service.breakSeen ??= [];s.service.events ??= [];s.service.treatUsed ??= false;
 s.service.kitchenSnapshot ??= structuredClone(ensureKitchen(s).slots);
 s.service.stationStats ??= {WOK:{count:0,secondsSaved:0},POT:{count:0,secondsSaved:0}};
 s.service.judgeOrderId ??= s.day===3?s.service.orders.at(-1)?.id:null;
 s.service.crew ??= clone(crewEffects(s));
 s.service.staffStats ??= {helperSeconds:0,helperOrders:0,waiterBonus:0,waiterOrders:0,waiterSaved:0};
 // v0.1 浏览器存档尚无固定桌位，按当前等餐顺序温和迁移。
 const active=s.service.orders.filter(o=>['queued','cooking'].includes(o.status));
 const taken=new Set(active.map(o=>o.tableId).filter(x=>x!==undefined));
 for(const o of active){if(o.tableId==null){const n=[0,1].find(i=>!taken.has(i));if(n!==undefined){o.tableId=n;taken.add(n)}}o.seatId??=0;}
 }
ensureKitchen(s);ensureCrew(s);
s.bagSlots ??= 6;
if(s.field)s.field.capacity ??= s.bagSlots;
if(s.cook)s.cook.flame ??= 0;
return s;
}catch{return null}}
export function today(s){return FORECAST[(s.day-1)%3]}
export function transact(s,id,type,items={},amount=0){if(!uniqueAdd(s.ledger,id,type,{items,amount,day:s.day,cycle:s.cycle}))return false;for(const [ing,n] of Object.entries(items)){s.inventory[ing]=(s.inventory[ing]||0)+n;if(s.inventory[ing]<0)throw Error('库存不足 '+ing)}s.coins+=amount;return true}
export function canUse(s,ids){return Object.entries(countIds(ids)).every(([id,n])=>(s.inventory[id]||0)>=n)}
export function countIds(ids){const o={};for(const id of ids)o[id]=(o[id]||0)+1;return o}
export function consume(s,ids,txn){if(!canUse(s,ids))return false;return transact(s,txn,'consume',Object.fromEntries(Object.entries(countIds(ids)).map(([id,n])=>[id,-n]))) }
export function nextPhase(s,phase){s.phase=phase;s.step++;return s}
export function enterField(s,route){if(s.phase!=='field'||s.field)return false;const target=s.selectedTarget;const isRisk=route==='risk'||route==='spring_risk';if(!['safe','risk','spring_safe','spring_risk'].includes(route))return false;s.route=route;const sequence=isRisk?[{type:'gather',id:target,n:2,label:'定向采集'},{type:'danger',id:'beef',n:2,label:'野牛领地'},{type:'event',id:'mushroom',n:2,label:'菌菇奇遇'}]:[{type:'gather',id:target,n:2,label:'目标采集'},{type:'gather',id:s.day===2?'chili':'mushroom',n:3,label:'林间采集'},{type:'event',id:'chicken',n:2,label:'流浪农夫'}];s.field={route,hp:3,node:0,bag:{},capacity:s.bagSlots||6,sequence,finished:false,...buildFieldMap(s,route,target)};return true}
export function bagCount(bag){return Object.values(bag).reduce((a,n)=>a+n,0)}
export function collectNode(s,choice='collect'){const f=s.field;if(!f||f.finished||f.node>=f.sequence.length)return {ok:false,message:'探索已结束'};const n=f.sequence[f.node];if(choice==='skip'){f.node++;return {ok:true,message:'绕过当前节点'};}if(n.type==='danger'){const hit=rand(s.seed+s.cycle*100+s.day*10+f.node)%3===0?2:1;f.hp-=hit;if(f.hp<=0){f.finished=true;return settleField(s,'faint')} }
if(f.bag[n.id]>=3)return {ok:false,message:'单格堆叠已满，先撤离'};
if(Object.keys(f.bag).length>=(f.capacity||6)&&!f.bag[n.id])return {ok:false,message:'背包六格已满，先撤离'};
const gain=Math.min(n.n,3-(f.bag[n.id]||0));f.bag[n.id]=(f.bag[n.id]||0)+gain;f.node++;if(f.node>=f.sequence.length)f.finished=true;return {ok:true,message:`收获 ${ING[n.id].name} ×${gain}${n.type==='danger'?' · 遭遇受伤':''}`};}
export function discardFieldStack(s,id){const f=s.field;if(s.phase!=='field'||!f||f.settled||f.finished||!Number.isInteger(f.bag?.[id])||f.bag[id]<=0)return false;delete f.bag[id];return true}
export function settleField(s,reason='retreat'){const f=s.field;if(!f||f.settled)return false;let items={...f.bag};if(reason==='faint')for(const id of Object.keys(items)){items[id]=Math.ceil(items[id]/2);if(items[id]===0)delete items[id]};f.settled=true;f.reason=reason;f.winnings=items;transact(s,`field-${s.cycle}-${s.day}`,'exploration',items);nextPhase(s,'research');return true}
export function skipField(s){if(s.phase!=='field'||s.field)return false;nextPhase(s,'research');return true}
export function purchase(s,id,n=1){if(!ING[id]||!['garlic','mushroom','cabbage','chicken','chili','onion','potato'].includes(id)||n<1||n>5)return false;const price=ING[id].cost*n;if(s.coins<price)return false;return transact(s,`buy-${s.cycle}-${s.day}-${s.step++}`,'purchase',{[id]:n},-price)}
export function startCook(s,ids,method='stir',context='research',orderId=null){if(!['research','service'].includes(s.phase)||s.cook||ids.length<2||ids.length>3||!canUse(s,ids))return false;const txn=`cook-${s.cycle}-${s.day}-${s.step++}`;if(context==='research'&&s.phase!=='research')return false;const tiles=Array(9).fill(null);const defaults=[0,1,4];ids.forEach((id,i)=>tiles[defaults[i]]={id,heat:0});s.cook={context,orderId,method,tiles,movedThisBeat:false,beats:0,adj:{spice:0,umami:0},effects:[],flame:0,txn};return true}
export function moveTile(s,from,to){const c=s.cook;if(!c||c.beats>=3||(c.beats>0&&c.movedThisBeat)||from<0||from>8||to<0||to>8)return false;[c.tiles[from],c.tiles[to]]=[c.tiles[to],c.tiles[from]];if(c.beats>0)c.movedThisBeat=true;return true}
const neighbors=(p,q)=>Math.abs(Math.floor(p/3)-Math.floor(q/3))+Math.abs(p%3-q%3)===1;
export function setFlame(s,flame){
 if(!s.cook||s.cook.beats>=3||![-1,0,1].includes(flame))return false;
 s.cook.flame=flame;return true;
}
// 甩锅让整圈食材顺时针移动一格（中心不动），与一次换位互斥。
export function tossWok(s){
 const c=s.cook;
 if(!c||c.beats>=3||(c.beats>0&&c.movedThisBeat))return false;
 const ring=[0,1,2,5,8,7,6,3],old=ring.map(i=>c.tiles[i]);
 ring.forEach((pos,i)=>{c.tiles[pos]=old[(i+ring.length-1)%ring.length]});
 if(c.beats>0)c.movedThisBeat=true;
 return true;
}
export function previewHeat(c){
 const heatMap=c.method==='stir'?[1,2,1,2,3,2,1,2,1]:[1,1,1,1,2,1,1,1,1];
 return c.tiles.map((tile,p)=>tile?Math.max(0,heatMap[p]+(c.flame||0))+tile.heat:null);
}
export function beat(s){const c=s.cook;if(!c||c.beats>=3)return false;for(let p=0;p<9;p++){const tile=c.tiles[p];if(!tile)continue;const center=p===4,corner=[0,2,6,8].includes(p);tile.heat+=Math.max(0,(c.method==='stir'?(center?3:corner?1:2):(center?2:1))+(c.flame||0))}
const find=id=>c.tiles.findIndex(v=>v?.id===id);const meat=c.tiles.findIndex(v=>['beef','chicken'].includes(v?.id));const chili=find('chili'),garlic=find('garlic'),mush=find('mushroom');
if(meat>=0&&chili>=0&&neighbors(meat,chili))c.adj.spice++;
if(meat>=0&&mush>=0&&neighbors(meat,mush))c.adj.umami++;
if(garlic===4&&c.method==='stir'&&c.tiles[4].heat>=3&&c.tiles.some((v,p)=>v&&p!==4&&neighbors(p,4)&&v.heat>0))c.effects.push('蒜香爆锅');
c.beats++;c.movedThisBeat=false;c.flame=0;return true;}
export function cookOutcome(c,tech=false){const tiles=c.tiles.filter(Boolean),ids=tiles.map(t=>t.id),k=tiles.length;const good=tiles.map(x=>{let h=x.heat;if(tech&&c.method==='stir'&&h>ING[x.id].hi)h--;return h>=ING[x.id].lo&&h<=ING[x.id].hi});const undersafe=tiles.some(x=>['beef','chicken'].includes(x.id)&&x.heat<4);const match=(ids,need)=>ids.length===need.length&&need.every(id=>ids.includes(id));
let id=null;
if(match(ids,['beef','chili','garlic'])&&c.method==='stir'&&c.adj.spice>=2&&c.effects.includes('蒜香爆锅'))id='flame_beef';
else for(const [key,r] of Object.entries(RECIPES)){if(key==='flame_beef'||r.method!==c.method)continue;if(match(ids,r.ids)||(r.also||[]).some(x=>match(ids,x))){id=key;break}}
let heatScore=tiles.reduce((v,x)=>{let h=x.heat;if(tech&&c.method==='stir'&&h>ING[x.id].hi)h--;let distance=h<ING[x.id].lo?ING[x.id].lo-h:Math.max(0,h-ING[x.id].hi);return v+(distance===0?60/k:distance===1?35/k:distance===2?15/k:0)},0);
const effects=[...new Set([...c.effects,...(c.adj.spice>=2&&good.every(Boolean)?['辛香入味']:[]),...(c.adj.umami>=2&&good.every(Boolean)?['浓鲜融合']:[]),...(ids.includes('cabbage')&&good[ids.indexOf('cabbage')]?['爽脆']:[])])];
let synergy=effects.length>=2?25:effects.length?18:10;let technique=id?15:0;let quality=clamp(Math.round(heatScore+synergy+technique),0,100);const sellable=Boolean(id)&&!undersafe&&quality>=40;return {recipeId:id,quality,heatScore:Math.round(heatScore),effects,ids,tiles:clone(c.tiles),sellable,reason:!id?'未匹配已开放的料理配方':undersafe?'肉类未达到安全熟度':quality<40?'火候偏差过大':'成功',heat:tiles.map(t=>({id:t.id,heat:t.heat,ideal:`${ING[t.id].lo}–${ING[t.id].hi}`}))};}
export function finishCook(s){const c=s.cook;if(!c||c.beats!==3)return false;const r=cookOutcome(c,s.tech);const fee=c.context==='research';const ok=consume(s,r.ids,c.txn);if(!ok)return false;s.lastCook=r;s.cook=null;if(fee&&r.sellable){s.recipes[r.recipeId]=Math.max(s.recipes[r.recipeId]||0,Math.min(r.quality,90));s.learned[r.recipeId]=true;}if(!fee&&s.service){s.manualCost+=materialCost(r.ids);const order=s.service.orders.find(o=>o.id===c.orderId);if(order&&order.status==='queued'){order.manual={quality:r.quality,sellable:r.sellable,recipeId:r.recipeId};order.manualMaterialsConsumed=true;order.manualTimePaid=false;}}return r;}
export function synergyFor(menu){const rs=[...new Set(menu)].map(id=>RECIPES[id]).filter(Boolean);if(rs.some(r=>r.tags.includes('辣')&&r.tags.includes('肉'))&&rs.some(r=>r.station==='POT'))return '辛香暖胃';if(rs.filter(r=>r.tags.includes('菌香')).length>=2)return '菌香组合';return null}
export function canMenu(s){return s.menu.length===3&&s.menu.every(id=>s.recipes[id]&&RECIPES[id]);}
export function prepDish(s,id){if(s.phase!=='prep'||!s.menu.includes(id)||!s.recipes[id]||!canUse(s,RECIPES[id].ids))return false;if(!consume(s,RECIPES[id].ids,`prep-${s.cycle}-${s.day}-${s.step++}`))return false;s.prep[id]=(s.prep[id]||0)+1;s.prepCost+=materialCost(RECIPES[id].ids);return true}
function customerFit(r,customerId,syn){const customer=CUSTOMERS[customerId];let fit=clamp(50+r.tags.filter(t=>customer.likes.includes(t)).length*20-Math.max(0,r.price-customer.budget)*4,0,100);if(syn==='辛香暖胃'&&customerId==='adventurer'&&r.tags.includes('辣'))fit+=10;if(syn==='菌香组合'&&(customerId==='family'||customerId==='critic')&&r.tags.includes('菌香'))fit+=10;return clamp(fit,0,100)}
export function selectArrivalDish(s,o){
 // Only select food when the customer reaches the door: changing a menu at
 // intermission affects future orders, never rewrites an already seated order.
 const syn=synergyFor(s.menu),options=s.menu.filter(id=>s.recipes[id]&&RECIPES[id]).map(id=>({id,score:customerFit(RECIPES[id],o.segment,syn),price:RECIPES[id].price})).sort((a,b)=>b.score-a.score||a.price-b.price);
 const themed=s.day===3&&o.id===(s.service?.judgeOrderId||s.service?.orders?.[6]?.id)?options.filter(x=>RECIPES[x.id].tags.some(t=>['辣','爆香'].includes(t))):[];
 const best=themed[0]||options[0];o.recipeId=best?.id||null;o.fit=best?.score||0;
 return best;
}
// v0.5C: seeded nightly scenarios. Save/restore does not reroll guests or goals.
export function serviceDayPlan(s){
 const key=rand(s.seed+s.cycle*3109+s.day*701+Math.max(0,s.reputation)*11);
 // The LCG multiplier is divisible by 5, so key % 5 was CONSTANT.
 // Use mixed high bits or every night falsely advertises the same scenario.
 const pressure=['街坊小聚','周末食客','冒险者晚宴','雨夜热汤','节日高峰'][(key>>>17)%5];
 // Crowd labels represent different *operational pressure*, not cosmetic themes.
 const crowdRules={
  '街坊小聚':{min:6,spread:2,spacing:3,favorite:'regular'},
  '周末食客':{min:8,spread:2,spacing:2,favorite:'family'},
  '冒险者晚宴':{min:8,spread:3,spacing:1,favorite:'adventurer'},
  '雨夜热汤':{min:6,spread:3,spacing:3,favorite:'family'},
  '节日高峰':{min:10,spread:2,spacing:1,favorite:'adventurer'}
 };
 const rule=crowdRules[pressure];
 const count=Math.min(11,rule.min+((key>>>5)%rule.spread)+(s.day===3?1:0));
 const favorite=rule.favorite;
 const baseline=today(s).segments;
 const guests=Array.from({length:count},(_,i)=>{
  if(s.day===3&&i===count-1)return 'critic';
  if(i===0)return baseline[0];
  const pick=rand(key+i*109+s.day*17)%6;
  return pick<2?favorite:pick===2?'regular':pick===3?'adventurer':pick===4?'family':baseline[i%baseline.length];
 });
 const goals=[
  {kind:'served',target:Math.max(5,Math.ceil(count*.75)),label:`完成 ${Math.max(5,Math.ceil(count*.75))} 份上菜`},
  {kind:'comfort',target:72,label:'平均满意达到 72'},
  {kind:'pair',target:2,label:'服务至少 2 位同桌食客'},
  {kind:'flavor',target:2,label:'卖出至少 2 道辛辣料理'}
 ];
 const goal=goals[(key>>>9)%goals.length];
 return {seed:key,pressure,count,guests,goal,arrivalSpacing:rule.spacing};
}
// A physical chair stays occupied until the guest has finished leaving.
// This prevents a newly seated diner overlapping an exiting actor.
export function seatOccupiedAt(o,t){
 if(o.tableId===null||o.tableId===undefined)return false;
 if(['entering','ordering','queued','cooking','flying','eating','review'].includes(o.status))return true;
 if(o.status==='served'&&Number.isFinite(o.reviewedAt))return t-o.reviewedAt<2.2;
 if(o.status==='served'&&Number.isFinite(o.served))return t-o.served<3.85;
 if(['left','rejected'].includes(o.status)&&Number.isFinite(o.leftAt))return t-o.leftAt<2.6;
 return false;
}
export function serviceSupplyStatus(s){
 const v=s.service;if(!v)return {queued:0,cooking:0,arrived:0,shortages:[],lastProblem:null};
 const queued=v.orders.filter(o=>o.status==='queued');
 const stock={...s.inventory},prep={...s.prep},shortages=[];
 for(const o of queued){const r=RECIPES[o.recipeId];if(!r)continue;
  if((prep[o.recipeId]||0)>0){prep[o.recipeId]--;continue}
  const need={};for(const id of r.ids)need[id]=(need[id]||0)+1;
  const missing=Object.entries(need).filter(([id,n])=>(stock[id]||0)<n).map(([id,n])=>({id,amount:n-(stock[id]||0)}));
  if(missing.length)shortages.push({orderId:o.id,recipeId:o.recipeId,tableId:o.tableId,seatId:o.seatId,missing});
  else for(const [id,n] of Object.entries(need))stock[id]-=n;
 }
 const lastProblem=[...v.events].reverse().find(ev=>ev.type==='rejected'&&ev.reason==='食材不足'&&v.time-ev.t<=7)||null;
 return {queued:queued.length,cooking:v.orders.filter(o=>o.status==='cooking').length,
  arrived:v.orders.filter(o=>o.status!=='waiting').length,shortages,lastProblem};
}
export function tableSeatState(v,table){
 return [0,1].map(seat=>v?.orders?.find(o=>o.tableId===table&&o.seatId===seat&&['entering','ordering','queued','cooking','flying','eating','review'].includes(o.status))||null);
}
export function serviceGoalResult(v){
 const goal=v?.goal;if(!goal)return null;
 const served=v.orders.filter(o=>o.status==='served');
 const value=goal.kind==='served'?served.length:
  goal.kind==='comfort'?Math.round(served.reduce((n,o)=>n+(o.sat||0),0)/Math.max(1,served.length)):
  goal.kind==='pair'?served.filter(o=>o.partySize===2).length:
  served.filter(o=>RECIPES[o.recipeId]?.tags?.includes('辣')).length;
 return {kind:goal.kind,label:goal.label,value,target:goal.target,success:value>=goal.target};
}
export function createService(s){if(s.phase!=='service'||s.service||!kitchenHasMenuCoverage(s))return false;
 const plan=serviceDayPlan(s),size=plan.count;
 const orders=plan.guests.map((segment,i)=>{
  const wave=Math.min(2,Math.floor(i*3/size));
  const waveIndex=plan.guests.slice(0,i).filter((_,j)=>Math.min(2,Math.floor(j*3/size))===wave).length;
  return {id:`${s.cycle}-${s.day}-o${i}`,segment,recipeId:null,fit:0,wave,
   arrival:wave*21+waveIndex*plan.arrivalSpacing,status:'waiting',patience:CUSTOMERS[segment].patience,
   elapsed:0,quality:null,started:null,served:null,tableId:null,seatId:null,partySize:1};
 });
 // Pairs are formed from adjacent visitors in a wave. Their orders remain
 // independent; the second diner cannot overwrite the first one's seat.
 for(let i=0;i<orders.length;i+=2){
  if(orders[i+1]&&orders[i+1].wave===orders[i].wave){orders[i].partyId=orders[i+1].partyId=`party-${i}`;orders[i].partySize=orders[i+1].partySize=2;}
 }
 const planEvents={1:SERVICE_EVENT_POOL[1][(plan.seed>>>2)%SERVICE_EVENT_POOL[1].length],
                   2:SERVICE_EVENT_POOL[2][(plan.seed>>>4)%SERVICE_EVENT_POOL[2].length]};
 s.service={orders,time:0,scenario:plan.pressure,scenarioSeed:plan.seed,goal:clone(plan.goal),eventPlan:planEvents,
  judgeOrderId:s.day===3?orders.at(-1)?.id:null,
  crew:clone(crewEffects(s)),staffStats:{helperSeconds:0,helperOrders:0,waiterBonus:0,waiterOrders:0,waiterSaved:0},
  stations:{WOK:null,POT:null},kitchenSnapshot:clone(ensureKitchen(s).slots),stationStats:{WOK:{count:0,secondsSaved:0},POT:{count:0,secondsSaved:0}},
  queued:[],wave:0,done:false,events:[],income:0,cost:0,congestion:{WOK:0,POT:0},initialInventory:clone(s.inventory),
  reportBuilt:false,manualUsed:0,treatUsed:false,paused:true,breakAt:0,breakSeen:[],breakUsed:false,eventChoiceMade:[],
  eventEffects:{WOK:0,POT:0},eventExpense:0,guestMood:0};
 spawnArrivals(s);return true;
}

function record(s,e){s.service.events.push({t:s.service.time,...e})}
export function setServicePaused(s,paused){
 const v=s.service;
 if(s.phase!=='service'||!v||v.done||s.cook||v.breakAt||typeof paused!=='boolean')return false;
 v.paused=paused;return true;
}
export function resumeBreak(s){
 const v=s.service;
 if(s.phase!=='service'||!v||!v.breakAt||v.done)return false;
 record(s,{type:'wave_resumed',wave:v.breakAt});
 v.breakAt=0;v.paused=false;return true;
}
export function breakPrep(s,recipeId){
 const v=s.service,recipe=RECIPES[recipeId];
 if(s.phase!=='service'||!v||!v.breakAt||v.breakUsed||!recipe||!s.menu.includes(recipeId)||!s.recipes[recipeId]||!canUse(s,recipe.ids))return false;
 if(!consume(s,recipe.ids,`emergency-prep-${s.cycle}-${s.day}-${v.breakAt}`))return false;
 s.prep[recipeId]=(s.prep[recipeId]||0)+1;
 v.cost+=materialCost(recipe.ids);v.breakUsed=true;v.decisionFlash=`应急预制：${recipe.name}`;v.decisionAt=v.time;
 record(s,{type:'emergency_prep',recipeId});return true;
}
export const SERVICE_EVENTS={
 1:{id:'rush',title:'临时来了旅行团',description:'下一波冒险者可能增多；你的辣味与炖煮产能能接住吗？',choices:[
  {id:'sign',label:'挂辣味招牌',detail:'将下一波一位顾客改为冒险者，获得需求机会'},
  {id:'kitchen',label:'整理后厨',detail:'花 6 金币：下一波炒锅每单减少 3 秒'},
  {id:'steady',label:'保持原计划',detail:'不追加成本，原客群结构保持不变'}]},
 2:{id:'critic',title:'街角传来美食评论家的消息',description:'有人说今晚会有人特别关注出餐与招待。',choices:[
  {id:'soup',label:'主推温和餐',detail:'将下一波一位顾客改为家庭客群'},
  {id:'assist',label:'雇临时帮厨',detail:'花 8 金币：下一波两口锅每单减少 3 秒'},
  {id:'publicity',label:'免费试吃宣传',detail:'花 5 金币：下一波顾客满意度 +10'}]}
};
// Event variation affects presentation and the offer's tactical context;
// every choice still uses its single authoritative accounting path.
export const SERVICE_EVENT_POOL={
 1:[SERVICE_EVENTS[1],
  {id:'rain',title:'突降大雨，客人想吃热的',description:'有人想喝汤，但炒锅仍有排队风险。',choices:[
   {id:'soup',label:'推荐一份热汤',detail:'下一波一位顾客转为家庭客'},
   {id:'kitchen',label:'帮后厨清台',detail:'6 金币：炒锅加速 3 秒'},
   {id:'steady',label:'不追热潮',detail:'保持计划，保存金币'}]},
  {id:'market',title:'门口摆起了夜市摊',description:'能否接住突然增加的冒险者需求？',choices:[
   {id:'sign',label:'推出辛辣招牌',detail:'下一波增加冒险者需求'},
   {id:'kitchen',label:'整理炒锅',detail:'6 金币：炒锅每单缩短 3 秒'},
   {id:'steady',label:'保留原菜单',detail:'不改变今晚的客群'}]}],
 2:[SERVICE_EVENTS[2],
  {id:'late',title:'深夜加班客匆匆进门',description:'快餐和耐心都成为最后一波的关键。',choices:[
   {id:'assist',label:'临时请人帮忙',detail:'8 金币：所有锅具加速 3 秒'},
   {id:'publicity',label:'送一份试吃',detail:'5 金币：下一波好感 +10'},
   {id:'steady',label:'稳住节奏',detail:'不追加支出'}]},
  {id:'family',title:'附近家庭结伴而来',description:'温和菜可能更受欢迎，值得临时调整吗？',choices:[
   {id:'soup',label:'优先推荐温和菜',detail:'下一波一位顾客改成家庭客'},
   {id:'publicity',label:'附赠小菜招待',detail:'5 金币：下一波好感 +10'},
   {id:'assist',label:'请人救急',detail:'8 金币：双厨具加速 3 秒'}]}]
};
export function currentServiceEvent(s){const v=s.service;if(s.phase!=='service'||!v?.breakAt||v.eventChoiceMade?.includes(v.breakAt))return null;return v.eventPlan?.[v.breakAt]||SERVICE_EVENTS[v.breakAt]||null}
export function chooseServiceEvent(s,choice){
 const v=s.service,event=currentServiceEvent(s);
 if(!event||v.breakUsed||!event.choices.some(c=>c.id===choice))return false;
 const wave=v.breakAt,txn=`service-event-${s.cycle}-${s.day}-${wave}`;
 const cost=choice==='kitchen'?6:choice==='assist'?8:choice==='publicity'?5:0;
 if(s.coins<cost)return false;
 if(cost){if(!transact(s,txn,'service_event',{},-cost))return false;v.eventExpense+=cost;}
 if(choice==='sign'||choice==='soup'){
  const next=v.orders.find(o=>o.status==='waiting'&&o.wave===wave);
  if(next){next.segment=choice==='sign'?'adventurer':'family';next.patience=CUSTOMERS[next.segment].patience}
 }else if(choice==='kitchen'){v.eventEffects.WOK=3;}
 else if(choice==='assist'){v.eventEffects.WOK=3;v.eventEffects.POT=3;}
 else if(choice==='publicity'){v.guestMood=10;v.eventMoodWave=wave;}
 v.eventChoiceMade.push(wave);v.breakUsed=true;
 v.decisionFlash=({sign:'冒险者客群增加',kitchen:'炒锅加速 -3秒',steady:'稳住服务节奏',soup:'家庭客群增加',assist:'双厨具加速 -3秒',publicity:'顾客好感 +10'})[choice]||'事件已处理';v.decisionAt=v.time;
 record(s,{type:'management_choice',wave,choice,cost});return true;
}
export function swapBreakMenu(s,slot,id){
 const v=s.service;
 if(s.phase!=='service'||!v?.breakAt||v.breakUsed||!Number.isInteger(slot)||slot<0||slot>2||!s.recipes[id]||!RECIPES[id])return false;
 const before=s.menu[slot];if(before===id)return false;s.menu[slot]=id;v.breakUsed=true;v.decisionFlash=`下一波新上架：${RECIPES[id].name}`;v.decisionAt=v.time;
 record(s,{type:'menu_swap',wave:v.breakAt,slot,before,after:id});return true;
}
function materialCost(ids){return ids.reduce((sum,id)=>sum+ING[id].cost,0)}
// The plate is only prepared when a station finishes. It is NOT yet served.
// Order money, guest happiness and final service counters are committed after
// the projectile lands and the guest has visibly tasted and reviewed it.
export const DINER_TIMING={enter:2,order:1,flight:2,eat:3,review:2,exit:2.2};
function finishOrder(s,o,quality){
 const v=s.service;
 if(o.status==='left'||o.status==='rejected')return;
 o.status='flying';o.quality=quality;o.flightAt=v.time;
 record(s,{type:'throw',order:o.id,recipeId:o.recipeId,quality});
}
export function guestReview(o){
 const wait=Math.max(0,(o.landedAt??o.served??0)-(o.arrival||0));
 const ratio=wait/Math.max(1,o.patience||1);
 if(ratio>.72)return {type:'late',text:'好吃是好吃，等太久啦…'};
 if((o.quality||0)<62)return {type:'quality',text:'这道菜火候不太对。'};
 if((o.fit||0)<57)return {type:'taste',text:'这个味道不太合我口味。'};
 if((o.sat||0)>=87)return {type:'delicious',text:'太好吃了！还想再来！'};
 if((o.sat||0)>=72)return {type:'happy',text:'好吃！下次还来！'};
 if((o.sat||0)>=55)return {type:'okay',text:'嗯，还不错。'};
 return {type:'bad',text:'一般般，有点失望。'};
}
function advanceGuestMeals(s){
 const v=s.service;
 for(const o of v.orders){
  if(o.status==='flying'&&v.time-o.flightAt>=DINER_TIMING.flight){
   o.status='eating';o.landedAt=v.time;o.served=v.time;
   const price=RECIPES[o.recipeId]?.price||0;
   if(transact(s,`sale-${o.id}`,'sale',{},price))v.income+=price;
   record(s,{type:'landed',order:o.id,recipeId:o.recipeId});
  }
  if(o.status==='eating'&&v.time-o.landedAt>=DINER_TIMING.eat){
   const wait=clamp(o.landedAt-o.arrival,0,o.patience);
   const serviceScore=clamp(Math.round(100*(1-wait/o.patience)),0,100);
   o.sat=clamp(Math.round(.5*o.fit+.3*o.quality+.2*serviceScore+(v.guestMood||0)*(o.wave===v.eventMoodWave?1:0)),0,100);
   const review=guestReview(o);o.reviewText=review.text;o.reviewType=review.type;
   o.status='review';o.reviewAt=v.time;
   s.reputation+=o.sat>=70?1:o.sat<50?-1:0;
   if(v.staffStats&&(v.crew?.waiter?.patience||0)>0&&wait>(o.basePatience||o.patience))v.staffStats.waiterSaved++;
   record(s,{type:'reviewed',order:o.id,recipeId:o.recipeId,sat:o.sat,reason:review.type,text:review.text});
  }
  if(o.status==='review'&&v.time-o.reviewAt>=DINER_TIMING.review){
   o.status='served';o.reviewedAt=v.time;
   record(s,{type:'served',order:o.id,recipeId:o.recipeId,sat:o.sat,quality:o.quality,wait:o.landedAt-o.arrival});
  }
 }
}
function advanceGuestOrders(s){
 const v=s.service;
 for(const o of v.orders){
  if(o.status==='entering'&&v.time-o.doorAt>=DINER_TIMING.enter){
   o.status='ordering';o.seatedAt=v.time;record(s,{type:'seated',order:o.id,table:o.tableId,seat:o.seatId});
  }
  if(o.status==='ordering'&&v.time-o.seatedAt>=DINER_TIMING.order){
   selectArrivalDish(s,o);
   if(o.fit<45||!o.recipeId){o.status='rejected';o.leftAt=v.time;record(s,{type:'rejected',order:o.id,reason:'菜单不匹配'});continue;}
   o.basePatience=o.patience;const bonus=v.crew?.waiter?.patience||0;
   o.patience+=bonus;v.staffStats.waiterBonus+=bonus;if(bonus)v.staffStats.waiterOrders++;
   o.status='queued';o.arrival=v.time; o.orderedAt=v.time;
   v.queued.push(o.id);record(s,{type:'ordered',order:o.id,recipeId:o.recipeId,table:o.tableId,seat:o.seatId});
  }
 }
}
export function expedite(s,orderId){const v=s.service;if(!v||s.phase!=='service')return false;const i=v.queued.indexOf(orderId);if(i<0)return false;v.queued.splice(i,1);v.queued.unshift(orderId);return true}
export function markManual(s,orderId){const v=s.service;if(!v||v.manualUsed>=2||s.cook)return false;const o=v.orders.find(x=>x.id===orderId);if(!o||o.status!=='queued'||o.manual||!s.recipes[o.recipeId])return false;const r=RECIPES[o.recipeId];if(!canUse(s,r.ids))return false;const started=startCook(s,r.ids,r.method,'service',orderId);if(started)v.manualUsed++;return started}
function spawnArrivals(s){
 const v=s.service;
 for(const o of v.orders){
  if(o.status!=='waiting'||o.arrival>v.time)continue;
  if(v.orders.filter(x=>seatOccupiedAt(x,v.time)).length>=4)continue;
  const occupied=v.orders.filter(x=>seatOccupiedAt(x,v.time));
  // Keep party members together if a seat is available. Else seat pairs in
  // the same table, using both chairs before spilling into another table.
  const party=occupied.find(x=>x.partyId&&x.partyId===o.partyId);
  let table=null,seat=null;
  if(party){const used=new Set(occupied.filter(x=>x.tableId===party.tableId).map(x=>x.seatId));
    const candidate=[0,1].find(i=>!used.has(i));if(candidate!==undefined){table=party.tableId;seat=candidate;}}
  if(table===null){for(const i of [0,1]){const used=new Set(occupied.filter(x=>x.tableId===i).map(x=>x.seatId));
    const candidate=[0,1].find(j=>!used.has(j));if(candidate!==undefined){table=i;seat=candidate;break;}}}
  if(table===null)continue;
  o.status='entering';o.doorAt=v.time;o.tableId=table;o.seatId=seat;
  record(s,{type:'arrived',order:o.id,table,seat});
 }
}

export function tick(s,seconds=1){const v=s.service;if(!v||v.done||s.phase!=='service'||s.cook||v.paused||v.breakAt)return false;for(let t=0;t<seconds;t++){if(v.done)break;v.time++;
// 每波之后给一个真正可交互的停顿；停顿期间生产和耐心都不走时。
if((v.time===20||v.time===41)&&!v.breakSeen.includes(v.time)){
 v.breakAt=v.time===20?1:2;v.breakSeen.push(v.time);v.breakUsed=false;v.eventEffects={WOK:0,POT:0};
 record(s,{type:'wave_break',wave:v.breakAt});break;
}
spawnArrivals(s);
advanceGuestOrders(s);
advanceGuestMeals(s);
for(const st of ['WOK','POT']){const job=v.stations[st];if(job){v.congestion[st]++;job.left--;if(job.left<=0){v.stations[st]=null;const o=v.orders.find(x=>x.id===job.orderId);if(o.status==='cooking')finishOrder(s,o,job.quality);else record(s,{type:'waste',order:job.orderId});}}}
for(const o of v.orders){if((o.status==='queued'||o.status==='cooking')&&v.time-o.arrival>o.patience){o.status='left';o.leftAt=v.time;s.reputation=Math.max(-20,s.reputation-1);v.queued=v.queued.filter(id=>id!==o.id);record(s,{type:'left',order:o.id,reason:'等待超时'});}}
for(const st of ['WOK','POT']){if(v.stations[st])continue;let i=v.queued.findIndex(id=>{const o=v.orders.find(x=>x.id===id);return o&&RECIPES[o.recipeId].station===ensureKitchen(s).slots[st==='WOK'?0:1].type});if(i<0)continue;const id=v.queued.splice(i,1)[0];const o=v.orders.find(x=>x.id===id);const r=RECIPES[o.recipeId];if(o.manual){o.status='cooking';v.stations[st]={orderId:id,left:stationDuration(s,st,r,v),quality:o.manual.sellable&&o.manual.recipeId===o.recipeId?o.manual.quality:0};if(!o.manual.sellable||o.manual.recipeId!==o.recipeId){o.status='left';record(s,{type:'failed_cook',order:id})}continue;}
if((s.prep[o.recipeId]||0)>0){s.prep[o.recipeId]--;finishOrder(s,o,s.recipes[o.recipeId]);continue;}
if(!canUse(s,r.ids)){o.status='rejected';o.leftAt=v.time;const shortage=r.ids.filter(x=>(s.inventory[x]||0)<r.ids.filter(y=>y===x).length);record(s,{type:'rejected',order:id,reason:'食材不足',recipeId:o.recipeId,missing:[...new Set(shortage)]});continue;}
consume(s,r.ids,`service-cook-${id}`);v.cost+=materialCost(r.ids);o.status='cooking';o.started=v.time;v.stations[st]={orderId:id,left:stationDuration(s,st,r,v),quality:s.recipes[o.recipeId]||72};v.stationStats[st].count++;v.stationStats[st].secondsSaved+=Math.max(0,r.time-v.stations[st].left);const helper=v.crew?.helper;if(helper?.hired&&helper.station===(st==='WOK'?0:1)){const withoutHelper=Math.max(1,r.time-(ensureKitchen(s).slots[st==='WOK'?0:1].level-1)*2-(v.eventEffects?.[r.station]||0));v.staffStats.helperSeconds+=withoutHelper-v.stations[st].left;v.staffStats.helperOrders++;}record(s,{type:'started',order:id,station:st,cookType:r.station,level:ensureKitchen(s).slots[st==='WOK'?0:1].level});}
if(v.orders.every(o=>['served','left','rejected'].includes(o.status))&&Object.values(v.stations).every(x=>!x)&&v.time>=44){v.done=true;break}if(v.time>=100){for(const o of v.orders)if(!['served','left','rejected'].includes(o.status)){o.status='left';o.leftAt=v.time;record(s,{type:'left',order:o.id,reason:'营业结束'})}v.done=true;break}
v.wave=v.time<21?0:v.time<42?1:2;
 const goalNow=serviceGoalResult(v);
 if(goalNow?.success&&!v.goalCelebrated){v.goalCelebrated=true;record(s,{type:'goal_reached',label:goalNow.label});}
 }
return true}
export function challengeScore(v){const n=v.orders.length,served=v.orders.filter(o=>o.status==='served'),svc=Math.round(v.orders.reduce((x,o)=>x+(o.sat||0),0)/n),theme=Math.round(served.reduce((x,o)=>x+(RECIPES[o.recipeId].tags.some(t=>['辣','爆香'].includes(t))?100:50),0)/Math.max(n,1)),fulfillment=Math.round(100*served.length/n),judge=v.orders.find(o=>o.id===v.judgeOrderId)||v.orders[6],signature=judge?.status==='served'&&RECIPES[judge.recipeId].tags.some(t=>['辣','爆香'].includes(t))?(judge.quality||0):0;return {service:svc,theme,fulfillment,signature,score:Math.round(.4*svc+.25*theme+.2*fulfillment+.15*signature)} }
export function closeService(s){const v=s.service;if(!v||!v.done||v.reportBuilt)return false;v.reportBuilt=true;const served=v.orders.filter(o=>o.status==='served');const left=v.orders.filter(o=>o.status==='left');const rej=v.orders.filter(o=>o.status==='rejected');const byDish={};for(const o of served){const x=byDish[o.recipeId]||{count:0,totalSat:0};x.count++;x.totalSat+=o.sat;byDish[o.recipeId]=x;}
const prev=s.report,cong=v.congestion.WOK>v.congestion.POT*1.5&&v.congestion.WOK>15;
const suggested=rej.length?'存在无法接单的顾客：优先补料或调整菜单。':left.length?(cong?'炒锅排队太长：尝试增加焖煮菜或提前备餐。':'顾客等太久：提前备餐或调整紧急订单优先级。'):served.some(o=>o.sat<70)?'订单全部完成，但部分客群满意度低：尝试不同风味菜。': '这套菜单运行顺畅，下次可测试更高售价的招牌菜。';
const revenue=v.income;let cost=v.cost+s.prepCost+s.manualCost+(s.staffFoodCost||0);const hospitalityCost=v.events.filter(e=>e.type==='guest_care').length*5;const eventExpense=v.eventExpense||0;const staffFoodCost=s.staffFoodCost||0;s.prep={};s.prepCost=0;s.manualCost=0;s.staffFoodCost=0;
const challenge=s.day===3?challengeScore(v):null;const won=!!challenge&&challenge.score>70;
if(won&&!s.tech){s.tech=true;uniqueAdd(s.ledger,'first-boss-reward','unlock',{tech:'heat-mastery'})}
const goal=serviceGoalResult(v);if(goal?.success&&uniqueAdd(s.ledger,`goal-${s.cycle}-${s.day}`,'goal_reward',{goal:goal.kind})){s.reputation+=2;}
s.report={day:s.day,goal,scenario:v.scenario||'常规晚餐',totalOrders:v.orders.length,revenue,cost,profit:revenue-cost-hospitalityCost-eventExpense,hospitalityCost,eventExpense,choices:v.events.filter(e=>e.type==='management_choice'||e.type==='menu_swap'),served:served.length,left:left.length,rejected:rej.length,sat:Math.round(served.reduce((a,o)=>a+o.sat,0)/Math.max(1,served.length)),byDish,guestReviews:v.events.filter(e=>e.type==='reviewed').map(e=>({recipeId:e.recipeId,sat:e.sat,text:e.text,reason:e.reason})),congestion:v.congestion,kitchen:{slots:clone(v.kitchenSnapshot||ensureKitchen(s).slots),stats:clone(v.stationStats||{})},staff:{crew:clone(v.crew||{}),stats:clone(v.staffStats||{}),foodCost:staffFoodCost},synergy:synergyFor(s.menu),suggested,challenge,won};s.result=won?'win':challenge?'loss':null;nextPhase(s,'report');return s.report}
export function advanceDay(s){if(s.phase!=='upgrade')return false;const day=s.day;s.day=day===3?1:day+1;if(day===3)s.cycle++;s.phase='forecast';s.route=null;s.field=null;s.cook=null;s.report=null;s.lastCook=null;s.prep={};s.prepCost=0;s.manualCost=0;s.service=null;s.step++;return true}
export function buyUpgrade(s){return buyKitchenUpgrade(s,0)}
export function bagUpgradePrice(s){return (s.bagSlots||6)>=8?null:(s.bagSlots||6)===6?45:75}
export function buyBagUpgrade(s){const price=bagUpgradePrice(s);if(s.phase!=='upgrade'||price===null||s.coins<price)return false;const next=(s.bagSlots||6)+1;if(!transact(s,`bag-upgrade-${next}`,'upgrade',{},-price))return false;s.bagSlots=next;return true}

// v0.3 walkable, deterministic field. Each node is claimed once, and nothing
// reaches restaurant inventory until settleField() records the unique transaction.
export function buildFieldMap(s,route,target){
 const springs=route.startsWith('spring'),risky=route==='risk'||route==='spring_risk';
 const seed=rand(s.seed+s.cycle*301+s.day*37+(risky?997:0)+(springs?1381:0));
 const extras=springs?['chili','garlic','potato','beef','onion']:['mushroom','cabbage','onion','garlic','chicken','potato'];
 const bonus=extras[seed%extras.length];
 const used=new Set([target]);const pool=springs?['chili','garlic','beef','potato','onion','chicken','mushroom','cabbage']:['mushroom','cabbage','onion','garlic','chicken','potato','chili','beef'];
 const pick=(wanted)=>{const id=(!used.has(wanted)&&wanted)||pool.find(id=>!used.has(id));used.add(id);return id};
 // Two distinct reusable maps, not simply a recolor of the same 9x11 board.
 const nodes=springs?[
  {key:'target',id:target,x:2,y:8,n:2,type:'gather',claimed:false},
  {key:'grove',id:pick(bonus),x:6,y:7,n:2,type:'gather',claimed:false},
  {key:'branch',id:pick(risky?'beef':extras[(seed>>>9)%extras.length]),x:7,y:3,n:risky?2:1,type:risky?'danger':'gather',claimed:false},
  {key:'cache',id:pick(extras[(seed>>>15)%extras.length]),x:3,y:2,n:1,type:'event',claimed:false}
 ]:[
  {key:'target',id:target,x:4,y:6,n:2,type:'gather',claimed:false},
  {key:'grove',id:pick(bonus),x:1,y:4,n:2,type:'gather',claimed:false},
  {key:'branch',id:pick(risky?'beef':extras[(seed>>>9)%extras.length]),x:7,y:2,n:risky?2:1,type:risky?'danger':'gather',claimed:false},
  {key:'cache',id:pick(extras[(seed>>>15)%extras.length]),x:4,y:1,n:1,type:'event',claimed:false}
 ];
 const spots=springs?[[0,8],[8,5],[1,3],[6,9]]:[[0,6],[8,6],[2,9],[6,1]];
 for(const [i,[x,y]] of spots.entries())nodes.push({key:`side-${i}`,id:pick(pool.find(id=>!used.has(id))),x,y,n:1,type:'gather',claimed:false});
 return {region:springs?'spring':'forest',spawn:springs?{x:2.5,y:10.1}:{x:4.5,y:9.4},x:springs?2:4,y:9,steps:0,worldW:9,worldH:11,visitedHazards:[],nodes,
  obstacles:springs?[{x:4,y:8},{x:5,y:5},{x:1,y:5},{x:4,y:3},{x:7,y:9}]:[{x:2,y:6},{x:6,y:5},{x:2,y:2},{x:6,y:8}],
  hazards:springs?[{x:3,y:5},{x:6,y:4},{x:7,y:6}]:risky?[{x:5,y:5},{x:6,y:3}]:[{x:6,y:3}]};
}

export function moveExplorer(s,dx,dy){
 const f=s.field;if(s.phase!=='field'||!f||f.settled||f.finished||!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)+Math.abs(dy)!==1)return {ok:false,message:'不能移动'};
 const x=f.x+dx,y=f.y+dy;
 if(x<0||y<0||x>=f.worldW||y>=f.worldH||f.obstacles.some(o=>o.x===x&&o.y===y))return {ok:false,message:'前方有树木或岩石'};
 f.x=x;f.y=y;f.steps++;
 const h=f.hazards.find(v=>v.x===x&&v.y===y);
 if(h&&!f.visitedHazards.includes(`${x},${y}`)){
  f.visitedHazards.push(`${x},${y}`);f.hp-=f.route==='risk'?2:1;
  if(f.hp<=0){f.finished=true;settleField(s,'faint');return {ok:true,message:'被危险生物袭击！本次冒险失败，仅带回部分收获。'};}
  return {ok:true,message:'⚠️ 遭遇危险，失去体力！可以从这里撤退。'};
 }
 const near=f.nodes.find(n=>!n.claimed&&Math.abs(n.x-x)+Math.abs(n.y-y)===0);
 if(near)return interactExplorer(s);
 return {ok:true,message:'继续寻找食材，靠近闪光采集点。'};
}
export function interactExplorer(s){
 const f=s.field;if(s.phase!=='field'||!f||f.settled||f.finished)return {ok:false,message:'探索已结束'};
 const node=f.nodes.find(n=>!n.claimed&&Math.abs(n.x-f.x)+Math.abs(n.y-f.y)<=1);
 if(!node)return {ok:false,message:'请靠近可采集的食材'};
 if(f.bag[node.id]>=3)return {ok:false,message:'这一食材的背包格已装满，先回店吧'};
 if(Object.keys(f.bag).length>=6&&!f.bag[node.id])return {ok:false,message:'六格背包已满，请先撤离'};
 if(node.type==='danger'){
   f.hp--;
   if(f.hp<=0){f.finished=true;settleField(s,'faint');return {ok:true,message:'尝试夺取野牛食材时被击倒，保留一半本次收获'};}
 }
 const n=Math.min(node.n,3-(f.bag[node.id]||0));f.bag[node.id]=(f.bag[node.id]||0)+n;node.claimed=true;
 f.finished=f.nodes.every(v=>v.claimed);
 return {ok:true,message:`${node.type==='danger'?'⚔️ 成功应对野牛！':'✨ 采集成功！'}获得${ING[node.id].name} ×${n}${node.key==='target'?' · 今日目标已完成！':''}`};
}

// Restaurant v0.3: attention is spent on actual guests, not repeated wok puzzles.
export function sootheGuest(s,orderId){
 const v=s.service;if(s.phase!=='service'||!v||v.done||v.treatUsed||s.coins<5)return false;
 const o=v.orders.find(x=>x.id===orderId);
 if(!o||!['queued','cooking'].includes(o.status))return false;
 const id=`hospitality-${o.id}`;
 if(!transact(s,id,'guest_care',{},-5))return false;
 o.patience+=9;v.treatUsed=true;
 record(s,{type:'guest_care',order:o.id,seconds:9});return true;
}
export function newRecipeLead(s){
 const customer=s.day===1?'family':s.day===2?'adventurer':'critic';
 const candidates=Object.entries(RECIPES).filter(([id,r])=>!s.recipes[id]&&!r.hidden);
 const match=candidates.find(([id,r])=>r.tags.some(t=>CUSTOMERS[customer].likes.includes(t)))||candidates[0];
 return match?{id:match[0],hint:match[1].hint,ingredients:match[1].ids}:null;
}
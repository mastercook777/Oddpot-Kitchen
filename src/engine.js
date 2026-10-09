import {ING,RECIPES,CUSTOMERS,FORECAST,DEFAULT_INVENTORY} from './data.js';
export const PHASES=['forecast','field','research','menu','prep','service','report','upgrade'];
export const SAVE_KEY='guaiwei-prototype-v1'; // v0.2 兼容先前试玩存档
const clone=x=>structuredClone(x);
export const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export function rand(seed){return (Math.imul(1664525,seed>>>0)+1013904223)>>>0}
export function uniqueAdd(ledger,id,type,extra={}){if(ledger.some(x=>x.id===id))return false;ledger.push({id,type,...extra});return true}
export function newGame(seed=20261009){return {version:1,seed,cycle:1,day:1,phase:'forecast',coins:120,reputation:0,inventory:{...DEFAULT_INVENTORY},recipes:{chicken_stew:76,mushroom_stir:76,veg_stir:72},learned:{},tech:false,upgrade:false,selectedTarget:'chili',route:null,field:null,cook:null,menu:['chicken_stew','mushroom_stir','veg_stir'],prep:{},prepCost:0,manualCost:0,service:null,report:null,lastCook:null,ledger:[],logs:[],result:null,step:0};}
export function save(s){try{localStorage.setItem(SAVE_KEY,JSON.stringify(s))}catch{}}
export function load(){try{
const s=JSON.parse(localStorage.getItem(SAVE_KEY));
if(s?.version!==1||!PHASES.includes(s.phase))return null;
if(s.service){s.service.paused ??= true;s.service.breakAt ??= 0;s.service.breakUsed ??= false;s.service.breakSeen ??= [];s.service.events ??= [];
 // v0.1 浏览器存档尚无固定桌位，按当前等餐顺序温和迁移。
 const active=s.service.orders.filter(o=>['queued','cooking'].includes(o.status));
 const taken=new Set(active.map(o=>o.tableId).filter(x=>x!==undefined));
 for(const o of active){if(o.tableId==null){const n=[0,1].find(i=>!taken.has(i));if(n!==undefined){o.tableId=n;taken.add(n)}}}
 }
if(s.cook)s.cook.flame ??= 0;
return s;
}catch{return null}}
export function today(s){return FORECAST[(s.day-1)%3]}
export function transact(s,id,type,items={},amount=0){if(!uniqueAdd(s.ledger,id,type,{items,amount,day:s.day,cycle:s.cycle}))return false;for(const [ing,n] of Object.entries(items)){s.inventory[ing]=(s.inventory[ing]||0)+n;if(s.inventory[ing]<0)throw Error('库存不足 '+ing)}s.coins+=amount;return true}
export function canUse(s,ids){return Object.entries(countIds(ids)).every(([id,n])=>(s.inventory[id]||0)>=n)}
export function countIds(ids){const o={};for(const id of ids)o[id]=(o[id]||0)+1;return o}
export function consume(s,ids,txn){if(!canUse(s,ids))return false;return transact(s,txn,'consume',Object.fromEntries(Object.entries(countIds(ids)).map(([id,n])=>[id,-n]))) }
export function nextPhase(s,phase){s.phase=phase;s.step++;return s}
export function enterField(s,route){if(s.phase!=='field'||s.field)return false;const target=s.selectedTarget;const isRisk=route==='risk';s.route=route;const sequence=isRisk?[{type:'gather',id:target,n:2,label:'定向采集'},{type:'danger',id:'beef',n:2,label:'野牛领地'},{type:'event',id:'mushroom',n:2,label:'菌菇奇遇'}]:[{type:'gather',id:target,n:2,label:'目标采集'},{type:'gather',id:s.day===2?'chili':'mushroom',n:3,label:'林间采集'},{type:'event',id:'chicken',n:2,label:'流浪农夫'}];s.field={route,hp:3,node:0,bag:{},sequence,finished:false};return true}
export function bagCount(bag){return Object.values(bag).reduce((a,n)=>a+n,0)}
export function collectNode(s,choice='collect'){const f=s.field;if(!f||f.finished||f.node>=f.sequence.length)return {ok:false,message:'探索已结束'};const n=f.sequence[f.node];if(choice==='skip'){f.node++;return {ok:true,message:'绕过当前节点'};}if(n.type==='danger'){const hit=rand(s.seed+s.cycle*100+s.day*10+f.node)%3===0?2:1;f.hp-=hit;if(f.hp<=0){f.finished=true;return settleField(s,'faint')} }
if(f.bag[n.id]>=3)return {ok:false,message:'单格堆叠已满，先撤离'};
if(Object.keys(f.bag).length>=6&&!f.bag[n.id])return {ok:false,message:'背包六格已满，先撤离'};
const gain=Math.min(n.n,3-(f.bag[n.id]||0));f.bag[n.id]=(f.bag[n.id]||0)+gain;f.node++;if(f.node>=f.sequence.length)f.finished=true;return {ok:true,message:`收获 ${ING[n.id].name} ×${gain}${n.type==='danger'?' · 遭遇受伤':''}`};}
export function settleField(s,reason='retreat'){const f=s.field;if(!f||f.settled)return false;let items={...f.bag};if(reason==='faint')for(const id of Object.keys(items)){items[id]=Math.ceil(items[id]/2);if(items[id]===0)delete items[id]};f.settled=true;f.reason=reason;f.winnings=items;transact(s,`field-${s.cycle}-${s.day}`,'exploration',items);nextPhase(s,'research');return true}
export function skipField(s){if(s.phase!=='field'||s.field)return false;nextPhase(s,'research');return true}
export function purchase(s,id,n=1){if(!ING[id]||!['garlic','mushroom','cabbage','chicken','chili'].includes(id)||n<1||n>5)return false;const price=ING[id].cost*n;if(s.coins<price)return false;return transact(s,`buy-${s.cycle}-${s.day}-${s.step++}`,'purchase',{[id]:n},-price)}
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
export function createService(s){if(s.phase!=='service'||s.service)return false;const customers=today(s).segments;const orders=customers.map((segment,i)=>{const menu=s.menu.filter(id=>RECIPES[id]);const syn=synergyFor(menu);const best=menu.map(id=>({id,score:customerFit(RECIPES[id],segment,syn),price:RECIPES[id].price})).sort((a,b)=>b.score-a.score||a.price-b.price)[0];const wave=i<2?0:i<5?1:2;return {id:`${s.cycle}-${s.day}-o${i}`,segment,recipeId:best?.id||null,fit:best?.score||0,wave,arrival:wave*21+(wave===0?i*3:(i- (wave===1?2:5))*3),status:'waiting',patience:CUSTOMERS[segment].patience,elapsed:0,quality:null,started:null,served:null};});if(s.day===3){const judge=orders[6];const themed=s.menu.filter(id=>RECIPES[id]?.tags.some(t=>['辣','爆香'].includes(t))).sort((a,b)=>customerFit(RECIPES[b],'critic',synergyFor(s.menu))-customerFit(RECIPES[a],'critic',synergyFor(s.menu)));judge.segment='critic';judge.recipeId=themed[0]||null;judge.fit=judge.recipeId?customerFit(RECIPES[judge.recipeId],'critic',synergyFor(s.menu)):0}s.service={orders,time:0,stations:{WOK:null,POT:null},queued:[],wave:0,done:false,events:[],income:0,cost:0,congestion:{WOK:0,POT:0},initialInventory:clone(s.inventory),reportBuilt:false,manualUsed:0,paused:true,breakAt:0,breakSeen:[],breakUsed:false};spawnArrivals(s);return true}
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
 v.cost+=materialCost(recipe.ids);v.breakUsed=true;
 record(s,{type:'emergency_prep',recipeId});return true;
}
function materialCost(ids){return ids.reduce((sum,id)=>sum+ING[id].cost,0)}
function finishOrder(s,o,quality){const v=s.service;if(o.status==='left'||o.status==='rejected')return;const r=RECIPES[o.recipeId];o.status='served';o.quality=quality;o.served=v.time;const wait=clamp(v.time-o.arrival,0,o.patience);const serviceScore=clamp(Math.round(100*(1-wait/o.patience)),0,100);o.sat=clamp(Math.round(.5*o.fit+.3*quality+.2*serviceScore),0,100);v.income+=r.price;transact(s,`sale-${o.id}`,'sale',{},r.price);s.reputation+=o.sat>=70?1:o.sat<50?-1:0;record(s,{type:'served',order:o.id,recipeId:o.recipeId,quality,sat:o.sat,wait});}
export function expedite(s,orderId){const v=s.service;if(!v||s.phase!=='service')return false;const i=v.queued.indexOf(orderId);if(i<0)return false;v.queued.splice(i,1);v.queued.unshift(orderId);return true}
export function markManual(s,orderId){const v=s.service;if(!v||v.manualUsed>=2||s.cook)return false;const o=v.orders.find(x=>x.id===orderId);if(!o||o.status!=='queued'||o.manual||!s.recipes[o.recipeId])return false;const r=RECIPES[o.recipeId];if(!canUse(s,r.ids))return false;const started=startCook(s,r.ids,r.method,'service',orderId);if(started)v.manualUsed++;return started}
function spawnArrivals(s){
 const v=s.service;
 for(const o of v.orders){
  if(o.status!=='waiting'||o.arrival>v.time)continue;
  if(v.orders.filter(x=>['queued','cooking'].includes(x.status)).length>=2)continue;
  if(o.fit<45||!o.recipeId){o.status='rejected';record(s,{type:'rejected',order:o.id,reason:'菜单不匹配'});continue}
  const busy=new Set(v.orders.filter(x=>['queued','cooking'].includes(x.status)).map(x=>x.tableId));
  const table=[0,1].find(n=>!busy.has(n));
  if(table===undefined)continue;
  o.status='queued';o.tableId=table;v.queued.push(o.id);record(s,{type:'arrived',order:o.id,table});
 }
}
export function tick(s,seconds=1){const v=s.service;if(!v||v.done||s.phase!=='service'||s.cook||v.paused||v.breakAt)return false;for(let t=0;t<seconds;t++){if(v.done)break;v.time++;
// 每波之后给一个真正可交互的停顿；停顿期间生产和耐心都不走时。
if((v.time===20||v.time===41)&&!v.breakSeen.includes(v.time)){
 v.breakAt=v.time===20?1:2;v.breakSeen.push(v.time);v.breakUsed=false;
 record(s,{type:'wave_break',wave:v.breakAt});break;
}
spawnArrivals(s);
for(const st of ['WOK','POT']){const job=v.stations[st];if(job){v.congestion[st]++;job.left--;if(job.left<=0){v.stations[st]=null;const o=v.orders.find(x=>x.id===job.orderId);if(o.status==='cooking')finishOrder(s,o,job.quality);else record(s,{type:'waste',order:job.orderId});}}}
for(const o of v.orders){if((o.status==='queued'||o.status==='cooking')&&v.time-o.arrival>o.patience){o.status='left';s.reputation=Math.max(-20,s.reputation-1);v.queued=v.queued.filter(id=>id!==o.id);record(s,{type:'left',order:o.id,reason:'等待超时'});}}
for(const st of ['WOK','POT']){if(v.stations[st])continue;let i=v.queued.findIndex(id=>{const o=v.orders.find(x=>x.id===id);return o&&RECIPES[o.recipeId].station===st});if(i<0)continue;const id=v.queued.splice(i,1)[0];const o=v.orders.find(x=>x.id===id);const r=RECIPES[o.recipeId];if(o.manual){o.status='cooking';v.stations[st]={orderId:id,left:Math.max(1,r.time-(st==='WOK'&&s.upgrade?2:0)),quality:o.manual.sellable&&o.manual.recipeId===o.recipeId?o.manual.quality:0};if(!o.manual.sellable||o.manual.recipeId!==o.recipeId){o.status='left';record(s,{type:'failed_cook',order:id})}continue;}
if((s.prep[o.recipeId]||0)>0){s.prep[o.recipeId]--;finishOrder(s,o,s.recipes[o.recipeId]);continue;}
if(!canUse(s,r.ids)){o.status='rejected';record(s,{type:'rejected',order:id,reason:'食材不足'});continue;}
consume(s,r.ids,`service-cook-${id}`);v.cost+=materialCost(r.ids);o.status='cooking';o.started=v.time;v.stations[st]={orderId:id,left:Math.max(1,r.time-(st==='WOK'&&s.upgrade?2:0)),quality:s.recipes[o.recipeId]||72};record(s,{type:'started',order:id,station:st});}
if(v.orders.every(o=>['served','left','rejected'].includes(o.status))&&Object.values(v.stations).every(x=>!x)&&v.time>=44){v.done=true;break}if(v.time>=100){for(const o of v.orders)if(!['served','left','rejected'].includes(o.status)){o.status='left';record(s,{type:'left',order:o.id,reason:'营业结束'})}v.done=true;break}
v.wave=v.time<21?0:v.time<42?1:2;}
return true}
export function challengeScore(v){const n=v.orders.length,served=v.orders.filter(o=>o.status==='served'),svc=Math.round(v.orders.reduce((x,o)=>x+(o.sat||0),0)/n),theme=Math.round(served.reduce((x,o)=>x+(RECIPES[o.recipeId].tags.some(t=>['辣','爆香'].includes(t))?100:50),0)/Math.max(n,1)),fulfillment=Math.round(100*served.length/n),judge=v.orders[6],signature=judge.status==='served'&&RECIPES[judge.recipeId].tags.some(t=>['辣','爆香'].includes(t))?(judge.quality||0):0;return {service:svc,theme,fulfillment,signature,score:Math.round(.4*svc+.25*theme+.2*fulfillment+.15*signature)} }
export function closeService(s){const v=s.service;if(!v||!v.done||v.reportBuilt)return false;v.reportBuilt=true;const served=v.orders.filter(o=>o.status==='served');const left=v.orders.filter(o=>o.status==='left');const rej=v.orders.filter(o=>o.status==='rejected');const byDish={};for(const o of served){const x=byDish[o.recipeId]||{count:0,totalSat:0};x.count++;x.totalSat+=o.sat;byDish[o.recipeId]=x;}
const prev=s.report,cong=v.congestion.WOK>v.congestion.POT*1.5&&v.congestion.WOK>15;
const suggested=rej.length?'存在无法接单的顾客：优先补料或调整菜单。':left.length?(cong?'炒锅排队太长：尝试增加焖煮菜或提前备餐。':'顾客等太久：提前备餐或调整紧急订单优先级。'):served.some(o=>o.sat<70)?'订单全部完成，但部分客群满意度低：尝试不同风味菜。': '这套菜单运行顺畅，下次可测试更高售价的招牌菜。';
const revenue=v.income;let cost=v.cost+s.prepCost+s.manualCost;s.prep={};s.prepCost=0;s.manualCost=0;
const challenge=s.day===3?challengeScore(v):null;const won=!!challenge&&challenge.score>70;
if(won&&!s.tech){s.tech=true;uniqueAdd(s.ledger,'first-boss-reward','unlock',{tech:'heat-mastery'})}
s.report={day:s.day,revenue,cost,profit:revenue-cost,served:served.length,left:left.length,rejected:rej.length,sat:Math.round(served.reduce((a,o)=>a+o.sat,0)/Math.max(1,served.length)),byDish,congestion:v.congestion,synergy:synergyFor(s.menu),suggested,challenge,won};s.result=won?'win':challenge?'loss':null;nextPhase(s,'report');return s.report}
export function advanceDay(s){if(s.phase!=='upgrade')return false;const day=s.day;s.day=day===3?1:day+1;if(day===3)s.cycle++;s.phase='forecast';s.route=null;s.field=null;s.cook=null;s.report=null;s.lastCook=null;s.prep={};s.prepCost=0;s.manualCost=0;s.service=null;s.step++;return true}
export function buyUpgrade(s){if(s.phase!=='upgrade'||s.upgrade||s.coins<60)return false;transact(s,'upgrade-wok','upgrade',{},-60);s.upgrade=true;return true}
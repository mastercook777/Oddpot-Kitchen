#!/usr/bin/env node
// v0.12-B: deterministic numeric audits using the actual engine, not a second service simulation.
// "Stationary chef" is a controlled benchmark, NOT a prediction of real touchscreen skill.
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {newGame,createService,setServicePaused,tick,currentServiceEvent,
  chooseServiceEvent,resumeBreak,closeService,advanceDay,ensureDailyMarket,
  purchase} from '../src/engine.js';
import {ING,SHOP_STAPLES} from '../src/data.js';
import {scoreFirstStar} from '../src/restaurant_star_v012a.js';
import {DINER_FLOOR} from '../src/restaurant_scene_v075.js';

export const BASE_SEED=154326;
export const BASE_MENU=['chili_meat','chicken_stew','mushroom_stir'];
export const DEFAULT_SCENARIOS=[
 {id:'two-tables-balanced',label:'2桌·双员工·均衡菜单',tables:2,helper:true,waiter:true,hero:'POT'},
 {id:'three-tables-balanced',label:'3桌·双员工·均衡菜单',tables:3,helper:true,waiter:true,hero:'POT'},
 {id:'four-tables-balanced',label:'4桌·双员工·均衡菜单',tables:4,helper:true,waiter:true,hero:'POT'},
 {id:'four-tables-fully-upgraded',label:'4桌·双员工喂食及双锅升级',tables:4,helper:true,waiter:true,hero:'POT',fed:true,upgrade:true},
 {id:'four-tables-low-quality',label:'4桌·品质65',tables:4,helper:true,waiter:true,hero:'POT',quality:65},
 {id:'four-tables-high-quality',label:'4桌·品质90',tables:4,helper:true,waiter:true,hero:'POT',quality:90},
 {id:'four-tables-premium',label:'4桌·双员工·高价菜单',tables:4,helper:true,waiter:true,hero:'POT',menu:['flame_beef','chicken_stew','garlic_beef']},
 {id:'four-tables-all-wok',label:'4桌·全炒菜·主厨炒锅+跑堂',tables:4,waiter:true,hero:'WOK',menu:['chili_meat','mushroom_stir','veg_stir']},
 {id:'four-tables-all-pot',label:'4桌·全炖菜·主厨炖锅+跑堂',tables:4,waiter:true,hero:'POT',menu:['chicken_stew','onion_chicken','potato_stew']}
];

function configure(s,opt={}){
 s.cycle=opt.cycle??3;s.day=opt.day??1;s.reputation=opt.rep??20;
 s.coins=opt.coins??1000;s.dining.tableCount=opt.tables??2;
 s.chapterProgress.stars=1;s.menu=opt.menu??BASE_MENU;
 for(const id of s.menu)s.recipes[id]=opt.quality??82;
 s.crew.helper.hired=!!opt.helper;s.crew.helper.station=opt.helperStation??0;
 s.crew.helper.meals=opt.fed?3:0;
 s.crew.waiter.hired=!!opt.waiter;s.crew.waiter.meals=opt.fed?3:0;
 s.kitchen.slots=[{type:'WOK',level:opt.upgrade?2:1},{type:'POT',level:opt.upgrade?2:1}];
 if(opt.fed){
  const day=`${s.cycle}-${s.day}`;
  s.crew.helper.feed={day,recipeId:'chili_meat',quality:87};
  s.crew.waiter.feed={day,recipeId:'chicken_stew',quality:87};
 }
}
function advanceService(s,opt={}){
 s.phase='service';
 if(!createService(s,{walkable:true}))throw new Error('cannot create real service');
 if(opt.hero){
  const point=opt.hero==='WOK'?DINER_FLOOR.left:DINER_FLOOR.right;
  Object.assign(s.service.hero,point);
 }
 if(!setServicePaused(s,false))throw new Error('cannot start service');
 let guard=0;
 while(!s.service.done&&guard++<130){
  if(s.service.breakAt){
   const event=currentServiceEvent(s);
   // Same explicit zero-cash operational choice for all variants.
   const choice=event?.choices.find(x=>['steady','soup','sign'].includes(x.id))||event?.choices[0];
   if(choice&&!chooseServiceEvent(s,choice.id))throw new Error('event choice rejected');
   if(!resumeBreak(s))throw new Error('cannot resume break');
  }
  tick(s,1);
 }
 if(!s.service.done)throw new Error('simulation exceeds 130 service ticks');
 const v=s.service,orders=v.orders,rating=scoreFirstStar(orders);
 return {
  orders:orders.length,served:orders.filter(o=>o.status==='served').length,
  left:orders.filter(o=>o.status==='left').length,rejected:orders.filter(o=>o.status==='rejected').length,
  unseated:orders.filter(o=>o.tableId==null).length,
  waitingAtEnd:orders.filter(o=>o.status==='waiting').length,
  revenue:v.income,materialCost:v.cost,contribution:v.income-v.cost-(v.eventExpense||0),
  wokSeconds:v.congestion.WOK,potSeconds:v.congestion.POT,
  rating,serviceSeconds:v.time
 };
}
export function simulateNight(seed,opt={}){
 const s=newGame(seed);
 configure(s,opt);
 // Deliberately ample supply to isolate production, seating and rating from field/market.
 for(const id of Object.keys(s.inventory))s.inventory[id]=200;
 return advanceService(s,opt);
}
const mean=(a,key)=>a.reduce((n,r)=>n+r[key],0)/a.length;
const round=n=>Math.round(n*100)/100;
export function aggregateNightCases(runs=250,scenarios=DEFAULT_SCENARIOS){
 if(!Number.isInteger(runs)||runs<1||runs>10000)throw new Error('runs must be integer in [1,10000]');
 return scenarios.map(config=>{
  const samples=Array.from({length:runs},(_,i)=>simulateNight(BASE_SEED+i*7919,config));
  const scores=samples.map(x=>x.rating.score).sort((a,b)=>a-b);
  return {id:config.id,label:config.label,n:runs,
   orders:round(mean(samples,'orders')),served:round(mean(samples,'served')),
   left:round(mean(samples,'left')),rejected:round(mean(samples,'rejected')),
   unseated:round(mean(samples,'unseated')),
   firstStarMean:round(mean(samples.map(x=>({score:x.rating.score})),'score')),
   firstStarP10:scores[Math.floor(runs*.1)],firstStarP90:scores[Math.min(runs-1,Math.floor(runs*.9))],
   firstStarPassPct:round(100*samples.filter(x=>x.rating.passed).length/runs),
   satisfaction:round(mean(samples.map(x=>({value:x.rating.satisfaction})),'value')),
   revenue:round(mean(samples,'revenue')),
   materialCost:round(mean(samples,'materialCost')),
   contribution:round(mean(samples,'contribution')),
   wokSeconds:round(mean(samples,'wokSeconds')),potSeconds:round(mean(samples,'potSeconds'))
  };
 });
}

// 21-day cash / inventory experiment. "fieldPerDay" is an EXOGENOUS guaranteed
// yield assumption, not an execution of the exploration/battle engine.
// Purchases, pricing, quotas, production, revenue and failures are real engine actions.
export const FIELD_SUPPLY_ASSUMPTION=Object.freeze({mushroom:4,chicken:2,garlic:1,cabbage:1});
export function simulateSupplyRun(seed,{days=21,fieldPerDay=FIELD_SUPPLY_ASSUMPTION}={}){
 const s=newGame(seed);
 configure(s,{cycle:3,day:1,rep:20,coins:500,tables:4,helper:true,waiter:true,
  hero:'POT',menu:['chicken_stew','mushroom_stir','veg_stir'],quality:82});
 // Restore starter inventory: this is a genuine multi-day stock carryover.
 s.phase='forecast';
 const targets={mushroom:11,chicken:7,garlic:4,cabbage:4};
 const rows=[];
 for(let day=0;day<days;day++){
  const starting=s.coins,preInventory={...s.inventory};
  s.phase='prep';
  for(const [id,n] of Object.entries(fieldPerDay))
   if(ING[id]&&Number.isInteger(n)&&n>=0)s.inventory[id]=(s.inventory[id]||0)+n;
  let bought=0;
  for(const id of SHOP_STAPLES){
   const offered=ensureDailyMarket(s).goods[id];if(!offered)continue;
   let wanted=Math.max(0,(targets[id]||0)-(s.inventory[id]||0));
   while(wanted>0&&offered.stock>0){
    const count=Math.min(5,wanted,offered.stock);
    if(!purchase(s,id,count))break;
    bought+=count*offered.price;wanted-=count;
   }
  }
  const night=advanceService(s,{hero:'POT'});
  const report=closeService(s);
  if(!report)throw new Error('report missing after real service');
  rows.push({day:day+1,orders:night.orders,served:night.served,
   rejected:night.rejected,cashStart:starting,cashEnd:s.coins,cashDelta:s.coins-starting,
   marketSpent:bought,ingredientStockStart:Object.values(preInventory).reduce((a,b)=>a+b,0),
   ingredientStockEnd:Object.values(s.inventory).reduce((a,b)=>a+b,0),
   contribution:report.profit});
  s.phase='upgrade';
  if(!advanceDay(s))throw new Error('advanceDay failed');
 }
 return {seed,days,fieldPerDay,startingCoins:500,endingCoins:s.coins,
  totalCashDelta:s.coins-500,
  meanServed:round(mean(rows,'served')),
  shortageNights:rows.filter(x=>x.rejected>0).length,
  totalMarketCash:rows.reduce((n,x)=>n+x.marketSpent,0),
  rows};
}
export function aggregateSupplyRuns(runs=40,days=21,fieldPerDay=FIELD_SUPPLY_ASSUMPTION){
 const arr=Array.from({length:runs},(_,i)=>simulateSupplyRun(BASE_SEED+i*7919,{days,fieldPerDay}));
 const ending=arr.map(x=>x.endingCoins).sort((a,b)=>a-b);
 return {runs,days,fieldPerDay,
  endingCoinsMean:round(mean(arr,'endingCoins')),
  endingCoinsP10:ending[Math.floor(runs*.1)],
  endingCoinsP90:ending[Math.min(runs-1,Math.floor(runs*.9))],
  meanServedPerNight:round(mean(arr,'meanServed')),
  meanShortageNights:round(mean(arr,'shortageNights')),
  meanTotalMarketCash:round(mean(arr,'totalMarketCash'))};
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const getOption=(name,fallback)=>{
  const i=process.argv.findIndex(x=>x===name);
  return i<0?fallback:Number(process.argv[i+1]);
 };
 const runs=getOption('--runs',250),days=getOption('--days',21);
 const output={baseline:'v0.12.0-alpha.1',kind:'deterministic-controlled-balance-audit',
  assumptions:'stationary chef, abundant inventory for service tests; explicit exogenous safe-yield for supply tests',
  service:aggregateNightCases(runs),
  supply:{
   fieldEightPerDay:aggregateSupplyRuns(Math.min(40,runs),days,FIELD_SUPPLY_ASSUMPTION),
   skipExploration:aggregateSupplyRuns(Math.min(40,runs),days,{})
  }};
 process.stdout.write(JSON.stringify(output,null,2)+'\n');
}

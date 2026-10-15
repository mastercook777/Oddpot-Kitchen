#!/usr/bin/env node
// Same customer seeds/menu/staff (except purchased second cook), only one extra REAL staffed WOK.
import {newGame,buyThirdKitchenBundle,createService,setServicePaused,tick,closeService,resumeBreak,
 currentServiceEvent,chooseServiceEvent} from '../src/engine.js';
import {DINER_FLOOR} from '../src/restaurant_scene_v075.js';
const idx=process.argv.indexOf('--runs'),runs=idx>=0?Number(process.argv[idx+1]):80;
if(!Number.isInteger(runs)||runs<20||runs>1000)throw Error('run count must be 20–1000');
function one(seed,{third,stock,menu,marketing}){
 const s=newGame(seed);s.cycle=3;s.day=1;s.reputation=24;s.phase='upgrade';s.coins=800;
 s.chapterProgress.stars=1;s.dining.tableCount=4;
 s.crew.helper.hired=true;s.crew.helper.onDuty=true;s.crew.helper.station=0;
 s.crew.waiter.hired=true;s.crew.waiter.onDuty=true;
 if(third&&!buyThirdKitchenBundle(s))throw Error('bundle buy failed');
 s.phase='prep';s.coins=500;
 s.management={dayKey:'3-1',openingCoins:500,campaignId:marketing||'none',wageDebt:0};
 s.menu=menu||['chili_meat','chicken_stew','mushroom_stir'];
 for(const id of s.menu)s.recipes[id]=82;
 for(const id of Object.keys(s.inventory))s.inventory[id]=stock??100;
 s.phase='service';if(!createService(s,{walkable:true}))throw Error('cannot open');
 Object.assign(s.service.hero,DINER_FLOOR.right);setServicePaused(s,false);
 for(let i=0;i<140&&!s.service.done;i++){
  if(s.service.breakAt){const event=currentServiceEvent(s),choice=event?.choices.find(c=>c.id==='steady')||event?.choices[0];if(choice)chooseServiceEvent(s,choice.id);resumeBreak(s);}
  tick(s,1);
 }
 if(!s.service.done)throw Error('never closed: '+seed);
 const r=closeService(s);
 return {customers:r.totalOrders,served:r.served,ordersWok:r.kitchen.stats.WOK.count,ordersCenter:r.kitchen.stats.CENTER?.count||0,
  revenue:r.revenue,profit:r.profit,queueLoss:r.queue?.abandoned||0,finished:r.staff.stats.helper2Orders||0,
  actualXP:r.growth.earned.helper2,paidWage:r.finance.wage,shortages:r.rejected};
}
const rounds=[
 {title:'双厨具菜单 · 原料充足',menu:['chili_meat','chicken_stew','mushroom_stir']},
 {title:'纯炒锅高峰 · 原料充足',menu:['chili_meat','mushroom_stir','veg_stir']},
 {title:'双厨具＋街头传单',menu:['chili_meat','chicken_stew','mushroom_stir'],marketing:'flyer'},
 {title:'双厨具 · 低库存',menu:['chili_meat','chicken_stew','mushroom_stir'],stock:3}
];
const avg=(arr,k)=>Number((arr.reduce((v,x)=>v+x[k],0)/arr.length).toFixed(2));
const results=rounds.map(config=>{
 const base=[],expanded=[];
 for(let i=0;i<runs;i++){const seed=157323+i*7919;base.push(one(seed,{...config,third:false}));expanded.push(one(seed,{...config,third:true}));}
 const cols=['customers','served','revenue','profit','queueLoss','ordersCenter','finished','actualXP','paidWage','shortages'];
 return {scenario:config.title,runs,base:Object.fromEntries(cols.map(k=>[k,avg(base,k)])),
  staffedThird:Object.fromEntries(cols.map(k=>[k,avg(expanded,k)]))};
});
const key=results[0];
if(!(key.staffedThird.served>key.base.served&&key.staffedThird.finished>0&&key.staffedThird.ordersCenter>0)){
 console.error('Bought third station is not demonstrably effective with paid chef',key);
 process.exitCode=1;
}
if(results.some(r=>r.base.customers!==r.staffedThird.customers))throw Error('tables/stations must not generate customers');
console.log(JSON.stringify({model:'real restaurant 80 fixed-seed paired demand; hero by right pot, 阿火 left WOK, 小炭 centre WOK, 小芽 service. Simulated not iPhone gameplay.',bundlePrice:260,runs,results},null,2));

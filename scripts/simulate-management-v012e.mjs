#!/usr/bin/env node
// Controlled deterministic economics benchmark: actual engine, no synthetic orders/sales.
// Chef remains stationary at POT and helper works WOK. Not a human-skill model.
import {newGame,ensureManagement,chooseCampaign,createService,setServicePaused,tick,
 closeService,currentServiceEvent,chooseServiceEvent,resumeBreak} from '../src/engine.js';
import {DINER_FLOOR} from '../src/restaurant_scene_v075.js';
const parse=arg=>{const idx=process.argv.indexOf(arg);return idx>=0?Number(process.argv[idx+1]):undefined};
const runs=parse('--runs')??120;
if(!Number.isInteger(runs)||runs<1||runs>3000)throw Error('invalid --runs');
function one(seed,opt){
 const s=newGame(seed);s.cycle=3;s.day=1;s.phase='prep';s.reputation=20;
 s.chapterProgress.stars=opt.starred===false?0:1;s.coins=500;s.dining.tableCount=opt.tables||4;
 s.crew.helper.hired=!!opt.staff;s.crew.helper.onDuty=!!opt.staff;
 s.crew.waiter.hired=!!opt.staff;s.crew.waiter.onDuty=!!opt.staff;
 s.crew.helper.level=opt.level||1;s.crew.waiter.level=opt.level||1;
 s.menu=['chili_meat','chicken_stew','mushroom_stir'];
 for(const id of s.menu)s.recipes[id]=82;
 for(const id of Object.keys(s.inventory))s.inventory[id]=opt.stock??100;
 s.kitchen.slots=[{type:'WOK',level:1},{type:'POT',level:1}];
 ensureManagement(s).openingCoins=s.coins;
 if(!chooseCampaign(s,opt.campaign||'none'))throw Error('campaign rejected');
 s.phase='service';if(!createService(s,{walkable:true}))throw Error('open failed');
 Object.assign(s.service.hero,DINER_FLOOR.right);
 setServicePaused(s,false);
 for(let i=0;i<130&&!s.service.done;i++){
  if(s.service.breakAt){
   const event=currentServiceEvent(s);
   const choice=event?.choices.find(x=>['steady','soup','sign'].includes(x.id))||event?.choices[0];
   if(choice&&!chooseServiceEvent(s,choice.id))throw Error('event choice failed');
   if(!resumeBreak(s))throw Error('break resume failed');
  }
  tick(s,1);
 }
 if(!s.service.done)throw Error('service exceeded 130 ticks');
 const r=closeService(s);
 return {arrivals:r.totalOrders,served:r.served,unseated:r.unseated, queuePeak:r.queue?.peak||0, queueSeated:r.queue?.waited||0, queueLost:r.queue?.abandoned||0,
  adArrived:r.finance.marketingArrived,adServed:r.finance.marketingServed,
  revenue:r.revenue,profit:r.profit,cashDelta:r.finance.cashChange,
  shortage:r.rejected,wage:r.finance.wage,debt:r.finance.debt,
  xpHelper:r.growth.earned.helper,xpWaiter:r.growth.earned.waiter};
}
const cases=[
 {name:'首星·3桌·双员工·自然营业',tables:3,staff:true,campaign:'none'},
 {name:'首星·4桌·双员工·自然营业',tables:4,staff:true,campaign:'none'},
 {name:'首星·3桌·双员工·传单',tables:3,staff:true,campaign:'flyer'},
 {name:'首星·4桌·双员工·传单',tables:4,staff:true,campaign:'flyer'},
 {name:'首星·3桌·双员工Lv2·自然营业',tables:3,staff:true,level:2,campaign:'none'},
 {name:'首星·4桌·双员工Lv2·自然营业',tables:4,staff:true,level:2,campaign:'none'},
 {name:'首星·3桌·双员工·低库存',tables:3,staff:true,campaign:'none',stock:3},
 {name:'首星·4桌·双员工·低库存',tables:4,staff:true,campaign:'none',stock:3},
 {name:'首星前·4桌·双员工·自然营业',tables:4,staff:true,starred:false,campaign:'none'}
];
const avg=(a,k)=>Number((a.reduce((n,x)=>n+x[k],0)/a.length).toFixed(2));
const out=cases.map(opt=>{
 const sample=Array.from({length:runs},(_,i)=>one(154326+i*7919,opt));
 return {case:opt.name,runs,orders:avg(sample,'arrivals'),served:avg(sample,'served'),
  cashDelta:avg(sample,'cashDelta'),revenue:avg(sample,'revenue'),profit:avg(sample,'profit'),
  adArrived:avg(sample,'adArrived'),adServed:avg(sample,'adServed'),
  unseated:avg(sample,'unseated'),queuePeak:avg(sample,'queuePeak'),queueSeated:avg(sample,'queueSeated'),queueLost:avg(sample,'queueLost'),shortage:avg(sample,'shortage'),
  xpHelper:avg(sample,'xpHelper'),xpWaiter:avg(sample,'xpWaiter'),
  lossRatePct:Number((sample.filter(x=>x.profit<0).length*100/runs).toFixed(1))};
});
// A shared demand plan must generate measurable extra value from the fourth table.
const three=out.find(x=>x.case==='首星·3桌·双员工·自然营业');
const four=out.find(x=>x.case==='首星·4桌·双员工·自然营业');
if(!three||!four)throw Error('missing table comparison');
if(!(four.served>three.served&&four.queueLost<three.queueLost)){
 console.error('Fourth-table value is not yet demonstrated; adjust the organic demand plan',three,four);
 process.exitCode=1;
}
console.log(JSON.stringify({model:'controlled stationary real-engine v0.12-E (NOT touch player performance)',runs,comparison:{extraServed:Number((four.served-three.served).toFixed(2)),fewerQueueLost:Number((three.queueLost-four.queueLost).toFixed(2)),extraRevenue:Number((four.revenue-three.revenue).toFixed(2))},cases:out},null,2));

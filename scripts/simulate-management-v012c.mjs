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
 s.chapterProgress.stars=1;s.coins=500;s.dining.tableCount=opt.tables||4;
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
 return {arrivals:r.totalOrders,served:r.served,unseated:r.unseated,
  adArrived:r.finance.marketingArrived,adServed:r.finance.marketingServed,
  revenue:r.revenue,profit:r.profit,cashDelta:r.finance.cashChange,
  shortage:r.rejected,wage:r.finance.wage,debt:r.finance.debt,
  xpHelper:r.growth.earned.helper,xpWaiter:r.growth.earned.waiter};
}
const cases=[
 {name:'4桌·双员工·自然营业',tables:4,staff:true,campaign:'none'},
 {name:'4桌·双员工·街头传单',tables:4,staff:true,campaign:'flyer'},
 {name:'4桌·双员工·公会告示',tables:4,staff:true,campaign:'guild'},
 {name:'2桌·双员工·街头传单',tables:2,staff:true,campaign:'flyer'},
 {name:'4桌·双员工Lv2·街头传单',tables:4,staff:true,level:2,campaign:'flyer'},
 {name:'4桌·双员工·街头传单·缺料',tables:4,staff:true,campaign:'flyer',stock:3},
 {name:'4桌·休班·自然营业',tables:4,staff:false,campaign:'none'}
];
const avg=(a,k)=>Number((a.reduce((n,x)=>n+x[k],0)/a.length).toFixed(2));
const out=cases.map(opt=>{
 const sample=Array.from({length:runs},(_,i)=>one(154326+i*7919,opt));
 return {case:opt.name,runs,orders:avg(sample,'arrivals'),served:avg(sample,'served'),
  cashDelta:avg(sample,'cashDelta'),profit:avg(sample,'profit'),
  adArrived:avg(sample,'adArrived'),adServed:avg(sample,'adServed'),
  unseated:avg(sample,'unseated'),shortage:avg(sample,'shortage'),
  xpHelper:avg(sample,'xpHelper'),xpWaiter:avg(sample,'xpWaiter'),
  lossRatePct:Number((sample.filter(x=>x.profit<0).length*100/runs).toFixed(1))};
});
console.log(JSON.stringify({model:'controlled stationary real-engine v0.12-C (NOT touch player performance)',cases:out},null,2));

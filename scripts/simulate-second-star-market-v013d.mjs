#!/usr/bin/env node
// The actual restaurant engine, identical seed-demand, real staffed stations,
// real wages, real inventory/queue/ledger. This is NOT a substitute for iPhone UX.
import assert from 'node:assert/strict';
import {newGame,buyThirdKitchenBundle,requestSecondStar,createService,setServicePaused,tick,
 closeService,resumeBreak,currentServiceEvent,chooseServiceEvent,serviceDayPlan,
 chooseCampaign,ensureDailyMarket} from '../src/engine.js';
import {DINER_FLOOR} from '../src/restaurant_scene_v075.js';
const samples=80;
function simulate(seed,{third=false,stock=100,stage=1,marketing='none',stars=1,menu=null}={}){
 const s=newGame(seed);s.cycle=4;s.day=1;s.reputation=24;s.phase='upgrade';s.coins=1000;
 s.chapterProgress.stars=stars;s.dining.tableCount=4;
 s.crew.helper.hired=true;s.crew.helper.onDuty=true;s.crew.helper.station=0;
 s.crew.waiter.hired=true;s.crew.waiter.onDuty=true;
 if(third)assert.equal(buyThirdKitchenBundle(s),true);
 s.coins=500;s.phase='prep';s.management={dayKey:'4-1',openingCoins:500,campaignId:'none',wageDebt:0};
 s.menu=menu||['chili_meat','chicken_stew','veg_stir'];
 for(const id of s.menu)s.recipes[id]=83;
 for(const id of Object.keys(s.inventory))s.inventory[id]=stock;
 if(stars===1){
  s.chapterProgress.secondAppraisal={stage,requestDay:null,lastAttemptDay:null,stage1Result:null,lastScore:null};
  assert.equal(requestSecondStar(s),true);
 }else if(marketing!=='none')assert.equal(chooseCampaign(s,marketing),true);
 const initial=s.coins,plan=serviceDayPlan(s);
 s.phase='service';assert.equal(createService(s,{walkable:true}),true);
 Object.assign(s.service.hero,DINER_FLOOR.right);
 assert.equal(setServicePaused(s,false),true);
 for(let i=0;i<140&&!s.service.done;i++){
  if(s.service.breakAt){
   const event=currentServiceEvent(s);
   const choice=event?.choices.find(x=>x.id==='steady')||event?.choices[0];
   if(choice)chooseServiceEvent(s,choice.id);
   resumeBreak(s);
  }
  tick(s,1);
 }
 assert.ok(s.service.done,'shift ended');
 const report=closeService(s);
 assert.equal(s.ledger.filter(x=>x.type==='sale').length,report.served);
 assert.equal(closeService(s),false);
 return {report,stars:s.chapterProgress.stars,stage:s.chapterProgress.secondAppraisal?.stage,
  planned:plan.count,vegetable:plan.guests.filter(x=>x==='gardener').length,coins:s.coins,initial};
}
const average=(arr,k)=>Number((arr.reduce((sum,x)=>sum+x[k],0)/arr.length).toFixed(2));
const rows=[];
for(const spec of [
 {name:'第1夜 / 双炉',stage:1,third:false},
 {name:'第1夜 / 三炉',stage:1,third:true},
 {name:'第2夜 / 双炉',stage:2,third:false},
 {name:'第2夜 / 三炉',stage:2,third:true},
 {name:'第1夜 / 三炉低库存',stage:1,third:true,stock:3}
]){
 const a=[];
 for(let i=0;i<samples;i++){
  const r=simulate(173719+i*3719,spec);
  const q=r.report.secondRating;
  a.push({score:q.score,passed:Number(q.passed),served:r.report.served,profit:r.report.profit,
   lost:r.report.queue.abandoned,diversity:q.diversity});
 }
 rows.push({scenario:spec.name,runs:samples,
  passRate:average(a,'passed'),meanScore:average(a,'score'),served:average(a,'served'),
  profit:average(a,'profit'),queueLoss:average(a,'lost'),soldDishTypes:average(a,'diversity')});
}
const guestStrategy=[];
for(const [label,menu] of [
 ['混合菜单',['chili_meat','chicken_stew','veg_stir']],
 ['蔬食菜单',['veg_stir','harvest_stir','potato_stew']]
]){
 const natural=[],paid=[];
 for(let i=0;i<samples;i++){
  const seed=183719+i*3719;
  const normal=simulate(seed,{stars:2,third:true,marketing:'none',menu});
  const invited=simulate(seed,{stars:2,third:true,marketing:'garden',menu});
  natural.push({guests:normal.planned,vegetable:normal.vegetable,served:normal.report.served,profit:normal.report.profit});
  paid.push({guests:invited.planned,vegetable:invited.vegetable,served:invited.report.served,profit:invited.report.profit});
 }
 guestStrategy.push({label,menu,natural:{guests:average(natural,'guests'),vegetable:average(natural,'vegetable'),
  served:average(natural,'served'),profit:average(natural,'profit')},
  paid:{guests:average(paid,'guests'),vegetable:average(paid,'vegetable'),served:average(paid,'served'),
    profit:average(paid,'profit')},cost:24});
}
const regular=guestStrategy[0].natural,invited=guestStrategy[0].paid;
assert.ok(rows[0].passRate>0&&rows[1].passRate>0,'first appraisal should be achievable with two alternative capacities');
assert.ok(rows[2].passRate>0&&rows[3].passRate>0,'second appraisal should be achievable');
assert.equal(guestStrategy.length,2);
assert.ok(invited.guests>regular.guests,'paid campaign creates actual guests');
assert.ok(invited.vegetable>regular.vegetable,'paid campaign reaches vegetable eaters');
console.log(JSON.stringify({description:'80 real fixed-seed nights per strategy; scripted hero at right kitchen, no manual power actions; no claim of iPhone subjective acceptance',
 marketExample:Array.from({length:10},(_,i)=>{const s=newGame(20261009);s.cycle=1+Math.floor(i/3);s.day=i%3+1;return Object.keys(ensureDailyMarket(s).goods).sort()}),
 scoreRows:rows,twoStarVisitors:guestStrategy},null,2));

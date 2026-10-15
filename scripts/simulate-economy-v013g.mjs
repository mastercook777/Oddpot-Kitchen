#!/usr/bin/env node
// v0.13-G: quantitative evidence from the REAL restaurant/market engine.
// Does not change any gameplay. Old caps and assumed gathering are simulations ONLY.
import assert from 'node:assert/strict';
import {newGame,buyThirdKitchenBundle,requestSecondStar,createService,
 setServicePaused,tick,closeService,resumeBreak,currentServiceEvent,chooseServiceEvent,
 chooseCampaign,ensureDailyMarket,purchase,advanceDay,rand} from '../src/engine.js';
import {ING,RECIPES,MARKET_ROTATION_STAPLES} from '../src/data.js';
import {DINER_FLOOR} from '../src/restaurant_scene_v075.js';

const opt=(name,def)=>{const index=process.argv.indexOf(name);return index<0?def:Number(process.argv[index+1]);};
const runs=opt('--runs',32),days=opt('--days',21),starRuns=opt('--star-runs',80);
assert.ok(Number.isInteger(runs)&&runs>=8&&runs<=120);
assert.ok(Number.isInteger(days)&&days>=7&&days<=30);
assert.ok(Number.isInteger(starRuns)&&starRuns>=20&&starRuns<=180);
const MIXED=['chili_meat','chicken_stew','veg_stir'];
const VEG=['veg_stir','harvest_stir','potato_stew'];
const avg=(a,k)=>a.reduce((sum,x)=>sum+x[k],0)/a.length;
const rnd=x=>Math.round(x*100)/100;
const quant=(values,q)=>[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.floor(q*values.length))];
const summarize=(records,fields)=>Object.fromEntries(fields.map(k=>[k,rnd(avg(records,k))]));
function newScenario(seed,{third=false,menu=MIXED,stars=2,stage=0,startingCoins=500,inventory=100}={}){
 const s=newGame(seed);
 s.cycle=4;s.day=1;s.reputation=24;s.phase='upgrade';s.coins=1000;
 s.chapterProgress.stars=stars;s.dining.tableCount=4;
 s.crew.helper.hired=true;s.crew.helper.onDuty=true;s.crew.helper.station=0;
 s.crew.waiter.hired=true;s.crew.waiter.onDuty=true;
 if(third)assert.equal(buyThirdKitchenBundle(s),true,'third kitchen bundle unavailable');
 s.coins=startingCoins;
 s.phase='prep';
 s.management={dayKey:'4-1',openingCoins:startingCoins,campaignId:'none',wageDebt:0};
 s.menu=[...menu];
 for(const id of s.menu)assert.ok(RECIPES[id])&&(s.recipes[id]=83);
 for(const id of Object.keys(s.inventory))s.inventory[id]=MARKET_ROTATION_STAPLES.includes(id)?inventory:0;
 if(stage){
  s.chapterProgress.stars=1;
  s.chapterProgress.secondAppraisal={stage,requestDay:null,lastAttemptDay:null,stage1Result:null,lastScore:null};
  assert.equal(requestSecondStar(s),true);
 }
 return s;
}
function night(s){
 s.phase='service';
 assert.equal(createService(s,{walkable:true}),true,'real service creation failed');
 Object.assign(s.service.hero,DINER_FLOOR.right);
 assert.equal(setServicePaused(s,false),true);
 for(let guard=0;guard<145&&!s.service.done;guard++){
  if(s.service.breakAt){
   const event=currentServiceEvent(s);
   const choice=event?.choices.find(x=>x.id==='steady')||event?.choices[0];
   if(choice)assert.equal(chooseServiceEvent(s,choice.id),true);
   assert.equal(resumeBreak(s),true);
  }
  tick(s,1);
 }
 assert.ok(s.service.done,'service stuck: '+s.seed);
 const r=closeService(s);
 assert.ok(r,'report absent');
 assert.equal(s.ledger.filter(x=>x.type==='sale').length,s.history.reduce((n,d)=>n+d.served,0),
  'unique sale ledger must match actual served');
 return r;
}
function oneNight(seed,o){
 const s=newScenario(seed,{third:o.third,menu:o.menu,stars:o.stage?1:2,stage:o.stage,inventory:100});
 if(o.campaign&&o.campaign!=='none')assert.equal(chooseCampaign(s,o.campaign),true);
 const r=night(s);
 return {arrivals:r.totalOrders,served:r.served,rejected:r.rejected,queueLoss:r.queue.abandoned,
  revenue:r.revenue,profit:r.profit,wage:r.finance.wage,marketing:r.finance.marketingCost,
  adServed:r.finance.marketingServed,adRevenue:r.finance.marketingRevenue,
  starScore:r.secondRating?.score||0,starPass:Number(!!r.secondRating?.passed)};
}
const singleCases=[
 {id:'mixed-two-natural',third:false,menu:MIXED},
 {id:'mixed-three-natural',third:true,menu:MIXED},
 {id:'mixed-three-garden',third:true,menu:MIXED,campaign:'garden'},
 {id:'veg-three-natural',third:true,menu:VEG},
 {id:'veg-three-garden',third:true,menu:VEG,campaign:'garden'},
 {id:'star1-two',third:false,menu:MIXED,stage:1},
 {id:'star1-three',third:true,menu:MIXED,stage:1},
 {id:'star2-two',third:false,menu:MIXED,stage:2},
 {id:'star2-three',third:true,menu:MIXED,stage:2},
 {id:'star1-three-low-stock',third:true,menu:MIXED,stage:1}
];
const single={};const singleRaw={};
for(const c of singleCases){
 const records=Array.from({length:starRuns},(_,i)=>{
  const rec=oneNight(183719+i*3719,{...c});
  // Low-stock comparison uses a separate case below, not a fake report score.
  return rec;
 });
 singleRaw[c.id]=records;
 single[c.id]={n:starRuns,...summarize(records,['arrivals','served','rejected','queueLoss','revenue',
  'profit','wage','marketing','adServed','adRevenue','starScore','starPass']),
  profitP10:quant(records.map(x=>x.profit),.1),profitP90:quant(records.map(x=>x.profit),.9)};
}
// Low-supply star case is an actual engine night with only 3 units of each material.
single['star1-three-low-stock']={};
{
 const c=singleCases.at(-1);
 const records=Array.from({length:starRuns},(_,i)=>{
  const s=newScenario(183719+i*3719,{third:true,stage:1,menu:MIXED,inventory:3});
  const r=night(s);
  return {arrivals:r.totalOrders,served:r.served,rejected:r.rejected,queueLoss:r.queue.abandoned,
   revenue:r.revenue,profit:r.profit,starScore:r.secondRating.score,starPass:Number(r.secondRating.passed)};
 });
 singleRaw[c.id]=records;
 single[c.id]={n:starRuns,...summarize(records,['arrivals','served','rejected','queueLoss','revenue','profit','starScore','starPass'])};
}
function seedOldCapacity(s,market){
 // Counterfactual ONLY: reconstruct the former RNG cap while keeping the same
 // four rotated products, unit prices and the restaurant/queue random seed.
 const base=rand((s.seed^(s.cycle*7919)^(s.day*65521))>>>0);
 for(let i=0;i<MARKET_ROTATION_STAPLES.length;i++){
  const id=MARKET_ROTATION_STAPLES[i],offer=market.goods[id];
  if(!offer)continue;
  const value=rand((base ^ Math.imul(i+1,0x9e3779b9) ^
    Math.imul(s.cycle*3+s.day,0x85ebca6b))>>>0);
  const cap=ING[id].acquisitionPolicy==='FIELD_ONLY'?2+((value>>>16)%3):6+((value>>>16)%4);
  offer.initialStock=cap;offer.stock=cap;
 }
}
function purchases(s,menu,target=12){
 const wantedIds=[...new Set(menu.flatMap(id=>RECIPES[id].ids))];
 const market=ensureDailyMarket(s);
 const wanted=wantedIds.filter(id=>market.goods[id]).sort((a,b)=>{
  const fa=(s.inventory[a]||0)/target,fb=(s.inventory[b]||0)/target;
  return fa-fb||a.localeCompare(b);
 });
 let purchased=0,spent=0;
 for(const id of wanted){
  let needed=Math.max(0,target-(s.inventory[id]||0));
  while(needed>0){
   const offer=market.goods[id];
   const qty=Math.min(5,needed,offer.stock,Math.floor(s.coins/offer.price));
   if(qty<=0)break;
   const price=offer.price;
   assert.equal(purchase(s,id,qty),true);
   needed-=qty;purchased+=qty;spent+=price*qty;
  }
 }
 return {purchased,spent,market};
}
function twentyOneDays(seed,o){
 const s=newScenario(seed,{third:o.third,menu:o.menu,inventory:3,stars:2});
 const begin=s.coins,measure=[],firstInventory={...s.inventory},targets=[...new Set(o.menu.flatMap(id=>RECIPES[id].ids))];
 for(let d=0;d<days;d++){
  s.phase='prep';
  const openingCash=s.coins;
  const dayKey=s.cycle+'-'+s.day;
  assert.equal(s.management.dayKey,dayKey);
  const offered=ensureDailyMarket(s);
  if(o.oldCaps)seedOldCapacity(s,offered);
  const caps=Object.values(offered.goods).map(x=>x.initialStock);
  assert.equal(caps.length,4);
  if(!o.oldCaps)assert.ok(caps.every(n=>n>=6&&n<=10),'live market cap is not 6–10');
  if(o.foraging){
   // Controlled gift of material; not a fabricated claim about the combat engine.
   for(const id of targets.slice(0,4))s.inventory[id]=(s.inventory[id]||0)+2;
  }
  const p=purchases(s,o.menu,12);
  if(o.campaign&&o.campaign!=='none')assert.equal(chooseCampaign(s,o.campaign),true);
  const r=night(s);
  const inventoryRemain=targets.reduce((n,id)=>n+(s.inventory[id]||0),0);
  measure.push({served:r.served,arrivals:r.totalOrders,rejected:r.rejected,queueLoss:r.queue.abandoned,
   profit:r.profit,cashDelta:s.coins-openingCash,marketSpent:p.spent,purchased:p.purchased,
   endCoins:s.coins,inventoryRemain,debt:r.finance.debt,
   marketingSpent:r.finance.marketingCost,marketingServed:r.finance.marketingServed,
   wage:r.finance.wage,shortageDay:Number(r.rejected>0),
   inDeficit:Number(s.coins<0),unpaidWages:Number(r.finance.debt>0)});
  s.phase='upgrade';assert.equal(advanceDay(s),true);
 }
 const total=key=>measure.reduce((n,x)=>n+x[key],0);
 return {seed,days,startingCash:begin,endingCash:s.coins,netCash:s.coins-begin,
  servedPerDay:total('served')/days,arrivalPerDay:total('arrivals')/days,
  profitPerDay:total('profit')/days,cashPerDay:total('cashDelta')/days,
  purchasedPerDay:total('purchased')/days,marketSpentPerDay:total('marketSpent')/days,
  shortages:total('shortageDay'),rejectedPerDay:total('rejected')/days,
  queueLossPerDay:total('queueLoss')/days,
  endingNeededInventory:measure.at(-1).inventoryRemain,
  wageDebtDays:total('unpaidWages'),
  marketingServedPerDay:total('marketingServed')/days,
  totalMarketing:total('marketingSpent'),totalWages:total('wage'),
  initialNeededInventory:targets.reduce((n,id)=>n+(firstInventory[id]||0),0),
  totalRealSales:s.ledger.filter(x=>x.type==='sale').length};
}
const multiCases=[
 {id:'mixed-two-old',oldCaps:true,third:false,menu:MIXED},
 {id:'mixed-two-new',oldCaps:false,third:false,menu:MIXED},
 {id:'mixed-three-old',oldCaps:true,third:true,menu:MIXED},
 {id:'mixed-three-new',oldCaps:false,third:true,menu:MIXED},
 {id:'veg-three-old',oldCaps:true,third:true,menu:VEG},
 {id:'veg-three-new',oldCaps:false,third:true,menu:VEG},
 {id:'mixed-three-new-forage8-assumed',oldCaps:false,third:true,menu:MIXED,foraging:true},
 {id:'veg-three-new-forage8-assumed',oldCaps:false,third:true,menu:VEG,foraging:true},
 {id:'mixed-three-new-garden',oldCaps:false,third:true,menu:MIXED,campaign:'garden'},
 {id:'veg-three-new-garden',oldCaps:false,third:true,menu:VEG,campaign:'garden'}
];
const multi={},multiRaw={};
for(const c of multiCases){
 const records=Array.from({length:runs},(_,i)=>twentyOneDays(154326+i*7919,c));
 multiRaw[c.id]=records;
 multi[c.id]={n:runs,days,...summarize(records,['endingCash','netCash','servedPerDay','arrivalPerDay',
  'profitPerDay','cashPerDay','purchasedPerDay','marketSpentPerDay','shortages',
  'rejectedPerDay','queueLossPerDay','endingNeededInventory','wageDebtDays',
  'marketingServedPerDay','totalMarketing','totalWages']),
  endingCashP10:quant(records.map(x=>x.endingCash),.1),
  endingCashP90:quant(records.map(x=>x.endingCash),.9),
  insolventPct:rnd(100*records.filter(x=>x.wageDebtDays>0).length/runs)};
}
const pairs=[['mixed-two-new','mixed-two-old'],['mixed-three-new','mixed-three-old'],
 ['veg-three-new','veg-three-old'],['mixed-three-new-forage8-assumed','mixed-three-new'],
 ['veg-three-new-forage8-assumed','veg-three-new'],
 ['mixed-three-new-garden','mixed-three-new'],['veg-three-new-garden','veg-three-new']];
const delta={};
for(const [a,b] of pairs){
 const difference=multiRaw[a].map((r,i)=>({
  netCash:r.netCash-multiRaw[b][i].netCash,
  servedPerDay:r.servedPerDay-multiRaw[b][i].servedPerDay,
  shortages:r.shortages-multiRaw[b][i].shortages,
  marketSpentPerDay:r.marketSpentPerDay-multiRaw[b][i].marketSpentPerDay,
  profitPerDay:r.profitPerDay-multiRaw[b][i].profitPerDay
 }));
 delta[a+' vs '+b]={...summarize(difference,['netCash','servedPerDay','shortages',
  'marketSpentPerDay','profitPerDay']),
  netCashP10:quant(difference.map(x=>x.netCash),.1),
  netCashP90:quant(difference.map(x=>x.netCash),.9)};
}
const paidSingle={
 mixed:rnd(single['mixed-three-garden'].profit-single['mixed-three-natural'].profit),
 vegetable:rnd(single['veg-three-garden'].profit-single['veg-three-natural'].profit)
};
assert.equal(single['mixed-three-garden'].marketing,24);
assert.equal(single['veg-three-garden'].marketing,24);
assert.ok(single['mixed-three-garden'].arrivals>single['mixed-three-natural'].arrivals);
assert.ok(single['veg-three-garden'].arrivals>single['veg-three-natural'].arrivals);
const output={kind:'v0.13.0-alpha.6 actual-engine paired economy benchmark',
 protocol:{seeds21Day:runs,days,nightSeeds:starRuns,hero:'fixed at right kitchen',
  menuBehavior:'fixed three learned recipes at quality83, actual recipe/guest matching',
  market:'four rotating offers, real purchase ledger, target 12 units each used ingredient',
  starting:'two-star four-table existing restaurant; starting 500 coins, 3 per ordinary ingredient; staff helper+waiter; third station and helper2 preowned in three-station cases',
  ignoredCosts:'prior unlock/third-station acquisition are sunk costs; no employee food, manual abilities, research or purchases of rare items',
  foraging:'assumed external 2 units of each of four selected menu ingredients every day; not actual field battle/loot',
  oldMarket:'counterfactual daily 2–4 FIELD_ONLY and 6–9 original staple caps, same four offers/prices/seeds',
  accounting:'profit deducts material use at nominal ingredient cost; cash delta also records actual shop purchase spend'},
 single,singleGardenProfitDelta:paidSingle,multi,pairedDelta:delta};
console.log('ECONOMY_AUDIT_JSON_BEGIN');
console.log(JSON.stringify(output,null,2));
console.log('ECONOMY_AUDIT_JSON_END');

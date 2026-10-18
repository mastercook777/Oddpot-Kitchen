#!/usr/bin/env node
// v0.14-F / P1: reproducible observations from the shipped alpha.5 engine.
// This file does not mutate game rules, and does not simulate field combat.
import assert from 'node:assert/strict';
import {newGame,buyThirdKitchenBundle,buyGrill,buyCookwareUpgrade,configureKitchenSlot,
 ensureKitchen,ensureDailyMarket,purchase,chooseCampaign,selectedCampaign,createService,
 setServicePaused,tick,closeService,resumeBreak,currentServiceEvent,chooseServiceEvent,
 advanceDay,requestSecondStar} from '../src/engine.js';
import {ING,RECIPES,MARKET_ROTATION_STAPLES} from '../src/data.js';
import {DINER_FLOOR} from '../src/restaurant_scene_v075.js';

const option=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:Number(process.argv[i+1]);};
const runs=option('--runs',32),days=option('--days',21),nightRuns=option('--night-runs',80);
assert.ok(Number.isInteger(runs)&&runs>=4&&runs<=120);
assert.ok(Number.isInteger(days)&&days>=3&&days<=30);
assert.ok(Number.isInteger(nightRuns)&&nightRuns>=8&&nightRuns<=180);
const BASE=['chili_meat','chicken_stew','veg_stir'];
const GRILLED=['grill_chicken','chicken_stew','veg_stir'];
const POOL=['chili_meat','mushroom_stir','chicken_stew','veg_stir','garlic_beef',
 'spicy_mushroom','onion_chicken','potato_stew','chili_potato','woodland_pot','harvest_stir',
 'grill_beef','grill_chicken','grill_vegetable','grill_fire_beef','grill_sweet_chicken',
 'grill_garlic_mushroom','grill_fire_potato','grill_garlic_cabbage','grill_forest_beef','grill_hearty_chicken'];
const round=x=>Math.round(x*100)/100;
const sum=(rows,k)=>rows.reduce((n,r)=>n+r[k],0);
const mean=(rows,k)=>round(sum(rows,k)/rows.length);
const quant=(numbers,p)=>{const a=[...numbers].sort((x,y)=>x-y);return round(a[Math.min(a.length-1,Math.floor(p*a.length))]);};
const stats=(rows,k)=>({mean:mean(rows,k),p10:quant(rows.map(x=>x[k]),.1),p50:quant(rows.map(x=>x[k]),.5),p90:quant(rows.map(x=>x[k]),.9)});
const dayKey=s=>`${s.cycle}-${s.day}`;

function scenario(seed,{third=true,grill=0,stock=3,stars=2,stage=0}={}){
 const s=newGame(seed);
 s.cycle=4;s.day=1;s.reputation=24;s.phase='upgrade';s.coins=1000;
 s.chapterProgress.stars=stars;s.dining.tableCount=4;
 s.crew.helper.hired=true;s.crew.helper.onDuty=true;s.crew.helper.station=0;
 s.crew.waiter.hired=true;s.crew.waiter.onDuty=true;
 if(third)assert.equal(buyThirdKitchenBundle(s),true);
 if(grill){assert.equal(buyGrill(s),true);if(grill===2)assert.equal(buyCookwareUpgrade(s,'GRILL'),true);}
 const acquisition=1000-s.coins;
 s.coins=500;s.phase='prep';
 s.management={dayKey:dayKey(s),openingCoins:500,campaignId:'none',wageDebt:0};
 for(const id of Object.keys(s.inventory))s.inventory[id]=MARKET_ROTATION_STAPLES.includes(id)?stock:0;
 for(const id of POOL)s.recipes[id]=85;
 s.menu=[...(grill?GRILLED:BASE)];
 if(grill)assert.equal(configureKitchenSlot(s,2,'GRILL'),true);
 if(stage){
  s.chapterProgress.stars=1;
  s.chapterProgress.secondAppraisal={stage,requestDay:null,lastAttemptDay:null,stage1Result:null,lastScore:null};
  assert.equal(requestSecondStar(s),true);
 }
 assert.equal(ensureKitchen(s).slots.length,third?3:2);
 return {s,acquisition};
}
function usable(s,id){return RECIPES[id]?.station!=='GRILL'||s.kitchen.grillOwned;}
function potential(s,id,market){
 const recipe=RECIPES[id];
 return Math.min(...recipe.ids.map(ingredient=>{
  const available=s.inventory[ingredient]||0,offer=market.goods[ingredient];
  return available+(offer?Math.min(offer.stock,Math.max(0,12-available)):0);
 }));
}
function dynamicMenu(s,market){
 // Visible today's market and warehouse, no future offers or guaranteed sales.
 // One WOK and one POT maintain coverage; the third dish competes on food stock.
 const candidates=POOL.filter(id=>usable(s,id));
 const rating=id=>{
  const r=RECIPES[id],p=potential(s,id,market);
  return Math.min(12,p)*3+Math.min(10,r.price-r.cost)*.25-r.ids.length*.3;
 };
 const ordered=candidates.sort((a,b)=>rating(b)-rating(a)||a.localeCompare(b));
 const chosen=[];
 for(const type of ['WOK','POT']){
  const id=ordered.find(x=>RECIPES[x].station===type);
  if(id)chosen.push(id);
 }
 chosen.push(ordered.find(x=>!chosen.includes(x)));
 assert.equal(chosen.length,3);return chosen;
}
function shop(s,menu,market){
 const needed=[...new Set(menu.flatMap(id=>RECIPES[id].ids))].filter(id=>market.goods[id]);
 needed.sort((a,b)=>(s.inventory[a]||0)-(s.inventory[b]||0)||a.localeCompare(b));
 let units=0,spent=0;
 for(const id of needed){
  let gap=Math.max(0,12-(s.inventory[id]||0));
  while(gap>0){
   const offer=market.goods[id],qty=Math.min(5,gap,offer.stock,Math.floor(s.coins/offer.price));
   if(qty<=0)break;
   assert.equal(purchase(s,id,qty),true);
   units+=qty;spent+=qty*offer.price;gap-=qty;
  }
 }
 return {units,spent};
}
function night(s){
 let campaignSkipped=0;
 if(s.coins<selectedCampaign(s).cost){assert.equal(chooseCampaign(s,'none'),true);campaignSkipped=1;}
 s.phase='service';
 assert.equal(createService(s,{walkable:true}),true,`opening failed ${s.seed} ${dayKey(s)} ${s.menu}`);
 Object.assign(s.service.hero,DINER_FLOOR.right);
 assert.equal(setServicePaused(s,false),true);
 for(let guard=0;guard<150&&!s.service.done;guard++){
  if(s.service.breakAt){
   const event=currentServiceEvent(s),choice=event?.choices.find(x=>x.id==='steady')||event?.choices[0];
   if(choice)assert.equal(chooseServiceEvent(s,choice.id),true);
   assert.equal(resumeBreak(s),true);
  }
  tick(s,1);
 }
 assert.ok(s.service.done,`service stuck ${s.seed} ${dayKey(s)}`);
 const report=closeService(s);
 assert.ok(report);
 assert.equal(s.ledger.filter(x=>x.type==='sale').length,s.history.reduce((n,d)=>n+d.served,0));
 return {report,campaignSkipped,orders:s.service.orders};
}
function run(seed,config){
 const {s,acquisition}=scenario(seed,config),startCash=s.coins,rows=[];
 for(let day=0;day<days;day++){
  s.phase='prep';
  const opening=s.coins,market=ensureDailyMarket(s);
  assert.equal(Object.keys(market.goods).length,4);
  assert.ok(Object.values(market.goods).every(x=>x.initialStock>=6&&x.initialStock<=10));
  s.menu=config.dynamic?dynamicMenu(s,market):[...(config.grill?GRILLED:BASE)];
  assert.ok(s.menu.every(id=>s.recipes[id]&&RECIPES[id]));
  const before=s.menu.map(id=>potential(s,id,market));
  const purchases=shop(s,s.menu,market);
  if(config.campaign)assert.equal(chooseCampaign(s,config.campaign),true);
  const {report:r,campaignSkipped,orders}=night(s);
  const grillSold=orders.filter(o=>o.status==='served'&&RECIPES[o.recipeId]?.station==='GRILL').length;
  rows.push({day:day+1,menu:[...s.menu],potential:before,market:Object.keys(market.goods),
   served:r.served,rejected:r.rejected,queueLoss:r.queue.abandoned,
   revenue:r.revenue,profit:r.profit,cashDelta:s.coins-opening,endCash:s.coins,
   marketUnits:purchases.units,marketSpent:purchases.spent,shortage:Number(r.rejected>0),
   marketingCost:r.finance.marketingCost,marketingArrived:r.finance.marketingArrived,
   marketingServed:r.finance.marketingServed,marketingRevenue:r.finance.marketingRevenue,
   campaignSkipped,grillSold,remaining:Object.fromEntries(MARKET_ROTATION_STAPLES.map(id=>[id,s.inventory[id]||0]))});
  s.phase='upgrade';assert.equal(advanceDay(s),true);
 }
 const remainingUnits=MARKET_ROTATION_STAPLES.reduce((n,id)=>n+(s.inventory[id]||0),0);
 const remainingNominalValue=MARKET_ROTATION_STAPLES.reduce((n,id)=>n+(s.inventory[id]||0)*ING[id].cost,0);
 return {seed,acquisition,startCash,rows,netCash:s.coins-startCash,remainingUnits,remainingNominalValue,
  totalProfit:sum(rows,'profit'),totalServed:sum(rows,'served'),totalGrillSold:sum(rows,'grillSold')};
}
const configs=[
 {id:'fixed-two',third:false,grill:0},
 {id:'fixed-three',third:true,grill:0},
 {id:'dynamic-two',third:false,grill:0,dynamic:true},
 {id:'dynamic-three',third:true,grill:0,dynamic:true},
 {id:'grill-l1-fixed',third:true,grill:1},
 {id:'grill-l2-fixed',third:true,grill:2},
 {id:'grill-l1-dynamic',third:true,grill:1,dynamic:true},
 {id:'grill-l2-dynamic',third:true,grill:2,dynamic:true},
 {id:'grill-l1-flyer',third:true,grill:1,campaign:'flyer'},
 {id:'grill-l1-guild',third:true,grill:1,campaign:'guild'},
 {id:'grill-l1-tasting',third:true,grill:1,campaign:'tasting'},
 {id:'grill-l1-garden',third:true,grill:1,campaign:'garden'},
 {id:'grill-l1-dynamic-guild',third:true,grill:1,dynamic:true,campaign:'guild'},
 {id:'grill-l1-dynamic-garden',third:true,grill:1,dynamic:true,campaign:'garden'}
];
const raw={},summary={};
for(const c of configs){
 const records=Array.from({length:runs},(_,i)=>run(154326+i*7919,c));raw[c.id]=records;
 const nights=records.flatMap(x=>x.rows);
 summary[c.id]={runs,days,acquisition:records[0].acquisition,
  servedPerDay:stats(nights,'served'),rejectedPerDay:stats(nights,'rejected'),
  shortageDays:stats(records.map(x=>({count:sum(x.rows,'shortage')})),'count'),
  profitPerDay:stats(nights,'profit'),netCash:stats(records,'netCash'),
  endInventoryUnits:stats(records,'remainingUnits'),endInventoryNominalValue:stats(records,'remainingNominalValue'),
  marketSpentPerDay:mean(nights,'marketSpent'),marketUnitsPerDay:mean(nights,'marketUnits'),
  grillSoldPerDay:stats(nights,'grillSold'),queueLossPerDay:stats(nights,'queueLoss'),
  marketingCostPerDay:mean(nights,'marketingCost'),marketingArrivedPerDay:mean(nights,'marketingArrived'),
  marketingServedPerDay:mean(nights,'marketingServed'),marketingRevenuePerDay:mean(nights,'marketingRevenue'),
  campaignSkippedDays:mean(records.map(x=>({count:sum(x.rows,'campaignSkipped')})),'count')};
}
const compare=(a,b,fee=0)=>{
 const pairs=raw[a].map((r,i)=>{
  const base=raw[b][i],gain=r.totalProfit-base.totalProfit;
  let cumulative=0,breakEvenDay=null;
  for(let d=0;d<days;d++){
   cumulative+=r.rows[d].profit-base.rows[d].profit;
   if(breakEvenDay===null&&cumulative>=fee)breakEvenDay=d+1;
  }
  return {gainPerDay:gain/days,netCash:r.netCash-base.netCash,
   salesPerDay:(r.totalServed-base.totalServed)/days,breakEvenDay:breakEvenDay||0};
 });
 const paybacks=pairs.filter(x=>x.breakEvenDay>0);
 return {profitDeltaPerDay:stats(pairs,'gainPerDay'),cashDelta:stats(pairs,'netCash'),
  salesDeltaPerDay:stats(pairs,'salesPerDay'),incrementalFee:fee,
  breakEvenWithinWindow:fee?round(paybacks.length/pairs.length):null,
  medianBreakEvenDay:fee&&paybacks.length?quant(paybacks.map(x=>x.breakEvenDay),.5):null};
};
const paired={};
for(const [a,b,fee] of [
 ['fixed-three','fixed-two',260],['dynamic-three','fixed-three',0],
 ['dynamic-three','dynamic-two',260],
 ['grill-l1-fixed','fixed-three',180],['grill-l2-fixed','grill-l1-fixed',90],
 ['grill-l1-dynamic','dynamic-three',180],
 ['grill-l1-dynamic','grill-l1-fixed',0],['grill-l2-dynamic','grill-l1-dynamic',90],
 ['grill-l1-flyer','grill-l1-fixed',0],['grill-l1-guild','grill-l1-fixed',0],
 ['grill-l1-tasting','grill-l1-fixed',0],
 ['grill-l1-garden','grill-l1-fixed',0],
 ['grill-l1-dynamic-guild','grill-l1-dynamic',0],
 ['grill-l1-dynamic-garden','grill-l1-dynamic',0]]){
 const result=compare(a,b,fee);
 paired[`${a} vs ${b}`]=result;
}
function starNight(seed,{third,stock,stage}){
 const {s}=scenario(seed,{third,stock,stars:1,stage});
 const {report:r}=night(s);
 return {pass:Number(!!r.secondRating?.passed),score:r.secondRating?.score||0,
  served:r.served,rejected:r.rejected,profit:r.profit};
}
const star={};
for(const [id,config] of Object.entries({
 'stage1-two-full':{third:false,stock:100,stage:1},
 'stage1-three-full':{third:true,stock:100,stage:1},
 'stage2-two-full':{third:false,stock:100,stage:2},
 'stage2-three-full':{third:true,stock:100,stage:2},
 'stage1-three-low':{third:true,stock:3,stage:1}
})){
 const rows=Array.from({length:nightRuns},(_,i)=>starNight(183719+i*3719,config));
 star[id]={runs:nightRuns,passRate:mean(rows,'pass'),score:stats(rows,'score'),served:stats(rows,'served')};
}
const output={kind:'v0.14.0-alpha.5 real restaurant/market economy audit',
 protocol:{runs,days,nightRuns,firstSeed:154326,seedStep:7919,
  starting:'four tables, two stars, 500 coins and three of each ordinary ingredient; preowned stations/crew; acquisition costs reported separately',
  menu:'fixed three dishes versus a deterministic daily choice from 11 ordinary and 10 learned grill dishes; no lookahead',
  shop:'actual four daily offers, purchase to 12 for menu ingredients while affordable',
  field:'no combat, loot, HP or settlement simulated; no external ingredient gifts',
  hero:'fixed at right stove; no manual rescue; real orders, wages, marketing and ledger'},
 summary,paired,star,
 exampleDays:{fixed:raw['fixed-three'][0].rows.slice(0,5),dynamic:raw['dynamic-three'][0].rows.slice(0,5)},
 pairedSeedRows:raw['grill-l2-fixed'].map((x,i)=>({seed:x.seed,
  grillL2Profit:x.totalProfit,grillL1Profit:raw['grill-l1-fixed'][i].totalProfit,
  l2MinusL1:x.totalProfit-raw['grill-l1-fixed'][i].totalProfit}))};
if(process.argv.includes('--raw'))output.raw=raw;
console.log(JSON.stringify(output,null,2));

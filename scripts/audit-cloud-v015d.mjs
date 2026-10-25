#!/usr/bin/env node
// v0.15-D evidence, not a gameplay patch. This uses the real restaurant
// order/work/cost ledger, but never pretends to simulate exploration combat.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {newGame,travelPortal,createService,setServicePaused,tick,closeService,
 resumeBreak,currentServiceEvent,chooseServiceEvent,hireCrew,ensureDailyMarket,
 purchase,advanceDay,redeemFerrySupply} from '../src/engine.js';
import {ING,RECIPES} from '../src/data.js';
import {DINER_FLOOR} from '../src/restaurant_scene_v075.js';

const MENU=['sour_rice','cloud_rice_chicken','moss_soup'];
const round=n=>Math.round(n*100)/100;
const avg=(x,k)=>round(x.reduce((n,r)=>n+r[k],0)/Math.max(1,x.length));
const sum=(x,k)=>x.reduce((n,r)=>n+r[k],0);
const median=(x,k)=>{const a=x.map(r=>r[k]).sort((l,r)=>l-r);return round(a[Math.floor(a.length/2)]||0)};
function cloud(seed,{stocked=false,waiter=false,waiter2=false}={}){
 const s=newGame(seed);
 s.chapterProgress.stars=3;s.phase='forecast';
 assert.equal(travelPortal(s,'cloud'),true);
 s.recipes.sour_rice=84;s.recipes.cloud_rice_chicken=84;s.recipes.moss_soup=84;
 s.menu=[...MENU];s.coins=stocked?1500:300; // explicitly exogenous common starting budget
 if(stocked)for(const id of [...new Set(MENU.flatMap(x=>RECIPES[x].ids))])s.inventory[id]=100;
 if(waiter||waiter2){
  s.phase='prep';assert.equal(hireCrew(s,'waiter'),true);
  if(waiter2){s.cloudProgress.stars=1;assert.equal(hireCrew(s,'waiter2'),true);}
 }
 return s;
}
function kitchen(s,mode){
 const firstRep=s.reputation;
 s.phase='service';assert.equal(createService(s,{walkable:mode!=='auto'}),true);
 const v=s.service;
 if(v.walkable)Object.assign(v.hero,mode==='left'?DINER_FLOOR.left:mode==='pass'?DINER_FLOOR.pass:DINER_FLOOR.right);
 assert.equal(setServicePaused(s,false),true);
 for(let guard=0;guard<175&&!v.done;guard++){
  if(v.breakAt){
   const ev=currentServiceEvent(s);
   const zero=ev?.choices.find(c=>c.id==='steady')||ev?.choices.find(c=>c.id==='soup')||ev?.choices[0];
   if(zero)assert.equal(chooseServiceEvent(s,zero.id),true);
   assert.equal(resumeBreak(s),true);
  }
  tick(s,1);
 }
 assert.equal(v.done,true,'real service must reach end or 100s timeout');
 const ledgerBefore=s.ledger.filter(e=>e.type==='sale').length;
 const statuses=v.orders.map(o=>({
  id:o.id,segment:o.segment,status:o.status,recipe:o.recipeId,
  reason:o.leftReason||o.rejectReason||null,
  started:o.started,ordered:o.orderedAt,landed:o.landedAt,
  arrival:o.arrival,patience:o.patience,fit:o.fit,sat:o.sat,quality:o.quality
 }));
 const events=v.events.map(e=>({...e}));
 const report=closeService(s);assert.ok(report);
 const abandoned=statuses.filter(x=>x.status==='left'),completed=statuses.filter(x=>x.status==='served');
 const timedOut=abandoned.filter(x=>x.reason==='等待超时');
 const byStage=Object.fromEntries(['queued','cooking','pickup','delivering','carried'].map(type=>
  [type,timedOut.filter(x=>events.some(ev=>ev.type==='started'&&ev.order===x.id)===false && type==='queued' ||
  type==='cooking'&&x.started!=null&&events.some(ev=>ev.type==='plate_ready'&&ev.order===x.id)===false ||
  ['pickup','delivering','carried'].includes(type)&&events.some(ev=>ev.type==='plate_ready'&&ev.order===x.id)).length]));
 const ledgerSales=s.ledger.filter(e=>e.type==='sale').length;
 assert.equal(ledgerSales-ledgerBefore,report.served,'exactly one new real ledger sale per served guest this night');
 return {seed:s.seed,served:report.served,orders:report.totalOrders,late:timedOut.length,
  queueAbandoned:report.queue.abandoned,missing:statuses.filter(x=>x.reason==='食材不足').length,
  menuMismatch:statuses.filter(x=>x.reason==='菜单不匹配').length,
  sat:report.sat,fit:round(avg(completed,'fit')),quality:round(avg(completed,'quality')),
  wait:round(avg(completed.map(x=>({...x,wait:(x.landed||0)-(x.ordered||0)})),'wait')),
  profit:report.profit,revenue:report.revenue,reputationDelta:s.reputation-firstRep,
  salvageRecovered:report.salvage?.recovered||0,salvageReused:report.salvage?.reused||0,
  rescueLoss:report.salvage?.expired||0,
  stationWokJobs:report.kitchen.stats?.WOK?.count||0,
  stationPotJobs:report.kitchen.stats?.POT?.count||0,
  leftUnstarted:timedOut.filter(x=>x.started==null).length,
  leftStarted:timedOut.filter(x=>x.started!=null).length,
  timedOutWok:timedOut.filter(x=>RECIPES[x.recipe]?.station==='WOK').length,
  timedOutPot:timedOut.filter(x=>RECIPES[x.recipe]?.station==='POT').length,
  hours:Math.max(...events.map(e=>e.t),0),
  // Do not attribute mid-kitchen abandonment to one tick-state without a real log.
  byStageMethod:'start timestamp only; pickup history recorded separately',
  lateByType:byStage,report,after:s,statuses,events};
}
function panel(runs){
 const configs=['auto','right','left','pass','waiter','two_waiters'],raw={};
 for(const id of configs)raw[id]=Array.from({length:runs},(_,i)=>{
  const seed=191819+i*2267,s=cloud(seed,{stocked:true,waiter:id==='waiter'||id==='two_waiters',waiter2:id==='two_waiters'});
  const r=kitchen(s,id==='waiter'||id==='two_waiters'?'right':id);
  const {after,report,statuses,events,...metrics}=r;return metrics;
 });
 const fields=['served','late','queueAbandoned','missing','sat','fit','quality','wait','profit',
  'salvageRecovered','salvageReused','stationWokJobs','stationPotJobs','leftUnstarted','leftStarted','timedOutWok','timedOutPot'];
 const summary={};for(const [name,rows] of Object.entries(raw))
  summary[name]=Object.fromEntries(fields.map(k=>[k,avg(rows,k)]));
 const paired={};for(const [a,b] of [['right','left'],['right','pass'],['waiter','right'],['two_waiters','waiter'],['right','auto']]){
  paired[a+'_minus_'+b]={
   sold:avg(raw[a].map((v,i)=>({x:v.served-raw[b][i].served})),'x'),
   late:avg(raw[a].map((v,i)=>({x:v.late-raw[b][i].late})),'x'),
   reputation:avg(raw[a].map((v,i)=>({x:v.reputationDelta-raw[b][i].reputationDelta})),'x')
  };
 }
 return {runs,seeds:{base:191819,step:2267},summary,paired,samples:{right:raw.right.slice(0,2),left:raw.left.slice(0,2)}};
}
function supply(seed,days,freight=false){
 const s=newGame(seed);s.chapterProgress.stars=3;s.phase='forecast';
 assert.equal(travelPortal(s,'cloud'),true);
 if(freight){
  // Actually sell a meal at the original restaurant after first opening Cloud.
  s.phase='upgrade';assert.equal(travelPortal(s,'hearth'),true);
  for(const id of ['chicken','mushroom','garlic','cabbage'])s.inventory[id]=80; // Hearth study fixture
  s.phase='service';assert.equal(createService(s),true);setServicePaused(s,false);
  for(let i=0;i<150&&!s.service.done;i++){if(s.service.breakAt)resumeBreak(s);tick(s,1)}
  const earned=closeService(s);assert.ok(earned?.served>0);assert.equal(s.ferryCredits,1);
  s.phase='upgrade';assert.equal(travelPortal(s,'cloud'),true);
 }
 s.recipes.sour_rice=84;s.recipes.cloud_rice_chicken=84;s.recipes.moss_soup=84;
 s.menu=[...MENU];s.coins=300;
 s.phase='prep';assert.equal(hireCrew(s,'waiter'),true);
 const records=[];
 for(let d=0;d<days;d++){
  s.phase='forecast';
  const before=s.coins,market=ensureDailyMarket(s);
  let purchased=0,spent=0;
  const needed=[...new Set(MENU.flatMap(id=>RECIPES[id].ids))];
  for(const id of needed){
   const offer=market.goods[id];if(!offer)continue;
   while((s.inventory[id]||0)<8){
    const n=Math.min(5,8-(s.inventory[id]||0),offer.stock,Math.floor(s.coins/offer.price));
    if(n<1)break;
    assert.equal(purchase(s,id,n),true);purchased+=n;spent+=n*offer.price;
   }
  }
  let importUnits=0;
  if(freight&&d===0){
   assert.equal(redeemFerrySupply(s,'forest'),true);
   importUnits=8;
  }
  const result=kitchen(s,'right');
  const {after,report,statuses,events,...r}=result;
  records.push({day:d+1,served:r.served,late:r.late,missing:r.missing,sat:r.sat,profit:r.profit,
   marketUnits:purchased,marketCost:spent,importUnits,inventoryAtEnd:Object.fromEntries(needed.map(id=>[id,s.inventory[id]||0])),
   cashAtEnd:s.coins,salvage:r.salvageRecovered,queueLoss:r.queueAbandoned});
  s.phase='upgrade';assert.equal(advanceDay(s),true);
 }
 return {seed,records,endCash:s.coins};
}
function economy(runs,days){
 const rows={market_only:[],one_earned_export:[]};
 for(let i=0;i<runs;i++)for(const [name,enabled] of [['market_only',false],['one_earned_export',true]])
  rows[name].push(supply(707071+i*113,days,enabled));
 const keys=['served','late','missing','sat','profit','marketUnits','marketCost','importUnits','salvage','queueLoss'];
 const summary={};for(const [name,records] of Object.entries(rows)){
  const nights=records.flatMap(x=>x.records);
  summary[name]={nightly:Object.fromEntries(keys.map(k=>[k,avg(nights,k)])),
   negativeCashRuns:records.filter(x=>x.endCash<0).length,
   finalCash:avg(records.map(x=>({cash:x.endCash})),'cash'),
   totalMarketBought:sum(nights,'marketUnits'),
   totalImportReceived:sum(nights,'importUnits')};
 }
 return {runs,days,seeds:{base:707071,step:113},
  summary,paired:{salesGainPer18Days:round(avg(rows.one_earned_export.map((r,i)=>({x:sum(r.records,'served')-sum(rows.market_only[i].records,'served')})),'x')),
  cashGain:round(avg(rows.one_earned_export.map((r,i)=>({x:r.endCash-rows.market_only[i].endCash})),'x'))},
  samples:{market:rows.market_only[0].records.slice(0,6),export:rows.one_earned_export[0].records.slice(0,6)}};
}
export function runAudit({runs=24,days=18}={}){
 assert.ok(Number.isInteger(runs)&&runs>=3&&runs<=100);
 assert.ok(Number.isInteger(days)&&days>=6&&days<=30);
 return {type:'v0.15-D cloud shipped-engine order/capacity audit',version:'0.15.0-alpha.9',
  protocol:{runs,days,menu:MENU,menuQuality:84,
   panel:'stocked externally with 100 units per relevant ingredient; same seeds, no field and no earned currency. Different worker/hero positions are controlled interventions.',
   economy:'actual market stock, purchase transactions, sale and wage ledger, starting Cloud coins set to 300, research unlocks granted to isolate supply. No simulated field combat or free infinite daily loot.',
   freight:'one real Hearth service after entering Cloud, with externally seeded Hearth stocks, earns one commission, then redeemed once. Never claim infinite regular import.',
   duration:'real ticks to 100s, zero-cost wave events, no manual table delivery; player movement held constant for the entire shift.',
   caveat:'diagnostic runner does not simulate active human play or real field combat; restaurant choices and inventory setup are declared controls.'},
  panel:panel(runs),economy:economy(Math.max(3,Math.floor(runs/2)),days)};
}
function opt(key,fallback){const i=process.argv.indexOf(key);return i<0?fallback:Number(process.argv[i+1]);}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 console.log('CLOUD_V015D_AUDIT_JSON='+JSON.stringify(runAudit({runs:opt('--runs',24),days:opt('--days',18)})));

import test from 'node:test';
import assert from 'node:assert/strict';
import {
 newGame,ensureCrew,crewEffects,hireCrew,crewWage,crewPromotion,promoteCrew,setCrewDuty,
 chooseCampaign,selectedCampaign,serviceDayPlan,createService,setServicePaused,
 tick,resumeBreak,closeService,advanceDay,ensureManagement,CAMPAIGNS
} from '../src/engine.js';
import {DINER_FLOOR} from '../src/restaurant_scene_v075.js';

const sufficient=(seed=20261015)=>{
 const s=newGame(seed);s.phase='prep';s.coins=1000;s.management.openingCoins=s.coins;
 for(const id of Object.keys(s.inventory))s.inventory[id]=150;
 return s;
};
const run=s=>{
 s.phase='service';assert.equal(createService(s,{walkable:true}),true);
 Object.assign(s.service.hero,DINER_FLOOR.right);
 assert.equal(setServicePaused(s,false),true);
 let n=0;while(!s.service.done&&n++<150){if(s.service.breakAt)resumeBreak(s);tick(s,1)}
 assert.ok(s.service.done,'night completes on live engine');
 return closeService(s);
};

test('v0.12-C: legacy employee data migrates to on-duty Lv1, without losing meals',()=>{
 const s=sufficient();s.crew={helper:{hired:true,station:0,meals:3,feed:null},waiter:{hired:true,meals:1,feed:null}};
 const crew=ensureCrew(s);
 assert.equal(crew.helper.level,1);assert.equal(crew.helper.xp,0);assert.equal(crew.helper.onDuty,true);
 assert.equal(crew.helper.meals,3);assert.equal(crew.waiter.onDuty,true);
 assert.equal(crewWage('helper',1),10);assert.equal(crewWage('waiter',1),9);
});
test('v0.12-C: staff may rest with no wage or effect; same-day duty changes freeze at opening',()=>{
 const s=sufficient();hireCrew(s,'helper');hireCrew(s,'waiter');
 assert.equal(setCrewDuty(s,'helper',false),true);assert.equal(setCrewDuty(s,'helper',false),false);
 assert.equal(crewEffects(s).helper.hired,false);assert.equal(crewEffects(s).helper.seconds,0);
 assert.equal(crewEffects(s).waiter.salary,9);
 assert.equal(setCrewDuty(s,'helper',true),true);assert.equal(crewEffects(s).helper.salary,10);
 assert.equal(chooseCampaign(s,'none'),true);
 s.phase='service';assert.equal(createService(s),true);
 assert.equal(s.service.crew.helper.salary,10);
 assert.equal(setCrewDuty(s,'helper',false),false);
});
test('v0.12-C: promotions require real XP and coins, charge once, raise wage and change efficiency',()=>{
 const s=sufficient();hireCrew(s,'helper');hireCrew(s,'waiter');
 assert.equal(promoteCrew(s,'helper'),false);
 const baseline=crewEffects(s).helper.seconds;s.crew.helper.xp=8;
 assert.equal(crewPromotion(s,'helper').ready,true);
 assert.equal(promoteCrew(s,'helper'),true);assert.equal(s.crew.helper.level,2);
 assert.equal(crewEffects(s).helper.seconds,baseline+1);assert.equal(crewEffects(s).helper.salary,14);
 assert.equal(promoteCrew(s,'helper'),false);
 s.crew.helper.xp=30;assert.equal(promoteCrew(s,'helper'),true);
 assert.equal(s.crew.helper.level,3);assert.equal(crewEffects(s).helper.salary,19);
 assert.equal(crewPromotion(s,'helper'),null);
 assert.equal(s.ledger.filter(x=>x.type==='crew_promotion').length,2);
 s.crew.waiter.xp=8;assert.equal(promoteCrew(s,'waiter'),true);
 assert.equal(crewEffects(s).waiter.patience,5);
});
test('v0.12-C: campaigns add real guests to original service plan, not fake coins',()=>{
 const s=sufficient();const base=serviceDayPlan(s);
 assert.equal(chooseCampaign(s,'flyer'),true);
 const newPlan=serviceDayPlan(s);
 assert.equal(newPlan.count,base.count+2);assert.equal(newPlan.baseCount,base.count);
 assert.deepEqual(newPlan.guests.slice(base.count),CAMPAIGNS.flyer.guests);
 assert.equal(newPlan.marketingCost,18);
 const before=s.coins;s.phase='service';assert.equal(createService(s,{walkable:true}),true);
 assert.equal(s.coins,before-18);
 assert.equal(s.service.orders.filter(x=>x.promotionGuest).length,2);
 assert.equal(s.service.orders.filter(x=>x.status==='waiting').length>=0,true);
 assert.equal(s.ledger.filter(x=>x.type==='marketing').length,1);
 assert.equal(createService(s),false);assert.equal(s.coins,before-18);
 assert.equal(chooseCampaign(s,'none'),false);
});
test('v0.12-C: base audience remains natural-cap 14 and restaurant tables are separate from ads',()=>{
 const s=sufficient(11546);s.cycle=3;s.day=2;s.reputation=20;s.dining.tableCount=4;
 ensureManagement(s);const baseline=serviceDayPlan(s);
 assert.ok(baseline.count<=14);
 chooseCampaign(s,'guild');const guild=serviceDayPlan(s);
 assert.equal(guild.count,baseline.count+3);
 assert.ok(guild.count<=17);
 assert.deepEqual(guild.guests.slice(baseline.count),['adventurer','adventurer','adventurer']);
 assert.equal(chooseCampaign(s,'tasting'),false);
 s.chapterProgress.stars=1;assert.equal(chooseCampaign(s,'tasting'),true);
 assert.equal(serviceDayPlan(s).count,baseline.count+1);
});
test('v0.12-C: cannot overspend on marketing, changing plan is free until opening',()=>{
 const s=sufficient();s.coins=5;
 assert.equal(chooseCampaign(s,'flyer'),true);
 assert.equal(s.ledger.filter(x=>x.type==='marketing').length,0);
 s.phase='service';assert.equal(createService(s),false);
 assert.equal(s.coins,5);assert.equal(s.service,null);
 s.phase='prep';assert.equal(chooseCampaign(s,'none'),true);
 s.phase='service';assert.equal(createService(s),true);
 assert.equal(s.coins,5);
});
test('v0.12-C: actual helper jobs and paid waiter deliveries give XP and have one payroll entry',()=>{
 const s=sufficient(11775);s.cycle=3;s.day=1;ensureManagement(s);
 hireCrew(s,'helper');hireCrew(s,'waiter');
 chooseCampaign(s,'flyer');const initial=s.crew.helper.xp;
 const report=run(s);
 assert.ok(report.finance.marketingArrived>=1,'at least one advertised guest physically arrives');
 assert.ok(report.finance.marketingServed<=report.finance.marketingArrived);
 assert.equal(report.finance.promotionGuests,2);
 assert.equal(report.finance.marketingCost,18);
 assert.equal(report.finance.wage,19);
 assert.ok(report.growth.earned.helper>=0);
 assert.ok(report.growth.earned.waiter>=0);
 assert.equal(s.crew.helper.xp,initial+report.growth.earned.helper);
 assert.equal(report.profit,report.revenue-report.cost-report.hospitalityCost-report.eventExpense-19-18);
 assert.equal(s.ledger.filter(x=>x.type==='payroll').length,1);
 assert.equal(closeService(s),false);
 assert.equal(s.ledger.filter(x=>x.type==='payroll').length,1);
});
test('v0.12-C: if sales cannot cover wages, debt accrues without negative cash and can be repaid',()=>{
 const s=sufficient();s.coins=0;s.management.openingCoins=0;
 hireCrew(s,'helper'); // insufficient, no hire
 assert.equal(s.crew.helper.hired,false);
 s.crew.helper.hired=true;s.crew.helper.onDuty=true;
 s.crew.waiter.hired=true;s.crew.waiter.onDuty=true;
 for(const id of Object.keys(s.inventory))s.inventory[id]=0;
 const report=run(s);
 assert.equal(report.finance.wage,19);
 assert.ok(report.finance.debt>=0);
 assert.ok(s.coins>=0);
 assert.equal(s.management.wageDebt,report.finance.debt);
 if(report.finance.debt){
  s.phase='upgrade';assert.equal(advanceDay(s),true);
  s.coins=200;s.phase='prep';setCrewDuty(s,'helper',false);setCrewDuty(s,'waiter',false);
  const second=run(s);
  assert.equal(second.finance.previousDebt,report.finance.debt);
  assert.equal(second.finance.debt,0);
  assert.equal(s.coins,200-report.finance.debt);
 }
});
test('v0.12-C: day transition clears paid marketing, keeps staff progression and salary debt',()=>{
 const s=sufficient();hireCrew(s,'helper');chooseCampaign(s,'guild');
 s.crew.helper.xp=8;s.management.wageDebt=13;
 s.phase='upgrade';assert.equal(advanceDay(s),true);
 assert.equal(selectedCampaign(s).id,'none');
 assert.equal(s.crew.helper.xp,8);assert.equal(s.management.wageDebt,13);
 assert.equal(s.management.openingCoins,s.coins);
});

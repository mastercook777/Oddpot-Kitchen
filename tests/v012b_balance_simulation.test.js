import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,serviceDayPlan} from '../src/engine.js';
import {simulateNight,aggregateNightCases,simulateSupplyRun,
  aggregateSupplyRuns,FIELD_SUPPLY_ASSUMPTION} from '../scripts/simulate-restaurant-balance.mjs';

test('v012b: seeded real-engine service benchmark is fully deterministic',()=>{
 const opt={tables:4,helper:true,waiter:true,hero:'POT',quality:82};
 const first=simulateNight(20261015,opt);
 assert.deepEqual(simulateNight(20261015,opt),first);
 assert.ok(first.orders>=6);
 assert.ok(first.orders<=14);
 assert.ok(first.served+first.left+first.rejected===first.orders);
 assert.ok(first.rating.score>=0&&first.rating.score<=100);
 assert.ok(first.revenue>=0&&first.materialCost>=0);
});

test('v012b: table count does not itself add phantom scheduled orders in current engine',()=>{
 for(let seed=900;seed<910;seed++){
  const a=newGame(seed),b=newGame(seed);
  for(const s of [a,b]){s.cycle=3;s.day=1;s.reputation=20;s.chapterProgress.stars=1;}
  a.dining.tableCount=2;b.dining.tableCount=4;
  const p=serviceDayPlan(a),q=serviceDayPlan(b);
  assert.equal(p.count,q.count);
  assert.deepEqual(p.guests,q.guests);
 }
});

test('v012b: balanced, premium and low-quality cases remain comparable through genuine star scorer',()=>{
 const configs=[
  {id:'balanced',tables:4,helper:true,waiter:true,hero:'POT'},
  {id:'low-quality',tables:4,helper:true,waiter:true,hero:'POT',quality:65},
  {id:'premium',tables:4,helper:true,waiter:true,hero:'POT',
   menu:['flame_beef','chicken_stew','garlic_beef']}
 ];
 const rows=aggregateNightCases(20,configs);
 assert.equal(rows.length,3);
 for(const row of rows){
  assert.ok(row.firstStarPassPct>=0&&row.firstStarPassPct<=100);
  assert.ok(row.served<=row.orders);
  assert.ok(row.contribution<=row.revenue);
 }
 // Baseline observations, not desired permanent balance targets.
 assert.ok(rows[0].served>rows[2].served,
  'current balanced production should outperform slower premium build');
 assert.ok(rows[0].firstStarMean>rows[1].firstStarMean,
  'quality should matter to total score even if pass-rate threshold is weak');
});

test('v012b: 21-day market cash and an explicitly hypothetical field yield are tracked separately',()=>{
 const result=simulateSupplyRun(20261015,{days:7,fieldPerDay:FIELD_SUPPLY_ASSUMPTION});
 assert.equal(result.rows.length,7);
 assert.equal(result.rows[0].cashStart,500);
 for(let i=0;i<result.rows.length;i++){
  const r=result.rows[i];
  assert.equal(r.cashStart+r.cashDelta,r.cashEnd);
  if(i>0)assert.equal(result.rows[i-1].cashEnd,r.cashStart);
  assert.ok(r.marketSpent>=0);
  assert.ok(r.served<=r.orders);
 }
 assert.equal(result.rows.at(-1).cashEnd,result.endingCoins);
 const b=aggregateSupplyRuns(3,7,{});
 assert.equal(b.fieldPerDay&&Object.keys(b.fieldPerDay).length,0);
 assert.equal(b.runs,3);
});

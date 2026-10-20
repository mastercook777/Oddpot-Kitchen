import assert from 'node:assert/strict';
import {newGame,travelPortal,createService,setServicePaused,tick,resumeBreak,closeService} from '../src/engine.js';

function sample(filled,starred){
 const totals={orders:0,served:0,profit:0,queuePeak:0,abandoned:0};
 for(let seed=1;seed<=30;seed++){
  const s=newGame(seed);s.chapterProgress.stars=3;
  assert.equal(travelPortal(s,'cloud'),true);s.phase='service';
  s.menu=['rice_moss_stir','rice_egg_pot','sour_moss_stir'];
  for(const id of s.menu)s.recipes[id]=80;
  for(const id of ['cloud_rice','sky_moss','storm_egg','sour_bell'])s.inventory[id]=filled?80:2;
  s.cloudProgress.stars=starred?1:0;
  assert.equal(createService(s),true);setServicePaused(s,false);
  for(let i=0;i<180&&!s.service.done;i++){
   if(s.service.breakAt)resumeBreak(s);
   tick(s,1);
  }
  assert.equal(s.service.done,true);
  const r=closeService(s);assert.ok(r);
  totals.orders+=r.totalOrders;totals.served+=r.served;totals.profit+=r.profit;
  totals.queuePeak+=r.queuePeak||0;totals.abandoned+=r.queue?.abandoned||0;
 }
 return Object.fromEntries(Object.entries(totals).map(([key,value])=>[key,Math.round(value/30*100)/100]));
}
const results={stocked:{before:sample(true,false),starred:sample(true,true)},scarce:{before:sample(false,false),starred:sample(false,true)}};
assert.ok(results.stocked.starred.orders>results.stocked.before.orders);
assert.ok(results.stocked.starred.served>results.stocked.before.served);
assert.equal(results.scarce.starred.served,results.scarce.before.served,'the star must not invent stock or sales');
console.log(JSON.stringify(results,null,2));

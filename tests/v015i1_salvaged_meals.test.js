import test from 'node:test';
import assert from 'node:assert/strict';
import {
 newGame,createService,tick,consume,recipeCraftSnapshot,save,load,closeService,advanceDay,
 selectArrivalDish,travelPortal
} from '../src/engine.js';
import {RECIPES} from '../src/data.js';

function service(seed=981,{walkable=false}={}){
 const s=newGame(seed);s.phase='service';
 assert.equal(createService(s,{walkable}),true);
 const v=s.service;v.paused=false;v.breakSeen=[20,41];
 for(const o of v.orders.slice(1)){o.status='left';o.leftAt=0}
 return s;
}
function startCookedOrder(s,recipeId='chicken_stew',left=4,{premium=false}={}){
 const v=s.service,o=v.orders[0],craft=recipeCraftSnapshot(s,recipeId);
 o.recipeId=recipeId;o.craft=structuredClone(craft);o.fit=91;o.orderedAt=0;
 o.arrival=0;o.patience=1;o.status='cooking';o.started=0;o.premium=premium;
 const stock={...s.inventory};
 assert.equal(consume(s,craft.ingredientIds,'test-start-'+recipeId),true);
 v.cost+=RECIPES[recipeId].cost;
 v.stations.POT={orderId:o.id,left,quality:86};
 return {o,craft,stock};
}
test('late guest leaves while dish is cooking; real completed meal becomes reusable once with no free stock',()=>{
 const s=service(811);const {o,craft,stock}=startCookedOrder(s);
 tick(s,2);
 assert.equal(o.status,'left');assert.equal(s.prep.chicken_stew||0,0,'half-cooked food cannot be reused');
 tick(s,2);
 assert.equal(s.prep.chicken_stew,1,'only a finished plate becomes prepared stock');
 assert.equal(s.prepVariants.chicken_stew[0].cookedQuality,86);
 assert.equal(s.prepVariants.chicken_stew[0].variantId,craft.variantId);
 assert.equal(s.service.events.filter(e=>e.type==='salvaged_ready').length,1);
 assert.equal(s.ledger.filter(e=>e.type==='sale').length,0);
 for(const id of craft.ingredientIds)assert.equal(s.inventory[id],stock[id]-craft.ingredientIds.filter(x=>x===id).length);
 assert.equal(s.service.salvageStats.recovered,1);
 const b=s.service.orders[1];b.recipeId=o.recipeId;b.craft=recipeCraftSnapshot(s,o.recipeId);b.fit=91;
 b.status='queued';b.orderedAt=s.service.time;b.arrival=s.service.time;b.patience=80;
 s.service.queued.push(b.id);
 tick(s,1);
 assert.equal(b.status,'flying');
 assert.equal(b.quality,86,'original cooked quality, not invented fresh dish');
 assert.equal(s.prep.chicken_stew,0);
 assert.equal(s.service.salvageStats.reused,1);
 assert.equal(s.service.events.filter(e=>e.type==='salvage_used').length,1);
 assert.equal(s.service.cost,RECIPES.chicken_stew.cost);
 tick(s,6);
 assert.equal(s.ledger.filter(e=>e.type==='sale').length,1,'only the second real diner pays');
 for(const id of craft.ingredientIds)assert.equal(s.inventory[id],stock[id]-craft.ingredientIds.filter(x=>x===id).length,'reuse never double charges or refunds ingredients');
});
test('prepared but not served plate is saved if diner loses patience waiting for delivery',()=>{
 const s=service(881,{walkable:true}),v=s.service;
 const o=v.orders[0];o.status='pickup';o.recipeId='chicken_stew';o.craft=recipeCraftSnapshot(s,o.recipeId);o.quality=88;
 o.pickupAt=0;o.arrival=0;o.patience=1;o.orderedAt=0;
 tick(s,2);assert.equal(o.status,'left');
 assert.equal(s.prep.chicken_stew,1);
 assert.equal(v.salvageStats.recovered,1);
 assert.equal(v.events.filter(e=>e.type==='salvaged_ready').length,1);
 tick(s,2);assert.equal(v.salvageStats.recovered,1,'already reclaimed plate cannot be duplicated');
 assert.equal(s.ledger.filter(e=>e.type==='sale').length,0);
});
test('no production or invalid premium plate creates edible salvage, even after kitchen finishes',()=>{
 const s=service(125);
 const {o}=startCookedOrder(s,'chicken_stew',3,{premium:true});
 tick(s,4);
 assert.equal(o.status,'left');assert.equal(s.prep.chicken_stew||0,0);
 assert.equal(s.service.events.filter(e=>e.type==='waste').length,1);
 const q=s.service.orders[2];q.status='queued';q.recipeId='chicken_stew';q.orderedAt=0;
 q.arrival=0;q.patience=1;s.service.queued.push(q.id);
 tick(s,3);assert.equal(s.prep.chicken_stew||0,0,'unstarted order cannot produce a cooked meal');
});
test('salvage is same-day, per-variant and idempotent across restore and report',()=>{
 const old=globalThis.localStorage,store=new Map();
 globalThis.localStorage={setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)};
 try{
  const s=service(770);const {o}=startCookedOrder(s);tick(s,4);
  assert.equal(s.prep.chicken_stew,1);
  save(s);const r=load();assert.ok(r);
  assert.equal(r.prep.chicken_stew,1);
  const v=r.service,b=v.orders[1];b.status='queued';b.recipeId='chicken_stew';b.craft=recipeCraftSnapshot(r,b.recipeId);
  b.craft.variantId='different-variant';b.arrival=v.time;b.patience=75;b.orderedAt=v.time;v.queued.push(b.id);
  tick(r,1);
  assert.equal(r.prep.chicken_stew,1,'a different technique must not consume saved plate');
  assert.equal(r.service.salvageStats.reused,0);
  v.orders.forEach(x=>{if(x.status==='left'||x.status==='rejected'||x.status==='served')return;x.status='left';x.leftReason='营业结束';x.leftAt=v.time});
  v.stations.POT=null;v.done=true;
  const report=closeService(r);assert.ok(report);
  assert.deepEqual(report.salvage,{recovered:1,reused:0,expired:1});
  assert.equal(closeService(r),false);
  r.phase='upgrade';assert.equal(advanceDay(r),true);
  assert.equal(r.prep.chicken_stew,undefined,'prepared meals do not survive into tomorrow');
 }finally{globalThis.localStorage=old}
});

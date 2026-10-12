import test from 'node:test';
import assert from 'node:assert/strict';
import {CUSTOMERS} from '../src/data.js';
import {
 newGame,ensureDailyMarket,purchase,roomExpansionAvailable,expandDiningRoom,
 totalBusinessDay,tableCapacity,advanceDay,createService,tick,setServicePaused,
 firstChallenge,serviceDayPlan
} from '../src/engine.js';
import {dinerFloor,dinerSpot,dinerBlocked} from '../src/restaurant_scene_v075.js';

test('v0.9 mystery market is seeded, finite, persistent and debits gold once',()=>{
 const s=newGame(222),market=ensureDailyMarket(s);
 assert.ok(Object.keys(market.goods).length>=3 && Object.keys(market.goods).length<=4);
 assert.strictEqual(ensureDailyMarket(s),market);
 const [id,offer]=Object.entries(market.goods)[0],original=offer.stock;
 const cash=s.coins;
 assert.equal(purchase(s,id),true);
 assert.equal(s.coins,cash-offer.price);
 assert.equal(offer.stock,original-1);
 for(let i=1;i<original;i++)assert.equal(purchase(s,id),true);
 assert.equal(offer.stock,0);
 assert.equal(purchase(s,id),false);
 assert.equal(s.inventory[id],(newGame(222).inventory[id]||0)+original);
 assert.deepEqual(newGame(222).market,null);
 const twin=ensureDailyMarket(newGame(222));
 assert.equal(twin.goods[id].initialStock,original);
 assert.equal(twin.goods[id].price,offer.price);
});

test('v0.9 room expansion is permanent, ledgered and changes the floor collision',()=>{
 const s=newGame(333);
 assert.equal(roomExpansionAvailable(s),false);
 s.day=3;s.phase='upgrade';s.reputation=4;s.coins=200;
 assert.equal(roomExpansionAvailable(s),true);
 assert.equal(expandDiningRoom(s),true);
 assert.equal(expandDiningRoom(s),false);
 assert.equal(s.coins,40);
 assert.equal(tableCapacity(s),6);
 assert.equal(dinerFloor(s).tables.length,3);
 assert.equal(dinerSpot({x:.385,y:.562},s),'TABLE2');
 assert.equal(dinerBlocked(.255,.555,s),true);
 assert.equal(advanceDay(s),true);
 assert.equal(totalBusinessDay(s),4);
 assert.equal(tableCapacity(s),6);
 assert.equal(s.market,null);
});

test('v0.9 six-seat dining room can actually seat two additional arrivals',()=>{
 const activeSeats=count=>{
  const s=newGame(5001);
  s.dining.tableCount=count;s.phase='service';
  assert.equal(createService(s,{walkable:false}),true);
  for(const o of s.service.orders)o.arrival=0;
  assert.equal(setServicePaused(s,false),true);
  tick(s,1);
  return s.service.orders.filter(o=>o.tableId!==null).length;
 };
 assert.equal(activeSeats(2),4);
 assert.equal(activeSeats(3),6);
});

test('v0.9 fantasy customer archetypes and chef challenge are not a cosmetic cycle rerun',()=>{
 assert.match(CUSTOMERS.adventurer.name,/矮人/);
 assert.match(CUSTOMERS.family.name,/菌帽/);
 assert.match(CUSTOMERS.regular.name,/史莱姆/);
 assert.match(CUSTOMERS.critic.name,/幽灵/);
 const first=newGame(345),later=newGame(345);
 first.day=3;later.cycle=2;later.day=3;
 assert.equal(firstChallenge(first),true);
 assert.equal(firstChallenge(later),false);
 later.reputation=11;
 assert.ok(serviceDayPlan(later).count>=8 && serviceDayPlan(later).count<=14);
});

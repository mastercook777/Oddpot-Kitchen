import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame} from '../src/engine.js';
import {DINER_FLOOR,dinerFloor,dinerSeatPoint,dinerGuestRoute,dinerQueueGuests,dinerWeather} from '../src/restaurant_scene_v075.js';
import {drawDinerDoorway} from '../src/scenes_v04.js';

test('seated guests overlap the actual chair instead of standing one row below the table',()=>{
 const s=newGame();s.dining.tableCount=3;
 for(const table of [0,1,2])for(const seat of [0,1]){
  const floor=dinerFloor(s),pt=floor.tables[table],person=dinerSeatPoint(table,seat,s);
  const chairX=pt.x+(seat===0?-1:1)*.77*Math.min(51,Math.max(39,320*.126))/320;
  assert.ok(Math.abs(person.y-pt.y)<.006,'seated feet remain in chair row');
  assert.ok(Math.abs(person.x-chairX)*320<6,'sprite horizontally covers stool');
  const route=dinerGuestRoute(table,seat,s);
  assert.deepEqual(route.at(-1),person,'real guest movement ends exactly on chair');
 }
});
test('door view shows only genuine arrived and still-waiting orders',()=>{
 const s=newGame();s.service={time:12,orders:[
  {id:'a',segment:'regular',status:'waiting',arrival:9},
  {id:'b',segment:'family',status:'waiting',arrival:12},
  {id:'future',status:'waiting',arrival:13},
  {id:'occupied',status:'ordering',arrival:1},
  {id:'done',status:'served',arrival:2}
 ]};
 assert.deepEqual(dinerQueueGuests(s).map(x=>x.id),['a','b']);
 assert.deepEqual(dinerQueueGuests(s,10).map(x=>x.id),['a']);
 s.service.orders[0].status='entering';
 assert.deepEqual(dinerQueueGuests(s).map(x=>x.id),['b']);
});
test('weather vignette is day-seeded, independent from wall clock, and follows rain scenario',()=>{
 const s=newGame(901);
 assert.equal(dinerWeather(s),dinerWeather(s));
 s.service={scenario:'雨夜暖汤',time:16,orders:[]};
 assert.equal(dinerWeather(s),'rain');
 assert.equal(dinerFloor(s).doorwayView.top,.857);
});
test('Canvas entrance cutaway is visible at small widths, uses real queue without mutating orders',()=>{
 const s=newGame();s.service={scenario:'雨夜暖汤',time:6,orders:[{id:'one',segment:'regular',status:'waiting',arrival:1}]};
 const original=JSON.stringify(s.service.orders);
 const methods=['save','restore','fillRect','beginPath','roundRect','fill','stroke','strokeRect','rect','clip',
   'translate','scale','arc','moveTo','lineTo','fillText','ellipse'];
 const ctx={};for(const key of methods)ctx[key]=()=>{};
 ctx.createLinearGradient=()=>({addColorStop(){}});
 const state=drawDinerDoorway(ctx,s,6,320,570);
 assert.equal(state.queue,1);assert.equal(state.weather,'rain');
 assert.equal(JSON.stringify(s.service.orders),original);
});
test('venue name remains in primary header, not duplicated below service controls',()=>{
 const scene=readFileSync(new URL('../src/scenes_v04.js',import.meta.url),'utf8');
 assert.doesNotMatch(scene,/text\(c,'ODDPOT  ·  怪味食堂'/);
 assert.match(scene,/drawDinerDoorway\(c,s,v\?\.time\?\?t,w,h\)/);
 assert.match(scene,/if\(a\.seat&&a\.order\)/);
});

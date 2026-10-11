import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeServiceLab,stepServiceLab,nearbyZone,snapshotLab,kitchenBusy,laboratoryMode,serviceSpecialAction,activateServiceSpecial} from '../experiments/v07-service-lab-engine.js';
const sim=(s,sec,dx=0,dy=0)=>{for(let i=0;i<Math.ceil(sec/.05);i++)stepServiceLab(s,dx,dy,.05);return s;};
test('solo restaurant: no chef present means hot kitchen stops (no magical autoproduction)',()=>{
 const s=makeServiceLab();sim(s,5);
 const order=kitchenBusy(s,'WOK');
 assert.ok(order,'first customer has an actual wok order');
 assert.equal(order.left,order.time,'the dish cannot cook itself without a chef');
 assert.equal(s.score.autoSeconds,0);
 assert.match(laboratoryMode(s),/主厨做菜、取餐、上菜/);
});
test('standing at a stove cooks normally forever without involuntary energy spending',()=>{
 const s=makeServiceLab();sim(s,2);
 s.hero.x=.25;s.hero.y=.37;
 const before=kitchenBusy(s,'WOK').left;
 sim(s,1.25);
 assert.ok(kitchenBusy(s,'WOK').left<before,'standing starts ordinary cooking');
 assert.equal(s.hero.assists,0,'no unrequested boost while standing');
 assert.equal(s.hero.energy,6,'ordinary cooking never costs stamina');
 assert.equal(serviceSpecialAction(s)?.kind,'burst');
 const left=kitchenBusy(s,'WOK').left;
 assert.equal(activateServiceSpecial(s),true,'explicit action needed to boost');
 assert.equal(s.hero.assists,1);assert.equal(s.hero.energy,4);
 assert.ok(kitchenBusy(s,'WOK').left<=left-2);
 sim(s,1.25);
 assert.equal(s.hero.assists,1,'cannot trigger same-order boost again');
 assert.equal(activateServiceSpecial(s),false);
});
test('chef cannot cook a second station simultaneously if alone',()=>{
 const s=makeServiceLab();sim(s,7);
 const pot=kitchenBusy(s,'POT');assert.ok(pot);
 const potLeft=pot.left;
 s.hero.x=.25;s.hero.y=.37;sim(s,2);
 assert.equal(kitchenBusy(s,'POT').left,potLeft,'other pot remains unattended');
});
test('hiring helper makes wok cook automatically while hero away',()=>{
 const s=makeServiceLab({helper:true});sim(s,4);
 assert.ok(kitchenBusy(s,'WOK').left<7);
 assert.ok(s.score.autoSeconds>1);
 assert.match(laboratoryMode(s),/阿火/);
});
test('waiter alone improves front service but cannot magically cook dishes',()=>{
 const s=makeServiceLab({waiter:true});sim(s,4);
 const first=kitchenBusy(s,'WOK');
 assert.equal(first.left,first.time);
 assert.equal(first.patience,35);
 assert.equal(s.score.autoSeconds,0);
});
test('standing by a table does not auto-spend stamina; emergency comfort requires a tap',()=>{
 const s=makeServiceLab();sim(s,2);
 s.hero.x=.27;s.hero.y=.61;
 const o=s.orders[0],initial=o.patience;
 sim(s,.8);
 assert.equal(o.patience,initial,'ordinary proximity does not grant paid comfort');
 assert.equal(s.hero.energy,6);
 assert.equal(serviceSpecialAction(s),null,'healthy patience does not need emergency action');
 o.patience=s.time-o.arrive+10;
 assert.equal(serviceSpecialAction(s)?.kind,'comfort');
 const before=o.patience;
 sim(s,.8);
 assert.equal(o.patience,before,'even emergency cannot auto-consume');
 assert.equal(activateServiceSpecial(s),true);
 assert.equal(o.patience,before+4);assert.equal(s.hero.comforts,1);
 assert.equal(s.hero.energy,5);
 assert.equal(activateServiceSpecial(s),false,'once per order');
});
test('staff combinations remain distinct; no payroll/menus/coins altered in prototype',()=>{
 const scenarios=['单人开店','阿火掌一口锅','小芽自动上菜','阿火帮厨、小芽自动上菜'];
 for(const [i,staff] of [{},{helper:true},{waiter:true},{helper:true,waiter:true}].entries()){
  const s=makeServiceLab(staff);assert.ok(laboratoryMode(s).includes(scenarios[i]));
  assert.equal(s.score.served,0);assert.equal(s.orders.length,0);
  assert.ok(!('coins' in s)&&!('inventory' in s)&&!('ledger' in s));
  assert.equal(snapshotLab(s).total,8);
 }
});
test('paused simulation cannot recover energy or progress orders',()=>{
 const s=makeServiceLab();sim(s,3);
 s.hero.energy=2;s.paused=true;const t=s.time,left=kitchenBusy(s,'WOK').left;
 sim(s,20);
 assert.equal(s.time,t);assert.equal(s.hero.energy,2);
 assert.equal(kitchenBusy(s,'WOK').left,left);
});
test('lab ships same joystickVector import as forest and native chef pixels',()=>{
 const html=readFileSync(new URL('../experiments/v07-walkable-diner-lab.html',import.meta.url),'utf8');
 assert.match(html,/import \{joystickVector\} from '\.\.\/src\/controls_v041\.js/);
 assert.match(html,/import \{pixelActor\} from '\.\.\/src\/pixels_v041\.js/);
 assert.match(html,/pointerdown/);assert.match(html,/pointermove/);
 assert.match(html,/data-mode="solo"/);assert.match(html,/data-mode="both"/);
 assert.ok(!html.includes('src/engine.js'),'lab should not touch production finances');
});

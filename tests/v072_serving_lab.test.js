import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {makeServiceLab,stepServiceLab,nearbyZone,kitchenBusy,carriedPlate,passOrder,serviceZoneIntent,snapshotLab} from '../experiments/v07-service-lab-engine.js';
const sim=(s,duration,dx=0,dy=0)=>{for(let i=0;i<Math.ceil(duration/.05);i++)stepServiceLab(s,dx,dy,.05);return s};
function prepareFinishedSolo(){
 const s=makeServiceLab();sim(s,1.15);
 const o=s.orders[0];assert.ok(o&&o.status==='cooking');
 s.hero.x=.25;s.hero.y=.37;o.left=1.55;
 sim(s,2.4);
 assert.equal(o.status,'pickup');
 assert.equal(passOrder(s)?.id,o.id);
 return {s,o};
}
function collect(s){
 s.hero.x=.50;s.hero.y=.47;assert.equal(nearbyZone(s.hero),'PASS');
 sim(s,.65);
}
function deliver(s,i=0){
 s.hero.x=i===0?.27:.73;s.hero.y=.61;
 assert.equal(nearbyZone(s.hero),'TABLE'+i);
 sim(s,.85);
}
test('full solo cook → pass pickup → carrying one dish → correct table auto-serve',()=>{
 const {s,o}=prepareFinishedSolo(),energy=s.hero.energy;
 collect(s);
 assert.equal(carriedPlate(s)?.id,o.id);
 assert.equal(o.status,'carried');
 assert.equal(s.score.served,0,'collecting must NOT count as successful delivery');
 assert.equal(passOrder(s),undefined,'carried plate not duplicated at pass');
 assert.equal(s.hero.energy,energy,'collecting meal is normal work, not energy special skill');
 deliver(s,0);
 assert.equal(o.status,'served');
 assert.equal(o.deliveredBy,'chef');
 assert.equal(s.hero.carryOrderId,null);
 assert.equal(s.score.served,1);
 assert.equal(s.score.manualServed,1);
 assert.equal(s.score.waiterServed,0);
 assert.equal(s.hero.energy,energy,'bringing meal to customer costs no energy');
 sim(s,1);
 assert.equal(s.score.served,1,'standing at table cannot earn same plate again');
});
test('table has TWO automatic functions with serving priority: wrong table cannot steal or comfort',()=>{
 const {s,o}=prepareFinishedSolo();
 collect(s);
 s.hero.x=.73;s.hero.y=.61;
 assert.equal(serviceZoneIntent(s).action,'wrong-table');
 sim(s,1);
 assert.equal(o.status,'carried');
 assert.equal(s.score.manualServed,0);
 assert.equal(s.hero.comforts,0);
 deliver(s,0);
 assert.equal(o.status,'served');
});
test('table without carried ready plate offers automatic comfort, once per actual order',()=>{
 const s=makeServiceLab();sim(s,2);
 s.hero.x=.27;s.hero.y=.61;
 const o=s.orders[0],initial=o.patience,energy=s.hero.energy;
 assert.equal(serviceZoneIntent(s).action,'comfort');
 sim(s,.9);
 assert.equal(o.patience,initial+4);assert.equal(s.hero.comforts,1);
 assert.equal(s.hero.energy,energy-1);
 sim(s,2);assert.equal(s.hero.comforts,1);
});
test('a completed plate on pass cannot teleport to table: must be collected first',()=>{
 const {s,o}=prepareFinishedSolo();
 s.hero.x=.27;s.hero.y=.61;
 sim(s,.8);
 assert.equal(o.status,'pickup');
 assert.equal(s.score.served,0);
 assert.equal(o.comforted,true,'can still reassure while food waits at pass');
});
test('waiter handles unattended dish automatically, no chef needed to deliver',()=>{
 const s=makeServiceLab({helper:true,waiter:true});s.hero.x=.50;s.hero.y=.80;
 sim(s,1.2);const o=s.orders[0];o.left=.2;
 sim(s,1.85);
 assert.equal(o.status,'served');
 assert.equal(o.deliveredBy,'waiter');
 assert.equal(s.score.waiterServed,1);
 assert.equal(s.score.manualServed,0);
});
test('manual pickup cancels waiter timer, and both cannot deliver one dish twice',()=>{
 const s=makeServiceLab({helper:true,waiter:true});s.hero.x=.50;s.hero.y=.80;
 sim(s,1.2);const o=s.orders[0];o.left=.1;
 sim(s,.20);assert.equal(o.status,'pickup');
 collect(s);assert.equal(o.status,'carried');
 sim(s,1.5);
 assert.equal(o.status,'carried','waiter does not duplicate the chef-carrying meal');
 deliver(s,0);
 assert.equal(s.score.served,1);assert.equal(s.score.waiterServed,0);
 assert.equal(s.score.manualServed,1);
});
test('no waiter: slow customer self-pickup is fallback and does not double-score',()=>{
 const {s,o}=prepareFinishedSolo();
 s.hero.x=.5;s.hero.y=.82;
 sim(s,8.2);
 assert.equal(o.status,'served');
 assert.equal(o.deliveredBy,'self');assert.equal(s.score.selfPicked,1);
 assert.equal(s.score.manualServed,0);
 assert.equal(s.hero.carryOrderId,null);
});
test('chef carrying a plate cannot simultaneously cook another pan',()=>{
 const {s}=prepareFinishedSolo();collect(s);
 s.hero.x=.75;s.hero.y=.37;
 const second=s.orders.find(o=>o.status==='cooking'&&o.station==='POT');
 if(!second){s.orders.push({id:'held-pot',name:'蘑菇焖鸡',station:'POT',table:1,
  arrive:s.time,left:6,time:6,patience:60,status:'cooking',comforted:false,boosted:false,pickup:0});
 s.kitchen.POT='held-pot'}
 const o=kitchenBusy(s,'POT'),before=o.left;
 sim(s,1);
 assert.equal(o.left,before,'one chef cannot carry a plate AND cook a pot');
});
test('expired guest cancels carried plate, no late double delivery',()=>{
 const {s,o}=prepareFinishedSolo();collect(s);
 o.patience=s.time-o.arrive+.1;
 sim(s,.5);
 assert.equal(o.status,'left');
 assert.equal(s.hero.carryOrderId,null);
 deliver(s,0);
 assert.equal(s.score.served,0);
});
test('the experimental UI actually draws one carried plate, pass plates and staff route',()=>{
 const html=readFileSync(new URL('../experiments/v07-walkable-diner-lab.html',import.meta.url),'utf8');
 const moduleCode=html.split('<script type="module">')[1]?.split('</script>')[0];
 assert.ok(moduleCode,'laboratory must include its playable script');
 const syntax=spawnSync(process.execPath,['--check','--input-type=module'],{input:moduleCode,encoding:'utf8'});
 assert.equal(syntax.status,0,'lab HTML module syntax: '+syntax.stderr);
 assert.match(html,/LAB_PASS/);
 assert.match(html,/const carrying=carriedPlate\(state\)/);
 assert.match(html,/drawScene/);
 assert.match(html,/出餐台 · 靠近自动取菜/);
 assert.match(html,/主厨亲自上菜|自动上菜|对应餐桌自动上菜/);
});

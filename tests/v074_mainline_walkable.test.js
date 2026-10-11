import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {newGame,createService,tick,setServicePaused,walkableSpecial,activateWalkableSpecial,advanceWalkableInteraction,recipeCraftSnapshot} from '../src/engine.js';
import {DINER_ACTOR_SCALE} from '../src/scenes_v04.js';
import {newServiceHero,walkServiceHero,heroZone,waiterDeliveryPose,HERO_PASS,HERO_STATIONS,HERO_TABLES} from '../src/walkable_restaurant_v07.js';

const initialize=(staff={})=>{
 const s=newGame();s.phase='service';for(const [id,on] of Object.entries(staff))s.crew[id].hired=on;
 assert.equal(createService(s,{walkable:true}),true);
 assert.equal(setServicePaused(s,false),true);return s;
};
function targeted(s,status='pickup',station='WOK'){
 const o=s.service.orders[0];o.status=status;o.recipeId='chili_meat';
 o.arrival=0;o.patience=90;o.tableId=0;o.seatId=0;o.craft=recipeCraftSnapshot(s,'chili_meat');
 o.quality=81;o.fit=78;o.pickupAt=0;o.started=0;
 s.service.orders=[o];s.service.queued=[];
 s.service.stations={WOK:null,POT:null};return o;
}
test('new official service enters walkable mode; old engine callers remain compatible',()=>{
 const s=initialize();assert.equal(s.service.walkable,true);
 assert.ok(s.service.hero);assert.equal(s.service.hero.energy,6);
 const old=newGame();old.phase='service';assert.equal(createService(old),true);
 assert.equal(old.service.walkable,false);assert.equal(old.service.hero,null);
});
test('natural-size actors: movable chef and both employees use original DINER_ACTOR_SCALE',()=>{
 assert.equal(DINER_ACTOR_SCALE,1.13);
 const src=readFileSync(new URL('../src/scenes_v04.js',import.meta.url),'utf8');
 assert.match(src,/pixelActor\(c,'chef',hero\.x\*w,hero\.y\*h,DINER_ACTOR_SCALE/);
 assert.match(src,/pixelActor\(c,'helper',[^\n]+DINER_ACTOR_SCALE/);
 assert.match(src,/pixelActor\(c,'waiter',[^\n]+DINER_ACTOR_SCALE/);
 assert.ok(!src.includes("pixelActor(c,'chef',hero.x*w,hero.y*h,1.5"),'hero must never be magnified');
 assert.match(src,/Small ICON only; no status words/);
});
test('character has finite, smooth world speed and table/counter collisions',()=>{
 const h=newServiceHero(),x=h.x,y=h.y;
 assert.ok(walkServiceHero(h,1,0,.05));assert.ok(h.x>x&&h.x-x<.025);assert.equal(h.y,y);
 for(let i=0;i<400;i++)walkServiceHero(h,1,1,.05);
 assert.ok(h.x<=.905&&h.y<=.915);
 assert.ok(h.y>=.155);
 const hx=newServiceHero();hx.x=.28;hx.y=.48;
 for(let i=0;i<60;i++)walkServiceHero(hx,0,1,.05);
 assert.ok(hx.y<.67,'table cannot be walked through');
 assert.equal(heroZone({...newServiceHero(),...HERO_PASS}),'PASS');
 assert.equal(heroZone({...newServiceHero(),...HERO_STATIONS.WOK}),'WOK');
 assert.equal(heroZone({...newServiceHero(),...HERO_TABLES[0]}),'TABLE0');
});
test('solo production requires protagonist present; same order never auto-finishes unattended',()=>{
 const s=initialize();const o=targeted(s,'cooking');
 s.service.stations.WOK={orderId:o.id,left:9,quality:81};
 s.service.hero.x=.5;s.service.hero.y=.76;
 tick(s,1);assert.equal(s.service.stations.WOK.left,9);
 s.service.hero.x=HERO_STATIONS.WOK.x;s.service.hero.y=HERO_STATIONS.WOK.y;
 tick(s,1);assert.equal(s.service.stations.WOK.left,8);
 assert.equal(s.service.hero.energy,6,'normal cooking is free');
 assert.equal(s.service.hero.assists,0);
});
test('helper operates assigned station alone, other station still requires hero',()=>{
 const s=initialize({helper:true});const a=targeted(s,'cooking');
 const b={...a,id:'second',recipeId:'chicken_stew',tableId:1,seatId:0,craft:recipeCraftSnapshot(s,'chicken_stew')};
 s.service.orders.push(b);s.service.crew.helper.station=0;
 s.service.stations.WOK={orderId:a.id,left:6,quality:81};
 s.service.stations.POT={orderId:b.id,left:6,quality:81};
 s.service.hero.x=.5;s.service.hero.y=.76;
 tick(s,1);
 assert.equal(s.service.stations.WOK.left,5);
 assert.equal(s.service.stations.POT.left,6);
});
test('hero pickup is not a sale, delivery lands once through original real transaction',()=>{
 const s=initialize();const o=targeted(s);const initial=s.coins;
 s.service.hero.x=HERO_PASS.x;s.service.hero.y=HERO_PASS.y;
 for(let i=0;i<9;i++)advanceWalkableInteraction(s,.05);
 tick(s,1);
 assert.equal(o.status,'carried');assert.equal(s.service.hero.carryOrderId,o.id);
 assert.equal(s.coins,initial);
 s.service.hero.x=HERO_TABLES[0].x;s.service.hero.y=HERO_TABLES[0].y;
 for(let i=0;i<11;i++)advanceWalkableInteraction(s,.05);
 tick(s,1);
 assert.equal(o.status,'flying');assert.equal(o.deliveryMode,'hero');
 assert.equal(s.service.hero.carryOrderId,null);
 assert.equal(s.coins,initial);
 tick(s,1);assert.equal(o.status,'eating');
 assert.equal(s.coins,initial+o.craft.price);
 tick(s,1);assert.equal(s.coins,initial+o.craft.price);
 assert.equal(s.ledger.filter(x=>x.id==='sale-'+o.id).length,1);
 assert.ok(s.service.events.some(e=>e.type==='hero_pickup'));
 assert.ok(s.service.events.some(e=>e.type==='delivered'&&e.by==='hero'));
 assert.ok(!s.service.events.some(e=>e.type==='throw'&&e.order===o.id),'no extra phantom flying plate');
});
test('waiter delivery follows table route and return; same dish cannot be picked by hero',()=>{
 const s=initialize({waiter:true});const o=targeted(s);
 s.service.hero.x=.5;s.service.hero.y=.32;
 tick(s,2);assert.equal(o.status,'delivering');
 const depart=waiterDeliveryPose(s,s.service.time);
 const mid=waiterDeliveryPose(s,s.service.time+1.5);
 assert.ok(Math.hypot(depart.x-mid.x,depart.y-mid.y)>.03);
 assert.equal(depart.plate,true);
 tick(s,3);assert.equal(o.status,'flying');assert.equal(o.deliveryMode,'waiter');
 const home=waiterDeliveryPose(s,s.service.time);
 const back=waiterDeliveryPose(s,s.service.time+1);
 assert.ok(Math.hypot(home.x-back.x,home.y-back.y)>.03);
 assert.equal(back.returning,true);
 tick(s,1);assert.equal(o.status,'eating');
 assert.equal(s.ledger.filter(e=>e.id==='sale-'+o.id).length,1);
});
test('explicit skill is order-specific and cannot fire during carry or lack of energy',()=>{
 const s=initialize();const o=targeted(s,'cooking');
 s.service.stations.WOK={orderId:o.id,left:7,quality:81};
 Object.assign(s.service.hero,HERO_STATIONS.WOK);
 assert.equal(walkableSpecial(s)?.kind,'burst');
 assert.equal(activateWalkableSpecial(s),true);
 assert.equal(s.service.hero.energy,4);assert.equal(s.service.stations.WOK.left,5);
 assert.equal(activateWalkableSpecial(s),false);
 assert.equal(s.service.hero.assists,1);
 const b={...o,id:'second',status:'carried'};s.service.orders.push(b);s.service.hero.carryOrderId='second';
 assert.equal(walkableSpecial(s),null);
});
test('normal old saved service never receives walkable stoppage or double delivery',()=>{
 const s=newGame();s.phase='service';createService(s);
 const o=s.service.orders[0];
 assert.equal(s.service.walkable,false);
 assert.equal(s.service.hero,null);
 const before=s.service.time;setServicePaused(s,false);tick(s,1);
 assert.equal(s.service.time,before+1);
 assert.ok(!s.service.events.some(e=>e.type==='hero_pickup'));
});
test('main H5 uses scene joystick, not enlarged chef/status words, with explicit skill tap',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/walkable_restaurant_v07.css',import.meta.url),'utf8');
 assert.match(app,/createService\(game,\{walkable:true\}\)/);
 assert.match(app,/walkServiceHero\(h,dx,dy,delta\)/);
 assert.match(app,/diner-stick/);
 assert.match(app,/activateWalkableSpecial\(game\)/);
 assert.match(html,/walkable_restaurant_v07\.css/);
 assert.match(css,/\.diner-float-stick/);
 const proc=spawnSync(process.execPath,['--check',new URL('../src/app.js',import.meta.url).pathname],{encoding:'utf8'});
 assert.equal(proc.status,0,proc.stderr);
});

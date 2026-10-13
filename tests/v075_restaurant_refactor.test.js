import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {DINER_FLOOR,dinerSpot,dinerBlocked,dinerWalk,dinerWaiterRoute} from '../src/restaurant_scene_v075.js';
import {newGame,createService,setServicePaused,advanceWalkableInteraction,tick,
 currentServiceEvent,chooseServiceEvent,resumeBreak,tableSeatState,recipeCraftSnapshot} from '../src/engine.js';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const app=read('../src/app.js'),scenes=read('../src/scenes_v04.js'),css=read('../src/restaurant_scene_v075.css');
const setup=()=>{
 const s=newGame();s.phase='service';
 assert.equal(createService(s,{walkable:true}),true);
 assert.equal(setServicePaused(s,false),true);
 return s;
};
const order=(s,status='pickup',tableId=0)=>{
 const o=s.service.orders[0];
 Object.assign(o,{recipeId:'chili_meat',craft:recipeCraftSnapshot(s,'chili_meat'),status,
    tableId,seatId:0,arrival:0,patience:90,pickupAt:s.service.time,fit:85,quality:84});
 s.service.orders=[o];s.service.queued=[];s.service.stations={WOK:null,POT:null};
 return o;
};
const dwell=(s,secs)=>{for(let t=0;t<secs;t+=.04)advanceWalkableInteraction(s,.04)};

test('package, main website, and in-game visible brand agree on current release v0.10.1',()=>{
 const pkg=JSON.parse(read('../package.json')),html=read('../index.html');
 assert.equal(pkg.version,'0.10.1');
 assert.match(html,/<title>怪味食堂 · Oddpot Kitchen v0\.10\.1<\/title>/);
 assert.match(app,/ODDPOT · v0\.10\.1/);
 assert.match(html,/restaurant_scene_v075\.css/);
});
test('canonical layout is the sole source of cooking and table service positions',()=>{
 for(const p of [DINER_FLOOR.left,DINER_FLOOR.right,DINER_FLOOR.pass,...DINER_FLOOR.tableWork]){
  assert.equal(dinerBlocked(p.x,p.y),false,'service spot must be actually reachable: '+JSON.stringify(p));
 }
 assert.equal(dinerSpot(DINER_FLOOR.left),'WOK');
 assert.equal(dinerSpot(DINER_FLOOR.right),'POT');
 assert.equal(dinerSpot(DINER_FLOOR.pass),'PASS');
 assert.equal(dinerSpot(DINER_FLOOR.tableWork[0]),'TABLE0');
 assert.equal(dinerSpot(DINER_FLOOR.tableWork[1]),'TABLE1');
 assert.equal(dinerBlocked(DINER_FLOOR.stoveLeft.x,DINER_FLOOR.stoveLeft.y),true);
 assert.equal(dinerBlocked(DINER_FLOOR.tables[0].x,DINER_FLOOR.tables[0].y),true);
});
test('player movement is smooth, frame-limited and collides with furniture without magnifying sprite',()=>{
 const h={x:.5,y:.365,moving:false,direction:'down'};
 assert.equal(dinerWalk(h,0,-1,.04),true);
 assert.ok(h.y>.345,'short frame displacement');
 for(let i=0;i<110;i++)dinerWalk(h,0,-1,.04);
 assert.ok(h.y>=DINER_FLOOR.margin.top);
 assert.match(scenes,/drawRestaurantV075/);
 assert.match(scenes,/pixelActor\(c,a\.kind,X,Y,DINER_ACTOR_SCALE/);
 assert.doesNotMatch(scenes,/pixelActor\(c,a\.kind,X,Y,1\.5/);
 assert.match(scenes,/if\(icon\)text\(c,icon,/);
});
test('new movable service screen never constructs legacy queue-priority or customer-select dock',()=>{
 const modern=app.slice(app.indexOf('function service(){'),app.indexOf('\nfunction report(){',app.indexOf('function service(){')));
 assert.doesNotMatch(modern,/priority:/);
 assert.doesNotMatch(modern,/clear-table/);
 assert.doesNotMatch(modern,/show-management/);
 assert.doesNotMatch(modern,/resume-break/);
 assert.match(modern,/v075-status/);
 assert.match(modern,/v075-event-shade/);
 assert.match(modern,/v075-finish/);
 assert.match(app,/const walk=game\.phase==='service'&&game\.service\?\.walkable/);
 assert.match(app,/walk\|\|home\?'':/,'no service dock and no separate forecast dock');
 assert.match(css,/\.v075-world:before\{display:none!important\}/);
});
test('event appears directly, action choice is once-only and resumes without extra button',()=>{
 const s=setup();
 s.service.time=19;tick(s,1);
 assert.equal(s.service.breakAt,1);
 const evt=currentServiceEvent(s);assert.ok(evt?.choices.length>=2);
 const option=evt.choices.find(x=>x.id==='steady')||evt.choices.find(x=>x.id==='soup')||evt.choices[0];
 const previous=s.coins;
 assert.equal(chooseServiceEvent(s,option.id),true);
 assert.equal(chooseServiceEvent(s,option.id),false);
 assert.equal(resumeBreak(s),true);
 assert.equal(s.service.breakAt,0);
 assert.equal(s.service.paused,false);
 assert.ok(s.coins<=previous);
 assert.match(app,/if\(game\.service\?\.walkable\)resumeBreak\(game\)/);
});
test('taking a finished plate and serving a matching table both need physical dwell',()=>{
 const s=setup(),o=order(s),coins=s.coins;
 Object.assign(s.service.hero,DINER_FLOOR.pass);
 dwell(s,.28);
 assert.equal(o.status,'pickup');
 assert.equal(s.service.hero.carryOrderId,null);
 dwell(s,.14);assert.equal(o.status,'carried');
 assert.equal(s.coins,coins);
 Object.assign(s.service.hero,DINER_FLOOR.tableWork[1]);
 dwell(s,.9);assert.equal(o.status,'carried','wrong table never receives this plate');
 Object.assign(s.service.hero,DINER_FLOOR.tableWork[0]);
 dwell(s,.40);assert.equal(o.status,'carried');
 dwell(s,.12);assert.equal(o.status,'flying');
 assert.equal(s.service.hero.carryOrderId,null);
 tick(s,1);assert.equal(o.status,'eating');assert.equal(s.coins,coins+o.craft.price);
 assert.equal(s.ledger.filter(x=>x.id==='sale-'+o.id).length,1);
});
test('tableSeatState never loses real seated diners while food is carried/delivered',()=>{
 const s=setup(),o=order(s);
 for(const st of ['queued','cooking','pickup','carried','delivering','flying','eating','review']){
  o.status=st;assert.equal(tableSeatState(s.service,0)[0]?.id,o.id,st);
 }
});
test('waiter delivery returns via continuous path and stays at the same natural scale',()=>{
 const s=setup();const o=order(s,'delivering',1);o.deliveryAt=4;s.service.time=4;
 const a=dinerWaiterRoute(s,4),b=dinerWaiterRoute(s,5),end=dinerWaiterRoute(s,7);
 assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>.02);
 assert.ok(Math.hypot(b.x-end.x,b.y-end.y)>.02);
 assert.equal(b.plate,true);assert.equal(end.table,1);
});
test('restaurant tick and walking are driven by one RAF time source, old interval skips new mode',()=>{
 assert.match(app,/if\(game\.phase==='service'&&game\.service&&!game\.service\.walkable/);
 assert.match(app,/v\.clockAccumulator=\(v\.clockAccumulator\|\|0\)\+delta/);
 assert.match(app,/advanceWalkableInteraction\(game,delta\)/);
 assert.match(app,/tick\(game,1\)/);
 assert.match(app,/document\.addEventListener\('visibilitychange'/);
});
test('all production JS files have valid ESM parse, mainline builds with its actual new modules',()=>{
 for(const path of ['../src/restaurant_scene_v075.js','../src/scenes_v04.js','../src/walkable_restaurant_v07.js','../src/app.js']){
  const loc=new URL(path,import.meta.url).pathname;
  const result=spawnSync(process.execPath,['--check',loc],{encoding:'utf8'});
  assert.equal(result.status,0,path+': '+result.stderr);
 }
});

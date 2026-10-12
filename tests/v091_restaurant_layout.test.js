import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 DINER_FLOOR,RESTAURANT_LORE,dinerFloor,dinerGuestRoute,dinerSeatPoint,
 dinerBlocked,dinerSpot,dinerWalk
} from '../src/restaurant_scene_v075.js';
import {placeRestaurantSpeech} from '../src/scenes_v04.js';
import {newGame} from '../src/engine.js';
import {DINER_VOICES} from '../src/diner_ambience_v077.js';

const near=(a,b,tol=.000001)=>Math.abs(a-b)<=tol;
test('two and three compact square tables keep unchanged original guest capacity and stable service targets',()=>{
 const s=newGame();
 const base=dinerFloor(s);
 assert.equal(base.tables.length,2);
 assert.equal(base.tableWork.length,2);
 assert.equal(base.geometry.tableHalfX<.09,true);
 assert.equal(base.geometry.tableHalfY<.05,true);
 s.dining.tableCount=3;
 const extended=dinerFloor(s);
 assert.equal(extended.tables.length,3);
 assert.deepEqual(extended.tables.slice(0,2),base.tables);
 assert.deepEqual(extended.tableWork.slice(0,2),base.tableWork);
 assert.ok(extended.tables[2].y<extended.tables[0].y,'third table is behind existing two rather than packed near the door');
 for(const [i,p] of extended.tables.entries()){
  assert.equal(dinerBlocked(p.x,p.y,s),true,'square tabletop is solid '+i);
  assert.equal(dinerBlocked(extended.tableWork[i].x,extended.tableWork[i].y,s),false,'real pickup target remains walkable');
  assert.equal(dinerSpot(extended.tableWork[i],s),'TABLE'+i);
  for(let seat=0;seat<2;seat++){
   const point=dinerSeatPoint(i,seat,s);
   assert.equal(dinerBlocked(point.x,point.y,s),false,'guest seat avoids the tabletop');
  }
 }
});
test('two smaller active stoves and silent middle expansion hearth preserve open service circulation',()=>{
 const s=newGame();
 for(const p of [DINER_FLOOR.stoveLeft,DINER_FLOOR.stoveRight,DINER_FLOOR.reservedStove])
  assert.equal(dinerBlocked(p.x,p.y,s),true,'stove occupies solid scenery');
 for(const [p,expected] of [[DINER_FLOOR.left,'WOK'],[DINER_FLOOR.right,'POT'],[DINER_FLOOR.pass,'PASS']]){
  assert.equal(dinerBlocked(p.x,p.y,s),false);
  assert.equal(dinerSpot(p,s),expected);
 }
 const hero={x:.5,y:.46,moving:false,direction:'down'};
 for(let i=0;i<15;i++)dinerWalk(hero,0,1,.04,s);
 assert.ok(hero.y>.5,'central aisle stays passable');
 assert.equal(RESTAURANT_LORE.reservedStation,'sealed-third-hearth');
});
test('all arrival routes use centre lane and keep real positions clear of the compact furniture at 320px',()=>{
 const s=newGame();s.dining.tableCount=3;
 for(let table=0;table<3;table++)for(let seat=0;seat<2;seat++){
  const route=dinerGuestRoute(table,seat,s);
  assert.equal(route.length,4);
  assert.ok(near(route[0].x,.5),'guests use entrance');
  assert.ok(near(route[1].x,.5),'guests use centre lane');
  for(let n=0;n<route.length-1;n++)for(let k=0;k<=20;k++){
   const f=k/20,p={x:route[n].x+(route[n+1].x-route[n].x)*f,
    y:route[n].y+(route[n+1].y-route[n].y)*f};
   assert.equal(dinerBlocked(p.x,p.y,s),false,'guest route avoids furniture '+table+'/'+seat+'/'+n);
  }
 }
});
test('three-room customer dialogue does not overlap on narrow screens',()=>{
 const s=newGame();s.dining.tableCount=3;
 const actors=s.dining.tableCount&&dinerFloor(s).tables.map((_,i)=>{
  const p=dinerSeatPoint(i,i===1?0:1,s);
  return {id:'guest'+i,x:p.x,y:p.y,order:{id:'guest'+i}};
 });
 const cues=actors.map((a,i)=>({id:a.id,text:['这味道足以穿透灵界。','小菌帽们真爱喝热汤。','我的矿车快出发了！'][i],kind:'review',priority:10,phase:.5}));
 const placed=placeRestaurantSpeech([cues[0],cues[1]],null,actors,320,530);
 assert.equal(placed.size,2);
 const boxes=[...placed.values()];
 const overlap=Math.max(0,Math.min(boxes[0].x+boxes[0].width,boxes[1].x+boxes[1].width)-Math.max(boxes[0].x,boxes[1].x))*
 Math.max(0,Math.min(boxes[0].y+boxes[0].height,boxes[1].y+boxes[1].height)-Math.max(boxes[0].y,boxes[1].y));
 assert.equal(overlap,0,'UI bubbles must not collide');
});
test('fantasy lore stays internal; visible interface does not print fictional area labels',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const scene=readFileSync(new URL('../src/scenes_v04.js',import.meta.url),'utf8');
 for(const name of ['咕噜门廊','热锅正厅','菌灯角落','喷火灶台','待启用怪火灶','咕噜小厅','怪味集市']){
  assert.equal(app.includes(name),false,name+' should not be UI copy');
  assert.equal(scene.includes(name),false,name+' should not be floating canvas labels');
 }
 for(const role of ['adventurer','family','regular','critic'])
  assert.deepEqual(Object.keys(DINER_VOICES[role]).sort(),
   ['order','choose','kitchen','ready','delivery','eat','hurry','furious','stockout','mismatch'].sort());
});

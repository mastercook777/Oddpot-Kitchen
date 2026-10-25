import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,travelPortal,hireCrew,createService,reassignIdleCooks,tick,setServicePaused,resumeBreak} from '../src/engine.js';
import {DINER_FLOOR} from '../src/restaurant_scene_v075.js';

const cloud=seed=>{
 const s=newGame(seed);s.chapterProgress.stars=3;s.phase='forecast';
 assert.equal(travelPortal(s,'cloud'),true);
 for(const id of ['sour_rice','cloud_rice_chicken','moss_soup'])s.recipes[id]=84;
 s.menu=['sour_rice','cloud_rice_chicken','moss_soup'];
 s.phase='service';assert.equal(createService(s,{walkable:true}),true);
 return s;
};
function potQueued(v){
 const o=v.orders[0];o.recipeId='cloud_rice_chicken';o.status='queued';o.orderedAt=0;o.arrival=0;o.patience=60;
 v.queued=[o.id];return o;
}
test('Cloud starter helper walks THREE simulated seconds to an uncovered second bench, never teleports',()=>{
 const s=cloud(6311),v=s.service;Object.assign(v.hero,DINER_FLOOR.left);
 const o=potQueued(v);assert.equal(v.crewDispatch,false,'starter must still be the genuine two-bench layout');
 reassignIdleCooks(v,s);
 assert.equal(v.crew.helper.moveFrom,0);assert.equal(v.crew.helper.moveTo,1);
 assert.equal(v.crew.helper.moveUntil,3);
 assert.equal(v.crew.helper.currentStation,0,'the helper does not teleport at dispatch');
 assert.equal(v.events.filter(e=>e.type==='crew_move').length,1);
 v.time=2;reassignIdleCooks(v,s);assert.equal(v.crew.helper.currentStation,0);
 v.time=3;reassignIdleCooks(v,s);assert.equal(v.crew.helper.currentStation,1);
 assert.equal(v.events.filter(e=>e.type==='crew_arrived').length,1);
 assert.equal(v.crew.helper.moveUntil,0);
 // Once the assistant operates POT, no second fictional copy remains on WOK.
 assert.notEqual(v.crew.helper.currentStation,0);
 assert.equal(o.status,'queued');
});
test('a player already working the unattended bench is not displaced by needless AI support',()=>{
 const s=cloud(6312),v=s.service;Object.assign(v.hero,DINER_FLOOR.right);
 potQueued(v);
 reassignIdleCooks(v,s);
 assert.ok(!v.crew.helper.moveUntil);
 assert.equal(v.crew.helper.currentStation,0);
 assert.equal(v.events.filter(e=>e.type==='crew_move').length,0);
});
test('original Hearth two-bench shifts keep their authored no-automatic-assistance behavior',()=>{
 const s=newGame(6313);s.phase='prep';assert.equal(hireCrew(s,'helper'),true);
 s.phase='service';assert.equal(createService(s,{walkable:true}),true);
 const v=s.service;Object.assign(v.hero,DINER_FLOOR.left);
 const o=v.orders[0];o.status='queued';o.recipeId='chicken_stew';v.queued=[o.id];
 reassignIdleCooks(v,s);
 assert.ok(!v.crew.helper.moveUntil);
 assert.equal(v.events.filter(e=>e.type==='crew_move').length,0);
});
